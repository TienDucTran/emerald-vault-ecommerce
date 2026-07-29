// POST /api/orders — tạo order mới
// Body:
//   {
//     items: [{ productId, price, title, image, material? }],
//     customer: { name, phone, email?, address, province?, district?, notes? },
//     payment: 'MOMO' | 'COD' | 'BANK_TRANSFER',
//     clientId?: string
//   }
//
// Response 200: { ok: true, order: { id, code, status, paymentMethod, ... }, redirectUrl }
// Response 4xx: { ok: false, error }
//
// Logic:
//  1. Verify mỗi product tồn tại + AVAILABLE
//  2. (MOMO) Lock items qua RPC lock_item với clientId
//  3. Insert order + order_items
//  4. (COD) Set products SOLD_OUT + locks CONVERTED
//  5. (BANK_TRANSFER) Set status = WAITING_PAYMENT + tạo bank_transfers row + VietQR URL
//  6. (MOMO) Set locks = CONVERTED chỉ khi IPN confirm thành công
//     → ở đây chỉ tạo order PENDING, status = NEW, payment = PENDING

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOrderCode } from '@/lib/supabase/queries/orders';
import { getBankConfig } from '@/lib/bank/config';
import { generateVietQRUrl, formatTransferContent } from '@/lib/bank/vietqr';
import { getBankByCode } from '@/lib/bank/types';
import { rateLimit } from '@/lib/middleware';

const ItemSchema = z.object({
  productId: z.string().uuid(),
  price: z.number().int().positive(),
  title: z.string().min(1).max(255),
  // image chỉ là snapshot lưu xuống order_items.snapshot_image để hiển thị
  // → accept cả absolute URL (https://...) và relative path (/images/...)
  image: z
    .string()
    .min(1)
    .max(2000)
    .refine(
      (v) => /^(https?:\/\/|\/)/.test(v),
      'image phải là URL tuyệt đối hoặc path bắt đầu bằng /'
    ),
  material: z.enum(['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG']).optional(),
  // Optional: lockId từ cart (do /api/lock-item cấp khi user Add to Cart)
  // checkoutStartedAt: timestamp (ms) khi user lần đầu vào checkout page cho sản phẩm này
  // → Nếu cả 2 có giá trị, server sẽ RE-USE lock hiện có thay vì gọi lại lock_item RPC
  //   (tránh PRODUCT_LOCKED_BY_OTHER nếu client khác grab trong lúc user đang điền form).
  lockId: z.string().uuid().nullable().optional(),
  checkoutStartedAt: z.number().int().nullable().optional(),
});

const CustomerSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional(),
  address: z.string().min(1),
  province: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  ward: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
});

