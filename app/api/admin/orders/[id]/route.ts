import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { awardOrderPoints, reverseOrderPoints, restoreGiftPoolStockOnCancel } from '@/lib/gamification/queries';
import { getTrackingUrl, logTimelineEvent } from '@/lib/order/timeline';
import type {
  OrderItemRow,
  OrderRow,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORDER_STATUSES: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'SHIPPING',
  'DONE',
  'CANCELLED',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  WAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  WAITING_CONFIRM: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DONE'],
  DONE: [],
  CANCELLED: [],
};

const patchSchema = z
  .object({
    action: z.literal('confirm_bank_payment').optional(),
    status: z
      .enum(['NEW', 'CONFIRMED', 'SHIPPING', 'DONE', 'CANCELLED'])
      .optional(),
    payment_status: z
      .enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
      .optional(),
    // Shipping info — required khi status=SHIPPING
    carrier: z.string().max(100).optional(),
    trackingNumber: z.string().max(200).optional(),
    trackingUrl: z.string().max(2000).optional(),
    adminNote: z.string().max(500).optional(),
  })
  .refine(
    (v) =>
      v.action === 'confirm_bank_payment' ||
      v.status !== undefined ||
      v.payment_status !== undefined,
    { message: 'Không có trường nào để cập nhật' }
  );

export interface OrderDetailItem extends OrderItemRow {
  product: { id: string; slug: string } | null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id' },
        { status: 400 }
      );
    }
    const admin = createAdminClient();

    const { data: order, error: orderErr } = (await admin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()) as { data: OrderRow | null; error: any };

    if (orderErr || !order) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    const { data: itemsRaw, error: itemsErr } = await admin
      .from('order_items')
      .select('id, order_id, product_id, price, snapshot_title, snapshot_image, snapshot_material, is_gift, gift_rule_code, product:products!order_items_product_id_fkey(id, slug)')
      .eq('order_id', id);

    if (itemsErr) {
      console.error('[admin/orders/:id] items error:', itemsErr);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Không thể tải sản phẩm' },
        { status: 500 }
      );
    }

    const items: OrderDetailItem[] = ((itemsRaw ?? []) as any[]).map((row: any) => {
      const r = row as any;
      return {
        id: r.id,
        order_id: r.order_id,
        product_id: r.product_id,
        price: r.price,
        snapshot_title: r.snapshot_title,
        snapshot_image: r.snapshot_image,
        snapshot_material: r.snapshot_material,
        is_gift: r.is_gift ?? false,
        gift_rule_code: r.gift_rule_code ?? null,
        product: r.product ?? null,
      };
    });

    return NextResponse.json({ order, items });
  } catch (err) {
    return authErrorResponse(err, 'admin/orders/:id');
  }
}

