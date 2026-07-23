// POST /api/orders/[code]/customer-action
// Customer self-service: cancel order hoặc request refund.
//
// Action: 'cancel' — chỉ áp dụng cho status=WAITING_PAYMENT.
//   → set status=CANCELLED, payment_status=FAILED
//   → release inventory_locks (ACTIVE → RELEASED)
//   → restore products (RESERVED → AVAILABLE) via RPC
//   → set orders.customer_cancelled_at + customer_cancel_reason
//   → set bank_transfers.rejected_at + rejected_reason (nếu BANK_TRANSFER)
//
// Action: 'request_refund' — áp dụng cho status ∈ {WAITING_CONFIRM, CONFIRMED, SHIPPING, DONE}.
//   → set payment_status=REFUND_REQUESTED (status giữ nguyên)
//   → set orders.refund_requested_at + refund_reason
//   → admin xử lý thủ công (CK lại cho user), sau đó chuyển payment_status=REFUNDED.
//
// Auth: requireCustomer (user đã login, order.customer_id = user.id).
//       Guest share-link KHÔNG dùng được action này (cần login để có audit trail).
//
// Body: { action: 'cancel' | 'request_refund', reason?: string }
//
// Response 200: { ok: true, order: { status, paymentStatus } }
// Response 4xx: { ok: false, error, message }

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCustomer } from '@/lib/auth/require-customer';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderRow, OrderStatus, PaymentStatus } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({
  action: z.enum(['cancel', 'request_refund']),
  reason: z.string().max(500).optional(),
});

