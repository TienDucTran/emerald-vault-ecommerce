// POST /api/orders — tạo order mới
// Body:
//   {
//     items: [{ productId, price, title, image, material?, is_gift?, gift_rule_code? }],
//     customer: { name, phone, email?, address, province?, district?, notes? },
//     payment: 'MOMO' | 'COD' | 'BANK_TRANSFER',
//     clientId?: string
//   }
//
// Response 200: { ok: true, order: { id, code, status, paymentMethod, ... }, redirectUrl }
// Response 4xx: { ok: false, error }
//
// Logic:
//  1. Verify mỗi product tồn tại + AVAILABLE (gift products có thể là gift pool items)
//  2. (MOMO) Lock items qua RPC lock_item với clientId — chỉ lock PAID items, không lock gift items
//  3. Insert order + order_items (gift items có is_gift=true, price=0)
//  4. Insert order_gifts cho gift items (snapshot rule_code, title, image, voucher)
//  5. (COD) Set products SOLD_OUT + locks CONVERTED
//  6. (BANK_TRANSFER) Set status = WAITING_PAYMENT + tạo bank_transfers row + VietQR URL
//  7. (MOMO) Set locks = CONVERTED chỉ khi IPN confirm thành công

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
import {
  validateGiftItemsForOrder,
  decrementGiftPoolStock,
} from '@/lib/gamification/queries';
import { getSiteSettings } from '@/lib/supabase/queries/site-content';
import {
  detectShippingZone,
  checkFreeship,
  parseFreeshipConfig,
  parseInnerDistricts,
} from '@/lib/gamification/freeship';