async function handleConfirmBankPayment(
  orderId: string,
  adminNote?: string
): Promise<NextResponse> {
  const admin = createAdminClient();
  const db = admin as any;

  const { data: order, error: orderErr } = (await admin
    .from('orders')
    .select('id, status, payment_method, payment_status')
    .eq('id', orderId)
    .single()) as {
    data: {
      id: string;
      status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    } | null;
    error: any;
  };

  if (orderErr || !order) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' },
      { status: 404 }
    );
  }
  if (order.payment_method !== 'BANK_TRANSFER') {
    return NextResponse.json(
      { error: 'NOT_BANK_TRANSFER', message: 'Đơn không dùng chuyển khoản ngân hàng' },
      { status: 400 }
    );
  }

  const { data: bt, error: btErr } = await db
    .from('bank_transfers')
    .select('id, admin_confirmed_at')
    .eq('order_id', orderId)
    .maybeSingle();

  if (btErr) {
    return NextResponse.json(
      { error: 'DB_ERROR', message: 'Không thể tải thông tin CK' },
      { status: 500 }
    );
  }
  if (!bt) {
    return NextResponse.json(
      { error: 'NO_BANK_TRANSFER', message: 'Không tìm thấy thông tin chuyển khoản' },
      { status: 404 }
    );
  }
  if (bt.admin_confirmed_at) {
    return NextResponse.json(
      { error: 'ALREADY_CONFIRMED', message: 'Đơn đã được admin xác nhận trước đó' },
      { status: 409 }
    );
  }

  const nowIso = new Date().toISOString();
  const { data: bankTransfer, error: btUpErr } = await db
    .from('bank_transfers')
    .update({
      admin_confirmed_at: nowIso,
      admin_note: adminNote?.trim() || null,
    })
    .eq('id', bt.id)
    .select('*')
    .single();

  if (btUpErr || !bankTransfer) {
    console.error('[admin/orders/:id] bank_transfers update error:', btUpErr);
    return NextResponse.json(
      { error: 'DB_ERROR', message: 'Cập nhật bank_transfer thất bại' },
      { status: 500 }
    );
  }

  const { data: updatedOrder, error: orderUpErr } = (await admin
    .from('orders')
    .update({
      status: 'CONFIRMED',
      payment_status: 'PAID',
      updated_at: nowIso,
    })
    .eq('id', orderId)
    .select('*')
    .single()) as { data: OrderRow | null; error: any };

  if (orderUpErr || !updatedOrder) {
    console.error('[admin/orders/:id] order confirm error:', orderUpErr);
    return NextResponse.json(
      { error: 'DB_ERROR', message: 'Cập nhật đơn thất bại' },
      { status: 500 }
    );
  }

  const { error: lockUpErr } = await admin
    .from('inventory_locks')
    .update({ status: 'CONVERTED' })
    .eq('order_id', orderId)
    .eq('status', 'ACTIVE');

  if (lockUpErr) {
    console.error('[admin/orders/:id] inventory_locks convert error:', lockUpErr);
  }

  const { error: prodUpErr } = await (admin.rpc as any)(
    'mark_products_sold_out',
    { p_order_id: orderId }
  );
  if (prodUpErr) {
    console.error('[admin/orders/:id] mark_products_sold_out failed:', prodUpErr.message);
  }

  return NextResponse.json({ order: updatedOrder, bankTransfer });
}

/**
 * Tạo order_refunds row (PENDING) nếu chưa có active refund.
 */