const REFUNDABLE_STATUSES: OrderStatus[] = [
  'WAITING_CONFIRM',
  'CONFIRMED',
  'SHIPPING',
  'DONE',
];

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  const code = decodeURIComponent(params.code);

  let authResult;
  try {
    authResult = await requireCustomer();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED', message: 'Cần đăng nhập để thực hiện.' },
      { status: 401 }
    );
  }
  const { user } = authResult;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_JSON' },
      { status: 400 }
    );
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { action, reason } = parsed.data;

  const supabase = createAdminClient();
  const db = supabase as any;

  // 1. Tìm order + verify ownership
  const { data: order, error: orderErr } = (await db
    .from('orders')
    .select(
      'id, code, customer_id, status, payment_status, payment_method, total_amount, refund_requested_at, customer_cancelled_at'
    )
    .eq('code', code)
    .maybeSingle()) as {
    data: Pick<
      OrderRow,
      | 'id'
      | 'code'
      | 'customer_id'
      | 'status'
      | 'payment_status'
      | 'payment_method'
      | 'total_amount'
      | 'refund_requested_at'
      | 'customer_cancelled_at'
    > | null;
    error: any;
  };

  if (orderErr) {
    return NextResponse.json(
      { ok: false, error: 'DB_ERROR', message: orderErr.message },
      { status: 500 }
    );
  }
  if (!order) {
    return NextResponse.json(
      { ok: false, error: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng.' },
      { status: 404 }
    );
  }
  if (order.customer_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: 'FORBIDDEN', message: 'Bạn không có quyền với đơn này.' },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();

  // ============================================================
  // ACTION: cancel
  // ============================================================
  if (action === 'cancel') {
    if (order.status !== 'WAITING_PAYMENT') {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_STATUS',
          message:
            order.status === 'WAITING_CONFIRM'
              ? 'Bạn đã báo "đã chuyển". Vui lòng dùng "Yêu cầu hoàn tiền" để được admin hỗ trợ.'
              : 'Chỉ có thể hủy đơn khi đang ở trạng thái "Chờ thanh toán".',
        },
        { status: 400 }
      );
    }

    // 2. Set order → CANCELLED + payment_status=FAILED
    const { data: updated, error: upErr } = (await db
      .from('orders')
      .update({
        status: 'CANCELLED',
        payment_status: 'FAILED',
        customer_cancelled_at: now,
        customer_cancel_reason: reason?.trim() || null,
        updated_at: now,
      })
      .eq('id', order.id)
      .select('id, status, payment_status')
      .single()) as { data: { id: string; status: OrderStatus; payment_status: PaymentStatus } | null; error: any };

    if (upErr || !updated) {
      console.error('[customer-action:cancel] order update error:', upErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Cập nhật đơn thất bại.' },
        { status: 500 }
      );
    }

    // 3. Release inventory_locks
    const { error: lockErr } = await supabase
      .from('inventory_locks')
      .update({ status: 'RELEASED', released_at: now })
      .eq('order_id', order.id)
      .eq('status', 'ACTIVE');
    if (lockErr) {
      console.error('[customer-action:cancel] release lock error:', lockErr);
      // Non-fatal — order đã cancel.
    }

    // 4. Restore products via RPC (RESERVED → AVAILABLE only, never touches SOLD_OUT)
    const { error: rpcErr } = await (supabase.rpc as any)(
      'release_product_reservation',
      { p_order_id: order.id }
    );
    if (rpcErr) {
      console.error('[customer-action:cancel] release_product_reservation error:', rpcErr.message);
      // Non-fatal.
    }

    // 5. Nếu BANK_TRANSFER → mark bank_transfers.rejected
    if (order.payment_method === 'BANK_TRANSFER') {
      const { error: btErr } = await db
        .from('bank_transfers')
        .update({
          rejected_at: now,
          rejected_reason: reason?.trim() || 'Cancelled by customer',
        })
        .eq('order_id', order.id);
      if (btErr) {
        console.error('[customer-action:cancel] bank_transfers reject error:', btErr);
      }
    }

    return NextResponse.json({
      ok: true,
      action: 'cancel',
      order: {
        status: updated.status,
        paymentStatus: updated.payment_status,
      },
    });
  }

  // ============================================================
  // ACTION: request_refund
  // ============================================================
  if (action === 'request_refund') {
    if (!REFUNDABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_STATUS',
          message:
            order.status === 'WAITING_PAYMENT'
              ? 'Đơn chưa thanh toán. Bạn có thể hủy đơn thay vì yêu cầu hoàn tiền.'
              : 'Đơn đã hủy hoặc hoàn tất — không thể yêu cầu hoàn tiền.',
        },
        { status: 400 }
      );
    }
    if (order.payment_status === 'REFUND_REQUESTED') {
      return NextResponse.json(
        {
          ok: false,
          error: 'ALREADY_REQUESTED',
          message: 'Bạn đã gửi yêu cầu hoàn tiền cho đơn này rồi. Admin sẽ xử lý trong ít giờ.',
        },
        { status: 409 }
      );
    }
    if (order.payment_status !== 'PAID' && order.payment_status !== 'AWAITING_CONFIRM') {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_PAYMENT_STATUS',
          message: 'Chỉ có thể yêu cầu hoàn tiền khi đơn đã thanh toán hoặc đang chờ xác nhận CK.',
        },
        { status: 400 }
      );
    }

    // 2. Set payment_status=REFUND_REQUESTED (status giữ nguyên)
    const { data: updated, error: upErr } = (await db
      .from('orders')
      .update({
        payment_status: 'REFUND_REQUESTED',
        refund_requested_at: now,
        refund_reason: reason?.trim() || null,
        updated_at: now,
      })
      .eq('id', order.id)
      .select('id, status, payment_status')
      .single()) as { data: { id: string; status: OrderStatus; payment_status: PaymentStatus } | null; error: any };

    if (upErr || !updated) {
      console.error('[customer-action:request_refund] order update error:', upErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Cập nhật đơn thất bại.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: 'request_refund',
      order: {
        status: updated.status,
        paymentStatus: updated.payment_status,
      },
    });
  }

  // Unreachable (zod đã validate action enum), nhưng TS cần.
  return NextResponse.json(
    { ok: false, error: 'INVALID_ACTION' },
    { status: 400 }
  );
}
