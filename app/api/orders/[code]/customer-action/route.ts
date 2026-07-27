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
//   → INSERT row vào `order_refunds` (state='PENDING', customer_reason, customer_requested_at)
//   → đồng thời set orders.payment_status='REFUND_REQUESTED' + refund_requested_at + refund_reason
//     (giữ cột legacy cho admin filters / dashboard query)
//   → admin xử lý qua POST /api/admin/orders/[id]/refund.
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
    // NOTE: KHÔNG check order.payment_status === 'REFUND_REQUESTED' ở đây.
    //
    //   Trước đây có block này để chặn duplicate, nhưng nó ngăn cả trường hợp
    //   customer muốn GỬI YÊU CẦU MỚI sau khi admin REJECTED. Lý do:
    //
    //   - Admin action 'reject' đã reset orders.payment_status='PAID' (xem
    //     app/api/admin/orders/[id]/refund/route.ts action reject).
    //   - Nhưng vẫn có khả năng payment_status mirror lệch (admin reject qua
    //     đường khác, hoặc data cũ trước refactor). Check ở đây sẽ chặn nhầm.
    //
    //   Source of truth cho "đã có refund active hay chưa" là bảng `order_refunds`
    //   (query ngay dưới đây). Nếu không có row PENDING/APPROVED → cho phép
    //   customer tạo yêu cầu mới, dù payment_status mirror có giá trị nào.
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

    // 2. Check no ACTIVE refund row exists (PENDING hoặc APPROVED).
    //    Source of truth = bảng order_refunds (orders.payment_status legacy chỉ là mirror).
    const { data: activeRefund, error: actErr } = (await db
      .from('order_refunds')
      .select('id, state')
      .eq('order_id', order.id)
      .in('state', ['PENDING', 'APPROVED'])
      .maybeSingle()) as { data: { id: string; state: 'PENDING' | 'APPROVED' } | null; error: any };

    if (actErr) {
      console.error('[customer-action:request_refund] check active refund error:', actErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Không thể kiểm tra trạng thái hoàn tiền.' },
        { status: 500 }
      );
    }
    if (activeRefund) {
      return NextResponse.json(
        {
          ok: false,
          error: 'ALREADY_REQUESTED',
          message: 'Bạn đã có yêu cầu hoàn tiền đang được xử lý cho đơn này.',
        },
        { status: 409 }
      );
    }

    // 3. INSERT order_refunds (state=PENDING). Partial unique index sẽ chặn nếu
    //    đã có row PENDING/APPROVED (race condition guard).
    const customerReason = reason?.trim() || null;
    const { data: refundRow, error: insErr } = (await db
      .from('order_refunds')
      .insert({
        order_id: order.id,
        state: 'PENDING',
        customer_reason: customerReason,
        customer_requested_at: now,
      })
      .select('id, state')
      .single()) as { data: { id: string; state: 'PENDING' } | null; error: any };

    if (insErr || !refundRow) {
      // 23505 = unique_violation (partial unique index đã chặn 2nd insert)
      if (insErr?.code === '23505') {
        return NextResponse.json(
          {
            ok: false,
            error: 'ALREADY_REQUESTED',
            message: 'Bạn đã có yêu cầu hoàn tiền đang được xử lý cho đơn này.',
          },
          { status: 409 }
        );
      }
      console.error('[customer-action:request_refund] insert refund error:', insErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Không thể tạo yêu cầu hoàn tiền.' },
        { status: 500 }
      );
    }

    // 4. Mirror sang orders.payment_status (legacy) cho admin filters/dashboard.
    const { data: updated, error: upErr } = (await db
      .from('orders')
      .update({
        payment_status: 'REFUND_REQUESTED',
        refund_requested_at: now,
        refund_reason: customerReason,
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
      refund: { id: refundRow.id, state: refundRow.state },
    });
  }

  // Unreachable (zod đã validate action enum), nhưng TS cần.
  return NextResponse.json(
    { ok: false, error: 'INVALID_ACTION' },
    { status: 400 }
  );
}