const Body = z.object({
  items: z.array(ItemSchema).min(1).max(20),
  customer: CustomerSchema,
  payment: z.enum(['MOMO', 'COD', 'BANK_TRANSFER']),
  clientId: z.string().min(8).optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const limit = await rateLimit('orders', {
    identifier: ip,
    limit: 5,
    window: '1 m',
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED', retryAfter: limit.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfter ?? 60),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(limit.resetAt),
        },
      }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { items, customer, payment, clientId } = parsed.data;

  // 0a. (AUTH) Nếu user đang login → check role + lấy userId để set customer_id
  //
  // Lý do: order cần gắn với user_id để:
  //   - Customer xem lại đơn trong /tai-khoan/don-hang
  //   - RLS policy `orders_self_read` (auth.uid() = customer_id) hoạt động đúng
  //   - Guest checkout vẫn OK (customer_id = null, nhưng customer_email lưu để backfill sau)
  //
  // Chặn admin: tài khoản admin không được mua hàng (đơn sẽ bị "mồ côi"
  // vì admin không thể truy cập /tai-khoan/* — bị requireCustomer chặn).
  let currentUserId: string | null = null;
  try {
    const cookieStore = await cookies();
    const userScoped = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            // No-op: route handler không cần set cookie (chỉ đọc)
          },
        },
      }
    );
    const { data: { user } } = await userScoped.auth.getUser();
    if (!user) {
      // Option B: bắt buộc login — không cho guest checkout
      return NextResponse.json(
        {
          ok: false,
          error: 'NOT_AUTHENTICATED',
          message: 'Vui lòng đăng nhập để đặt hàng.',
        },
        { status: 401 }
      );
    }
    currentUserId = user.id;
    // Check role: nếu admin → 403
    const { data: profile } = (await createAdminClient()
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()) as { data: { role?: string } | null };
    if (profile?.role === 'admin') {
      return NextResponse.json(
        {
          ok: false,
          error: 'NOT_CUSTOMER',
          message: 'Tài khoản quản trị viên không thể đặt hàng. Vui lòng dùng tài khoản khách hàng.',
        },
        { status: 403 }
      );
    }
  } catch (authErr) {
    // Lỗi đọc session → fail closed (an toàn hơn fail open)
    console.error('[orders] auth check failed:', authErr);
    return NextResponse.json(
      {
        ok: false,
        error: 'NOT_AUTHENTICATED',
        message: 'Không thể xác thực phiên. Vui lòng đăng nhập lại.',
      },
      { status: 401 }
    );
  }

  // 0. (BANK_TRANSFER) Validate bank config TRƯỚC khi insert để fail fast.
  if (payment === 'BANK_TRANSFER') {
    const bankCfg = getBankConfig();
    if (!bankCfg.isConfigured) {
      return NextResponse.json(
        {
          ok: false,
          error: 'BANK_NOT_CONFIGURED',
          message: 'Ngân hàng chưa được cấu hình',
        },
        { status: 503 }
      );
    }
  }

  const supabase = createAdminClient();
  const db = supabase as any;
  const prodDb = db.from('products');
  const ordersDb = db.from('orders');
  const itemsDb = db.from('order_items');
  const locksDb = db.from('inventory_locks');
  const bankDb = db.from('bank_transfers');

  // 1. Verify products còn AVAILABLE
  const productIds = items.map((i: any) => i.productId);
  const { data: products, error: prodError } = await prodDb
    .select('id, status, title, image_url, price, material, slug')
    .in('id', productIds);
  if (prodError) {
    return NextResponse.json({ ok: false, error: prodError.message }, { status: 500 });
  }
  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ ok: false, error: 'PRODUCT_NOT_FOUND' }, { status: 404 });
  }
  const soldOut = products.find((p: any) => p.status === 'SOLD_OUT');
  if (soldOut) {
    return NextResponse.json(
      { ok: false, error: 'PRODUCT_SOLD_OUT', productId: soldOut.id },
      { status: 410 }
    );
  }

  // 1b. Detect RESERVED sớm (trước khi gọi lock_item) — phân biệt 2 case:
  //   - Product bị reserve bởi order WAITING_PAYMENT của CHÍNH user này:
  //     → trả OWN_PRODUCT_RESERVED kèm existingOrderCode để client nhắc user
  //       thanh toán / huỷ đơn cũ thay vì đặt mới (UX tốt hơn 500 + message chung).
  //   - Product bị reserve bởi user KHÁC:
  //     → trả PRODUCT_RESERVED (giữ nguyên, client hiển thị "có người khác đang giữ").
  //
  // Nếu KHÔNG check sớm → lock_item RPC throw PRODUCT_RESERVED (vì RESERVED
  // bị reject ở migration 0009b) → route trả 500 với error code thô → client
  // translate thành message chung "Món này đang được người khác thanh toán"
  // (sai nếu chính user giữ) → user confused.
  const reservedByOther = products.find((p: any) => p.status === 'RESERVED');
  if (reservedByOther) {
    // Query order WAITING_PAYMENT của CHÍNH user hiện tại đang giữ product này.
    // PostgREST nested filter: select orders với order_items!inner(product_id)
    // → inner join order_items rồi filter product_id trên đó.
    const { data: ownOrder } = await db
      .from('orders')
      .select('code, status, payment_method, order_items!inner(product_id)')
      .eq('customer_id', currentUserId)
      .eq('status', 'WAITING_PAYMENT')
      .eq('order_items.product_id', reservedByOther.id)
      .maybeSingle();

    if (ownOrder) {
      return NextResponse.json(
        {
          ok: false,
          error: 'OWN_PRODUCT_RESERVED',
          productId: reservedByOther.id,
          productTitle: reservedByOther.title,
          existingOrderCode: ownOrder.code,
          message:
            `Bạn đang có đơn WAITING_PAYMENT (${ownOrder.code}) cho sản phẩm "${reservedByOther.title}". ` +
            `Vui lòng thanh toán hoặc huỷ đơn cũ trước khi đặt lại.`,
        },
        { status: 409 }
      );
    }

    // Product RESERVED bởi user khác — giữ behavior cũ nhưng đổi status 409 thay vì 500.
    return NextResponse.json(
      {
        ok: false,
        error: 'PRODUCT_RESERVED',
        productId: reservedByOther.id,
        message: 'Sản phẩm đang được người khác giữ. Vui lòng thử lại sau ít phút.',
      },
      { status: 409 }
    );
  }

  // 2. Lock từng sản phẩm (atomic qua RPC lock_item)
  // - MOMO / BANK_TRANSFER: lock để giữ hold trong lúc chờ thanh toán async.
  // - COD: cũng lock tại submit-time để đảm bảo hold ngay trước khi tạo order
  //   (trước đó COD dựa vào cart-side lock — không đủ an toàn cho multi-item case).
  //
  // Nếu cart gửi kèm `lockId` + `checkoutStartedAt`, server RE-USE lock hiện có
  // (bỏ qua lock_item) nếu lock còn ACTIVE + chưa hết hạn + chưa gắn order.
  // Tránh được PRODUCT_LOCKED_BY_OTHER nếu client khác grab trong lúc user điền form.
  const locks: { productId: string; lockId: string | null }[] = [];
  const shouldLock = !!clientId; // Lock cho cả 3 payment method nếu có clientId
  if (shouldLock) {
    for (const it of items) {
      let lockIdToUse: string | null = null;

      // Thử re-use lock từ cart nếu client gửi kèm lockId + checkoutStartedAt
      if (it.lockId && it.checkoutStartedAt) {
        const { data: existing, error: existingErr } = await db
          .from('inventory_locks')
          .select('id, status, expires_at, client_id, order_id, product_id')
          .eq('id', it.lockId)
          .eq('client_id', clientId)
          .maybeSingle();

        if (
          !existingErr &&
          existing &&
          existing.status === 'ACTIVE' &&
          new Date(existing.expires_at).getTime() > Date.now() &&
          existing.order_id === null &&
          existing.product_id === it.productId
        ) {
          lockIdToUse = existing.id;
        }
      }

      // Nếu không re-use được → gọi lock_item (atomic, raise khi conflict)
      if (!lockIdToUse) {
        const { data: lock, error: lockErr } = await db.rpc('lock_item', {
          p_product_id: it.productId,
          p_client_id: clientId,
        });
        if (lockErr) {
          // Rollback locks đã tạo
          for (const l of locks) {
            await locksDb
              .update({ status: 'RELEASED', released_at: new Date().toISOString() })
              .eq('id', l.lockId);
          }
          return NextResponse.json(
            { ok: false, error: lockErr.message },
            { status: lockErr.message.includes('LOCKED_BY_OTHER') ? 409 : 500 }
          );
        }
        const lockRow = Array.isArray(lock) ? lock[0] : lock;
        lockIdToUse = lockRow.id;
      }

      locks.push({ productId: it.productId, lockId: lockIdToUse });
    }
  }

  // 3. Tạo order
  const code = await generateOrderCode();
  const totalAmount = items.reduce((s: number, i: any) => s + i.price, 0);
  const orderStatus = payment === 'BANK_TRANSFER' ? 'WAITING_PAYMENT' : 'NEW';
  const { data: order, error: orderErr } = await ordersDb
    .insert({
      code,
      customer_id: currentUserId, // NULL nếu guest checkout; UUID nếu customer login
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email ?? null,
      customer_address: customer.address,
      province: customer.province ?? null,
      district: customer.district ?? null,
      ward: customer.ward ?? null,
      notes: customer.notes ?? null,
      total_amount: totalAmount,
      shipping_fee: 0,
      payment_method: payment,
      payment_status: 'PENDING',
      status: orderStatus,
    })
    .select('id, code, status, payment_status, payment_method, total_amount')
    .single();
  if (orderErr || !order) {
    // Rollback locks
    for (const l of locks) {
      await locksDb
        .update({ status: 'RELEASED', released_at: new Date().toISOString() })
        .eq('id', l.lockId);
    }
    return NextResponse.json(
      { ok: false, error: orderErr?.message ?? 'ORDER_INSERT_FAILED' },
      { status: 500 }
    );
  }

  // 4. Tạo order_items
  const { error: itemsErr } = await itemsDb.insert(
    items.map((it: any) => ({
      order_id: order.id,
      product_id: it.productId,
      price: it.price,
      snapshot_title: it.title,
      snapshot_image: it.image,
      snapshot_material: it.material ?? null,
    }))
  );
  if (itemsErr) {
    return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });
  }

  // 5. Stamp locks.order_id = order.id (tất cả payment method đều lock)
  if (locks.length > 0) {
    await locksDb
      .update({ order_id: order.id })
      .in('id', locks.map((l) => l.lockId));
  }

  // 5b. (MOMO / BANK_TRANSFER) Mark products as RESERVED
  //     → prevents other users from buying during async payment
  // MED #15: set_products_reserved failure trước đây bị bỏ qua (chỉ console.error)
  //   → nếu RPC throw, sản phẩm vẫn AVAILABLE trong khi order đã tạo + lock tồn tại
  //   → user khác có thể checkout trùng sản phẩm. Cho BANK_TRANSFER đặc biệt
  //   nguy hiểm vì admin confirm sau 24h, lock có thể đã expire → race.
  //   Fix: fail fast + cleanup toàn bộ (order + bank_transfers + locks + products).
  if (payment === 'MOMO' || payment === 'BANK_TRANSFER') {
    const { error: reserveErr } = await db.rpc('set_products_reserved', {
      p_order_id: order.id,
    });
    if (reserveErr) {
      console.error('[orders] set_products_reserved failed:', reserveErr.message);
      // Cleanup: xóa order, release locks, đưa products về AVAILABLE.
      // Thứ tự: locks trước (tránh race), products, order cuối.
      // bank_transfers chưa tồn tại ở bước này (insert ở step 7).
      try {
        await cleanupFailedBankOrder({
          orderId: order.id,
          productIds,
          locks,
          bankDb,
          ordersDb,
          locksDb,
          prodDb,
        });
      } catch (cleanupErr) {
        // Cleanup hiếm khi throw (admin client bypass RLS), nhưng nếu xảy ra
        // KHÔNG được mask original error — chỉ log để admin manual fix sau.
        console.error('[orders] cleanupFailedBankOrder threw:', cleanupErr);
      }
      return NextResponse.json(
        {
          ok: false,
          error: 'RESERVE_FAILED',
          message:
            'Không thể giữ chỗ sản phẩm. Vui lòng thử lại hoặc liên hệ admin.',
        },
        { status: 500 }
      );
    }
  }

  // 6. (COD) Convert locks + set SOLD_OUT ngay
  if (payment === 'COD') {
    if (locks.length > 0) {
      await locksDb
        .update({ status: 'CONVERTED', order_id: order.id })
        .in('id', locks.map((l) => l.lockId));
    }
    await prodDb
      .update({ status: 'SOLD_OUT' })
      .in('id', productIds);
  }

  // 7. (BANK_TRANSFER) Tạo bank_transfers row + VietQR URL
  if (payment === 'BANK_TRANSFER') {
    const bankCfg = getBankConfig();
    const transferContent = formatTransferContent(order.code);
    const bankMeta = getBankByCode(bankCfg.bankCode);
    const qrImageUrl = generateVietQRUrl({
      bankCode: bankCfg.bankCode as any,
      accountNumber: bankCfg.accountNumber,
      accountName: bankCfg.accountName,
      amount: totalAmount,
      addInfo: transferContent,
      template: 'compact',
    });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: btErr } = await bankDb.insert({
      order_id: order.id,
      qr_image_url: qrImageUrl,
      bank_code: bankCfg.bankCode,
      bank_bin: bankMeta?.bin ?? null,
      account_number: bankCfg.accountNumber,
      account_name: bankCfg.accountName,
      amount: totalAmount,
      transfer_content: transferContent,
      qr_expires_at: expiresAt,
    });
    if (btErr) {
      // Defensive logging — ghi lại code + message để debug sau.
      // TRƯỚC ĐÂY route chỉ trả response 500 với btErr.message mà không log gì
      // → developer không biết được lý do thực sự (FK? NOT NULL? RLS? timeout?).
      console.error('[orders] bank_transfers insert failed:', {
        code: btErr.code,
        message: btErr.message,
        details: btErr.details,
        hint: btErr.hint,
        orderId: order.id,
        orderCode: order.code,
      });

      // MED #6: Duplicate order_id (constraint 0026) sẽ trả code 23505.
      //   Coi như idempotent success — trả order hiện có để client không retry.
      if (btErr.code === '23505' || /unique/i.test(btErr.message)) {
        const { data: existingBt } = await bankDb
          .select('id, qr_expires_at')
          .eq('order_id', order.id)
          .maybeSingle();
        if (existingBt) {
          // Order đã có bank_transfer từ trước → trả success với data hiện có.
          return NextResponse.json({
            ok: true,
            order: {
              id: order.id,
              code: order.code,
              status: order.status,
              paymentMethod: order.payment_method,
              paymentStatus: order.payment_status,
              totalAmount: order.total_amount,
            },
            redirectUrl: `/don-hang/${order.code}/thanh-toan`,
          });
        }
      }
      // KHÔNG xóa order ngay cả khi bank_transfers insert fail. Lý do:
      //   - Cleanup toàn bộ xóa luôn order → user mất data, phải đặt lại
      //   - Nếu chỉ fail ở step insert bank_transfers, order + locks + products
      //     đều OK → admin có thể manual insert bank_transfers row qua admin panel
      //   - Cron cleanup 0030 sẽ cancel order WAITING_PAYMENT BANK_TRANSFER > 24h
      //
      // Best-effort: chỉ release locks (nếu có) + revert product status.
      const partialCleanupErrors: string[] = [];

      if (locks.length > 0) {
        const lockIds = locks.map((l) => l.lockId).filter((x): x is string => !!x);
        if (lockIds.length > 0) {
          const { error: lockErr } = await locksDb
            .update({ status: 'RELEASED', released_at: new Date().toISOString() })
            .in('id', lockIds);
          if (lockErr) partialCleanupErrors.push(`locks: ${lockErr.message}`);
        }
      }

      if (productIds.length > 0) {
        const { error: prodErr } = await prodDb
          .update({ status: 'AVAILABLE' })
          .in('id', productIds)
          .eq('status', 'RESERVED');
        if (prodErr) partialCleanupErrors.push(`products: ${prodErr.message}`);
      }

      if (partialCleanupErrors.length > 0) {
        console.error('[orders] partial cleanup errors:', partialCleanupErrors);
      }

      // KHÔNG xóa order — admin sẽ thấy trong dashboard (status WAITING_PAYMENT,
      // payment_status PENDING, không có bank_transfers row) và xử lý manual.
      return NextResponse.json(
        {
          ok: false,
          error: 'BANK_TRANSFER_INIT_FAILED',
          message:
            'Không thể tạo mã QR thanh toán. Đơn hàng đã được ghi nhận — admin sẽ liên hệ với bạn trong ít phút để cung cấp thông tin chuyển khoản.',
          orderCode: order.code,
          partialCleanupErrors,
        },
        { status: 500 }
      );
    }
  }

  // 8. Compute redirectUrl cho client
  const redirectUrl =
    payment === 'MOMO'
      ? `/momo/return?orderCode=${order.code}`
      : payment === 'BANK_TRANSFER'
        ? `/don-hang/${order.code}/thanh-toan`
        : `/don-hang/${order.code}`;

  return NextResponse.json({
    ok: true,
    order: {
      id: order.id,
      code: order.code,
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      totalAmount: order.total_amount,
    },
    redirectUrl,
  });
}