async function autoCreateRefund(
  db: any,
  orderId: string,
  reason: string,
  nowIso: string
): Promise<void> {
  const { data: activeRefund } = await db
    .from('order_refunds')
    .select('id, state')
    .eq('order_id', orderId)
    .in('state', ['PENDING', 'APPROVED'])
    .maybeSingle();

  if (activeRefund) {
    console.log('[admin/orders/:id PATCH] refund already active, skip');
    return;
  }

  const { error: refundErr } = await db
    .from('order_refunds')
    .insert({
      order_id: orderId,
      state: 'PENDING',
      customer_reason: reason,
      customer_requested_at: nowIso,
    });
  if (refundErr) {
    console.error(
      '[admin/orders/:id PATCH] auto-create refund failed:',
      refundErr.message
    );
    return;
  }
  console.log('[admin/orders/:id PATCH] refund created PENDING for', orderId);

  // Mirror sang orders.payment_status = REFUND_REQUESTED (legacy)
  const { error: psErr } = await db
    .from('orders')
    .update({
      payment_status: 'REFUND_REQUESTED',
      refund_requested_at: nowIso,
      refund_reason: reason,
      updated_at: nowIso,
    })
    .eq('id', orderId);
  if (psErr) {
    console.error('[admin/orders/:id PATCH] payment_status mirror failed:', psErr);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id' },
        { status: 400 }
      );
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Body không phải JSON' },
        { status: 400 }
      );
    }
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    const { status, payment_status, action, adminNote, carrier, trackingNumber, trackingUrl } = parsed.data;

    if (action === 'confirm_bank_payment') {
      return await handleConfirmBankPayment(id, adminNote);
    }

    if (!status && !payment_status) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Không có trường nào để cập nhật' },
        { status: 400 }
      );
    }
    if (status && !ORDER_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }
    if (payment_status && !PAYMENT_STATUSES.includes(payment_status)) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'payment_status không hợp lệ' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const db = admin as any;
    const { data: current, error: curErr } = (await admin
      .from('orders')
      .select('id, status, payment_status, payment_method')
      .eq('id', id)
      .single()) as {
      data: {
        id: string;
        status: OrderStatus;
        payment_status: PaymentStatus;
        payment_method: PaymentMethod;
      } | null;
      error: any;
    };

    if (curErr || !current) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    if (status && status !== current.status) {
      const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          {
            error: 'INVALID_TRANSITION',
            message: `Không thể chuyển ${current.status} → ${status}`,
          },
          { status: 400 }
        );
      }
    }

    const update: Partial<OrderRow> = {};
    if (status) update.status = status;
    if (payment_status) update.payment_status = payment_status;
    update.updated_at = new Date().toISOString();

    const { data: order, error: upErr } = (await admin
      .from('orders')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()) as { data: OrderRow | null; error: any };

    if (upErr || !order) {
      console.error('[admin/orders/:id] update error:', upErr);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Cập nhật thất bại' },
        { status: 500 }
      );
    }

    // ============================================================
    // SHIPPING INFO: lưu carrier + tracking khi chuyển sang SHIPPING
    // + log timeline events (SHIPPED, DELIVERED, CANCELLED)
    // ============================================================
    const nowIso = new Date().toISOString();

    if (status === 'SHIPPING' && current.status !== 'SHIPPING') {
      // Validate carrier + trackingNumber required khi shipping
      if (!carrier || !trackingNumber) {
        return NextResponse.json(
          {
            error: 'BAD_REQUEST',
            message: 'Vui lòng nhập đơn vị vận chuyển và mã vận đơn',
          },
          { status: 400 }
        );
      }

      // Auto-generate tracking_url nếu admin không nhập
      const finalTrackingUrl = getTrackingUrl(carrier, trackingNumber, trackingUrl);

      await db
        .from('orders')
        .update({
          carrier,
          tracking_number: trackingNumber,
          tracking_url: finalTrackingUrl,
          shipped_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', id);

      // Log timeline
      await logTimelineEvent(
        db,
        id,
        'SHIPPED',
        `Đơn vị: ${carrier} — Mã vận đơn: ${trackingNumber}`,
        'admin',
        { carrier, tracking_number: trackingNumber, tracking_url: finalTrackingUrl }
      );
    }

    if (status === 'DONE' && current.status !== 'DONE') {
      // Set delivered_at
      await db
        .from('orders')
        .update({ delivered_at: nowIso, updated_at: nowIso })
        .eq('id', id);

      // Log timeline
      await logTimelineEvent(db, id, 'DELIVERED', 'Đơn hàng đã giao thành công', 'admin');
    }

    if (status === 'CANCELLED' && current.status !== 'CANCELLED') {
      // Log timeline
      await logTimelineEvent(
        db,
        id,
        'CANCELLED',
        adminNote || 'Đơn hàng bị hủy',
        'admin'
      );
    }

    // ============================================================
    // LOYALTY POINTS: award khi DONE, reverse khi CANCELLED
    // ============================================================
    // Chỉ award khi chuyển sang DONE (chưa award trước đó — idempotent)
    if (status === 'DONE' && current.status !== 'DONE') {
      try {
        await awardOrderPoints(id);
      } catch (err) {
        console.error('[admin/orders/:id PATCH] awardOrderPoints failed:', err);
      }
    }

    // ============================================================
    // CANCEL cleanup: restore products + auto-create refund
    // ============================================================
    // 4 payment_status cases:
    //   - PENDING / FAILED        → products RESERVED → release_product_reservation
    //   - AWAITING_CONFIRM         → products RESERVED → release_product_reservation + auto refund
    //   - REFUND_REQUESTED         → products có thể RESERVED hoặc SOLD_OUT → cả 2 + skip refund (đã có)
    //   - PAID                     → products SOLD_OUT → direct UPDATE + auto refund
    if (status === 'CANCELLED' && current.status !== 'CANCELLED') {
      // Reverse loyalty points (nếu đã award cho order này trước đó)
      try {
        await reverseOrderPoints(id, 'ORDER_CANCEL');
      } catch (err) {
        console.error('[admin/orders/:id PATCH] reverseOrderPoints failed:', err);
      }
      console.log('[admin/orders/:id PATCH] CANCEL triggered:', {
        orderId: id,
        currentStatus: current.status,
        currentPaymentStatus: current.payment_status,
        currentPaymentMethod: current.payment_method,
      });

      // 1. Release inventory_locks (luôn)
      const { error: lockRelErr } = await admin
        .from('inventory_locks')
        .update({
          status: 'RELEASED',
          released_at: nowIso,
        })
        .eq('order_id', id)
        .eq('status', 'ACTIVE');
      if (lockRelErr) {
        console.error('[admin/orders/:id] inventory_locks release error:', lockRelErr);
      }

      // 2. Restore products — tùy theo payment_status
      const ps = current.payment_status;

      if (
        ps === 'PENDING' ||
        ps === 'FAILED' ||
        ps === 'AWAITING_CONFIRM' ||
        ps === 'REFUND_REQUESTED'
      ) {
        // Products đang RESERVED (chưa SOLD_OUT) → release_product_reservation
        // RPC: RESERVED → AVAILABLE (safety: don't touch SOLD_OUT)
        const { error: relResErr } = await (admin.rpc as any)(
          'release_product_reservation',
          { p_order_id: id }
        );
        if (relResErr) {
          console.error(
            '[admin/orders/:id PATCH] release_product_reservation failed:',
            relResErr.message
          );
        }

        // Fallback: nếu RPC không tồn tại hoặc fail → direct UPDATE RESERVED→AVAILABLE
        // (defensive — không phụ thuộc migration 0009b)
        const { data: orderItems } = await db
          .from('order_items')
          .select('product_id')
          .eq('order_id', id);

        if (orderItems && orderItems.length > 0) {
          const productIds = orderItems.map((it: any) => it.product_id);
          const { error: restoreErr } = await db
            .from('products')
            .update({ status: 'AVAILABLE' })
            .in('id', productIds)
            .eq('status', 'RESERVED');
          if (restoreErr) {
            console.error(
              '[admin/orders/:id PATCH] fallback restore RESERVED→AVAILABLE failed:',
              restoreErr.message
            );
          }
        }

        // Set payment_status = FAILED cho PENDING (chưa CK)
        if (
          current.payment_method === 'BANK_TRANSFER' &&
          ps === 'PENDING'
        ) {
          const { error: psErr } = await db
            .from('orders')
            .update({ payment_status: 'FAILED', updated_at: nowIso })
            .eq('id', id);
          if (psErr) {
            console.error('[admin/orders/:id PATCH] payment_status update failed:', psErr);
          }
        }

        // AWAITING_CONFIRM: user đã báo CK → có thể đã CK thật → tạo refund
        if (ps === 'AWAITING_CONFIRM') {
          await autoCreateRefund(
            db,
            id,
            'Admin cancelled order — user reported payment, refund required',
            nowIso
          );
        }

        // REFUND_REQUESTED: đã có refund row → không cần tạo mới
      } else if (ps === 'PAID') {
        // Products đã SOLD_OUT → restore trực tiếp
        const { data: orderItems } = await db
          .from('order_items')
          .select('product_id')
          .eq('order_id', id);

        if (orderItems && orderItems.length > 0) {
          const productIds = orderItems.map((it: any) => it.product_id);
          const { error: restoreErr } = await db
            .from('products')
            .update({ status: 'AVAILABLE' })
            .in('id', productIds)
            .eq('status', 'SOLD_OUT');
          if (restoreErr) {
            console.error(
              '[admin/orders/:id PATCH] restore products SOLD_OUT→AVAILABLE failed:',
              restoreErr.message
            );
          } else {
            console.log(
              '[admin/orders/:id PATCH] restored SOLD_OUT→AVAILABLE for',
              orderItems.length,
              'products'
            );
          }
        }

        // Admin hủy đơn đã thanh toán → bắt buộc hoàn tiền
        await autoCreateRefund(
          db,
          id,
          'Admin cancelled paid order — refund required',
          nowIso
        );
      } else if (ps === 'REFUNDED') {
        // Đã refund xong → products đã AVAILABLE (restore từ refund flow khác)
        // Không cần làm gì thêm
        console.log('[admin/orders/:id PATCH] payment_status=REFUNDED, products should already be AVAILABLE');
      }

      // bank_transfers audit
      if (current.payment_method === 'BANK_TRANSFER') {
        const { data: bt } = await db
          .from('bank_transfers')
          .select('id')
          .eq('order_id', id)
          .maybeSingle();
        if (bt?.id) {
          const { error: btRejectErr } = await db
            .from('bank_transfers')
            .update({
              rejected_at: nowIso,
              rejected_reason: 'Cancelled by admin',
            })
            .eq('id', bt.id);
          if (btRejectErr) {
            console.error(
              '[admin/orders/:id PATCH] bank_transfers reject update failed:',
              btRejectErr
            );
          }
        }
      }

      // Restore gift_pool.stock cho gift items của đơn bị huỷ (chỉ stock != -1).
      // Helper tự query order_items.is_gift=true nên không phụ thuộc payment_status.
      await restoreGiftPoolStockOnCancel(id);
    }

    return NextResponse.json({ order });
  } catch (err) {
    return authErrorResponse(err, 'admin/orders/:id PATCH');
  }
}