const ItemSchema = z.object({
  productId: z.string().uuid(),
  price: z.number().int().min(0), // 0 cho gift items
  title: z.string().min(1).max(255),
  image: z
    .string()
    .min(1)
    .max(2000)
    .refine(
      (v) => /^(https?:\/\/|\/)/.test(v),
      'image phải là URL tuyệt đối hoặc path bắt đầu bằng /'
    ),
  material: z.enum(['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG']).optional(),
  lockId: z.string().uuid().nullable().optional(),
  checkoutStartedAt: z.number().int().nullable().optional(),
  // Gift item flags (BOGO rewards)
  is_gift: z.boolean().optional().default(false),
  gift_rule_code: z.string().optional(),
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

  // 0a. Auth check
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
            // No-op
          },
        },
      }
    );
    const { data: { user } } = await userScoped.auth.getUser();
    if (!user) {
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

  // 0. Bank config check
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
  const giftsDb = db.from('order_gifts');

  // Separate paid items and gift items
  const paidItems = items.filter((i: any) => !i.is_gift);
  const giftItems = items.filter((i: any) => i.is_gift);

  // 1b. Validate gift items server-side (anti-fraud):
  //     - rule phải active + ITEM_COUNT + cart đủ điều kiện
  //     - mỗi gift product thuộc gift_pool của rule
  //     - số gift <= gift_count, stock đủ
  let giftRuleVoucherAmount = 0;
  if (giftItems.length > 0) {
    const validation = await validateGiftItemsForOrder(
      giftItems.map((g: any) => ({
        productId: g.productId,
        gift_rule_code: g.gift_rule_code ?? null,
      })),
      paidItems.length // BOGO threshold = số paid items (match /api/gamification/check)
    );
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.error ?? 'GIFT_INVALID' },
        { status: 400 }
      );
    }
    giftRuleVoucherAmount = Number(validation.rule?.voucher_amount ?? 0);
  }

  // 1. Verify paid products còn AVAILABLE
  const paidProductIds = paidItems.map((i: any) => i.productId);
  if (paidProductIds.length > 0) {
    const { data: products, error: prodError } = await prodDb
      .select('id, status, title, image_url, price, material, slug')
      .in('id', paidProductIds);
    if (prodError) {
      return NextResponse.json({ ok: false, error: prodError.message }, { status: 500 });
    }
    if (!products || products.length !== paidProductIds.length) {
      return NextResponse.json({ ok: false, error: 'PRODUCT_NOT_FOUND' }, { status: 404 });
    }
    const soldOut = products.find((p: any) => p.status === 'SOLD_OUT');
    if (soldOut) {
      return NextResponse.json(
        { ok: false, error: 'PRODUCT_SOLD_OUT', productId: soldOut.id },
        { status: 410 }
      );
    }
    // Check RESERVED
    const reservedByOther = products.find((p: any) => p.status === 'RESERVED');
    if (reservedByOther) {
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
  }

  // 2. Lock paid items (không lock gift items)
  const locks: { productId: string; lockId: string | null }[] = [];
  const shouldLock = !!clientId && paidProductIds.length > 0;
  if (shouldLock) {
    for (const it of paidItems) {
      let lockIdToUse: string | null = null;

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

      if (!lockIdToUse) {
        const { data: lock, error: lockErr } = await db.rpc('lock_item', {
          p_product_id: it.productId,
          p_client_id: clientId,
        });
        if (lockErr) {
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

  // 2b. Tính phí vận chuyển động theo khu vực (match logic /api/gamification/check)
  //     Zone detect từ province/district → freeship check (item count hoặc value threshold) → ship_fee.
  //     Fail-safe: nếu không đọc được config thì shipping=0 (không block order).
  const paidItemsValue = paidItems.reduce((s: number, i: any) => s + i.price, 0);
  let shippingFee = 0;
  try {
    const settings = await getSiteSettings();
    const freeshipConfig = parseFreeshipConfig(settings);
    const innerDistricts = parseInnerDistricts(settings);
    const zone = detectShippingZone(
      customer.province ?? null,
      customer.district ?? null,
      innerDistricts
    );
    const freeshipCheck = checkFreeship(zone, paidItems.length, paidItemsValue, freeshipConfig);
    shippingFee = freeshipCheck.is_free ? 0 : freeshipCheck.ship_fee;
  } catch (shipErr) {
    console.error('[orders] shipping fee compute failed:', shipErr);
  }

  // 3. Tạo order
  const code = await generateOrderCode();
  // Total = paid items value + shipping fee (gift items price=0).
  // Convention: total_amount bao gồm shipping_fee (subtotal = total_amount - shipping_fee).
  const totalAmount = paidItemsValue + shippingFee;
  const orderStatus = payment === 'BANK_TRANSFER' ? 'WAITING_PAYMENT' : 'NEW';
  const { data: order, error: orderErr } = await ordersDb
    .insert({
      code,
      customer_id: currentUserId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email ?? null,
      customer_address: customer.address,
      province: customer.province ?? null,
      district: customer.district ?? null,
      ward: customer.ward ?? null,
      notes: customer.notes ?? null,
      total_amount: totalAmount,
      shipping_fee: shippingFee,
      payment_method: payment,
      payment_status: 'PENDING',
      status: orderStatus,
    })
    .select('id, code, status, payment_status, payment_method, total_amount')
    .single();
  if (orderErr || !order) {
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

  // 4. Tạo order_items — paid items + gift items
  const allOrderItems = [
    ...paidItems.map((it: any) => ({
      order_id: order.id,
      product_id: it.productId,
      price: it.price,
      snapshot_title: it.title,
      snapshot_image: it.image,
      snapshot_material: it.material ?? null,
      is_gift: false,
      gift_rule_code: null,
    })),
    ...giftItems.map((it: any) => ({
      order_id: order.id,
      product_id: it.productId,
      price: 0,
      snapshot_title: it.title,
      snapshot_image: it.image,
      snapshot_material: it.material ?? null,
      is_gift: true,
      gift_rule_code: it.gift_rule_code ?? null,
    })),
  ];

  const { error: itemsErr } = await itemsDb.insert(allOrderItems);
  if (itemsErr) {
    return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });
  }

  // 4b. Tạo order_gifts cho gift items (snapshot riêng để admin xem được)
  if (giftItems.length > 0) {
    const giftRows = giftItems.map((it: any) => ({
      order_id: order.id,
      product_id: it.productId,
      rule_code: it.gift_rule_code ?? 'BOGO',
      snapshot_title: it.title,
      snapshot_image: it.image,
      voucher_amount: giftRuleVoucherAmount,
    }));
    const { error: giftErr } = await giftsDb.insert(giftRows);
    if (giftErr) {
      console.error('[orders] order_gifts insert failed:', giftErr.message);
      // Non-fatal — order_items đã có is_gift, chỉ thiếu snapshot order_gifts
    }

    // 4c. Decrement gift_pool.stock (anti-oversell). Non-fatal — order đã tạo.
    //     stock=-1 (unlimited) thì bỏ qua trong helper.
    await decrementGiftPoolStock(
      giftItems.map((g: any) => ({
        productId: g.productId,
        gift_rule_code: g.gift_rule_code ?? null,
      }))
    );
  }

  // 5. Stamp locks.order_id = order.id
  if (locks.length > 0) {
    await locksDb
      .update({ order_id: order.id })
      .in('id', locks.map((l) => l.lockId));
  }

  // 5b. (MOMO / BANK_TRANSFER) Mark paid products as RESERVED
  if (payment === 'MOMO' || payment === 'BANK_TRANSFER') {
    if (paidProductIds.length > 0) {
      const { error: reserveErr } = await db.rpc('set_products_reserved', {
        p_order_id: order.id,
      });
      if (reserveErr) {
        console.error('[orders] set_products_reserved failed:', reserveErr.message);
        try {
          await cleanupFailedBankOrder({
            orderId: order.id,
            productIds: paidProductIds,
            locks,
            bankDb,
            ordersDb,
            locksDb,
            prodDb,
          });
        } catch (cleanupErr) {
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
  }

  // 6. (COD) Convert locks + set SOLD_OUT cho paid products
  if (payment === 'COD') {
    if (locks.length > 0) {
      await locksDb
        .update({ status: 'CONVERTED', order_id: order.id })
        .in('id', locks.map((l) => l.lockId));
    }
    if (paidProductIds.length > 0) {
      await prodDb
        .update({ status: 'SOLD_OUT' })
        .in('id', paidProductIds);
    }
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
      console.error('[orders] bank_transfers insert failed:', {
        code: btErr.code,
        message: btErr.message,
        details: btErr.details,
        hint: btErr.hint,
        orderId: order.id,
        orderCode: order.code,
      });

      if (btErr.code === '23505' || /unique/i.test(btErr.message)) {
        const { data: existingBt } = await bankDb
          .select('id, qr_expires_at')
          .eq('order_id', order.id)
          .maybeSingle();
        if (existingBt) {
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

      if (paidProductIds.length > 0) {
        const { error: prodErr } = await prodDb
          .update({ status: 'AVAILABLE' })
          .in('id', paidProductIds)
          .eq('status', 'RESERVED');
        if (prodErr) partialCleanupErrors.push(`products: ${prodErr.message}`);
      }

      if (partialCleanupErrors.length > 0) {
        console.error('[orders] partial cleanup errors:', partialCleanupErrors);
      }

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

  // 8. Compute redirectUrl
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

  const { error: btDelErr } = await bankDb.delete().eq('order_id', orderId);
  if (btDelErr) {
    console.error('[cleanup] bank_transfers delete failed:', btDelErr.message);
  }

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

  if (productIds.length > 0) {
    const { error: prodErr } = await prodDb
      .update({ status: 'AVAILABLE' })
      .in('id', productIds)
      .eq('status', 'RESERVED');
    if (prodErr) {
      console.error('[cleanup] products rollback failed:', prodErr.message);
    }
  }

  const { error: orderDelErr } = await ordersDb.delete().eq('id', orderId);
  if (orderDelErr) {
    console.error('[cleanup] orders delete failed:', orderDelErr.message);
  }
}