// ----------------------------------------------------------------------------
// Helper: cleanupFailedBankOrder
// ----------------------------------------------------------------------------
// Dọn dẹp khi /api/orders POST fail giữa chừng (set_products_reserved throw,
// bank_transfers insert fail, ...) cho BANK_TRANSFER / MOMO flow.
//
// Thứ tự cleanup (an toàn cho race):
//   1. bank_transfers: xóa nếu đã insert (cascade cũng xóa nếu order bị xóa,
//      nhưng gọi tường minh để idempotent nếu chỉ cleanup partial).
//   2. inventory_locks: RELEASED để lock_item RPC có thể cấp lại ngay.
//   3. products: RESERVED → AVAILABLE (CHỈ touch RESERVED, không đụng SOLD_OUT
//      vì có thể product đã được finalize từ flow khác).
//   4. orders: xóa cuối cùng. CASCADE cũng xóa order_items.
//
// Best-effort: log lỗi từng bước nhưng KHÔNG throw — caller đã trả 500 cho user.
// ----------------------------------------------------------------------------
async function cleanupFailedBankOrder(args: {
  orderId: string;
  productIds: string[];
  locks: { productId: string; lockId: string | null }[];
  bankDb: any;
  ordersDb: any;
  locksDb: any;
  prodDb: any;
}): Promise<void> {
  const { orderId, productIds, locks, bankDb, ordersDb, locksDb, prodDb } = args;
  const nowIso = new Date().toISOString();

  // 1. bank_transfers (nếu có)
  const { error: btDelErr } = await bankDb.delete().eq('order_id', orderId);
  if (btDelErr) {
    console.error('[cleanup] bank_transfers delete failed:', btDelErr.message);
  }

  // 2. inventory_locks
  if (locks.length > 0) {
    const lockIds = locks.map((l) => l.lockId).filter((x): x is string => !!x);
    if (lockIds.length > 0) {
      const { error: lockErr } = await locksDb
        .update({ status: 'RELEASED', released_at: nowIso })
        .in('id', lockIds);
      if (lockErr) {
        console.error('[cleanup] inventory_locks release failed:', lockErr.message);
      }
    }
  }

  // 3. products RESERVED → AVAILABLE (chỉ touch RESERVED)
  if (productIds.length > 0) {
    const { error: prodErr } = await prodDb
      .update({ status: 'AVAILABLE' })
      .in('id', productIds)
      .eq('status', 'RESERVED');
    if (prodErr) {
      console.error('[cleanup] products rollback failed:', prodErr.message);
    }
  }

  // 4. orders (cascade xóa order_items)
  const { error: orderDelErr } = await ordersDb.delete().eq('id', orderId);
  if (orderDelErr) {
    console.error('[cleanup] orders delete failed:', orderDelErr.message);
  }
}
