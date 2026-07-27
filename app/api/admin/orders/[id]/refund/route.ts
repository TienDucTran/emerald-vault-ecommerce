// POST /api/admin/orders/[id]/refund
//
// Admin xử lý refund request. Source of truth = bảng `order_refunds`.
// Cột `orders.payment_status` được mirror cuối mỗi action để giữ tương thích
// với admin filters / dashboard cũ.
//
// Action: 'approve'       — state PENDING  → APPROVED (lưu refund_amount + bank info)
// Action: 'reject'        — state PENDING  → REJECTED (terminal, customer có thể tạo refund mới)
// Action: 'mark_completed'— state APPROVED|FAILED → COMPLETED (cuối, set orders.payment_status=REFUNDED)
// Action: 'mark_failed'   — state APPROVED → FAILED (admin có thể retry bằng mark_completed)
//
// Auth: requireAdmin (đã có sẵn). Mọi action log admin_id + order_id + action name.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderRefundRow, OrderRefundState } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    refund_amount: z.number().positive().max(100_000_000),
    bank_account_name: z.string().min(1).max(200),
    bank_account_number: z.string().min(4).max(50),
    bank_name: z.string().min(1).max(200),
  }),
  z.object({
    action: z.literal('reject'),
    reason: z.string().min(10).max(500),
  }),
  z.object({
    action: z.literal('mark_completed'),
    bill_proof_url: z.string().url().max(2000),
  }),
  z.object({
    action: z.literal('mark_failed'),
    reason: z.string().min(1).max(500),
  }),
]);

type RefundUpdate = Partial<Omit<OrderRefundRow, 'id' | 'order_id' | 'created_at' | 'state' | 'customer_requested_at'>> & {
  state?: OrderRefundState;
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, adminClient } = await requireAdmin();
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id đơn hàng' },
        { status: 400 }
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Body không phải JSON' },
        { status: 400 }
      );
    }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const db = adminClient as any;

    // Lookup order để lấy code (cho log audit)
    const { data: order, error: orderErr } = (await db
      .from('orders')
      .select('id, code')
      .eq('id', orderId)
      .maybeSingle()) as { data: { id: string; code: string } | null; error: any };

    if (orderErr) {
      console.error('[api/admin/refund] order lookup error:', orderErr);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Không thể tải đơn hàng' },
        { status: 500 }
      );
    }
    if (!order) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    const adminId = user.id;
    const now = new Date().toISOString();
    const orderCode = order.code;

    // ============================================================
    // ACTION: approve
    // ============================================================
    if (data.action === 'approve') {
      console.log(`[api/admin/refund] admin=${adminId} action=approve order=${orderCode}`);

      // 1. Find ACTIVE refund (PENDING)
      const { data: refund, error: findErr } = (await db
        .from('order_refunds')
        .select('*')
        .eq('order_id', orderId)
        .eq('state', 'PENDING')
        .maybeSingle()) as { data: OrderRefundRow | null; error: any };

      if (findErr) {
        console.error('[api/admin/refund:approve] find error:', findErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Không thể tải yêu cầu hoàn tiền' },
          { status: 500 }
        );
      }
      if (!refund) {
        return NextResponse.json(
          {
            error: 'NO_PENDING_REFUND',
            message: 'Không tìm thấy yêu cầu hoàn tiền đang chờ cho đơn này',
          },
          { status: 404 }
        );
      }

      // 2. Update → APPROVED
      const update: RefundUpdate = {
        state: 'APPROVED',
        admin_id: adminId,
        admin_decision_at: now,
        refund_amount: data.refund_amount,
        bank_account_name: data.bank_account_name,
        bank_account_number: data.bank_account_number,
        bank_name: data.bank_name,
      };
      const { data: updated, error: upErr } = (await db
        .from('order_refunds')
        .update(update)
        .eq('id', refund.id)
        .select('*')
        .single()) as { data: OrderRefundRow | null; error: any };

      if (upErr || !updated) {
        console.error('[api/admin/refund:approve] update error:', upErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Duyệt hoàn tiền thất bại' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, refund: updated });
    }

    // ============================================================
    // ACTION: reject
    // ============================================================
    if (data.action === 'reject') {
      console.log(`[api/admin/refund] admin=${adminId} action=reject order=${orderCode}`);

      const { data: refund, error: findErr } = (await db
        .from('order_refunds')
        .select('id, state')
        .eq('order_id', orderId)
        .eq('state', 'PENDING')
        .maybeSingle()) as { data: { id: string; state: OrderRefundState } | null; error: any };

      if (findErr) {
        console.error('[api/admin/refund:reject] find error:', findErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Không thể tải yêu cầu hoàn tiền' },
          { status: 500 }
        );
      }
      if (!refund) {
        return NextResponse.json(
          {
            error: 'NO_PENDING_REFUND',
            message: 'Không có yêu cầu hoàn tiền PENDING để từ chối',
          },
          { status: 404 }
        );
      }

      const update: RefundUpdate = {
        state: 'REJECTED',
        admin_id: adminId,
        admin_decision_at: now,
        rejected_at: now,
        admin_decision_reason: data.reason.trim(),
      };
      const { error: upErr } = await db
        .from('order_refunds')
        .update(update)
        .eq('id', refund.id);

      if (upErr) {
        console.error('[api/admin/refund:reject] update error:', upErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Từ chối hoàn tiền thất bại' },
          { status: 500 }
        );
      }

// REJECTED là terminal → customer có thể tạo refund mới.
      //
      // Reset orders.payment_status='PAID' về trạng thái trước refund (admin từ
      // chối trả tiền → tiền vẫn ở shop = PAID). Cũng clear refund_requested_at +
      // refund_reason (legacy columns) để customer retry không bị nhầm.
      //
      // Nếu fail → KHÔNG rollback refund (admin đã chốt quyết định, refund row
      // vẫn REJECTED). Log + trả 500 để admin xử lý tay.
      const { error: orderUpErr } = (await db
        .from('orders')
        .update({
          payment_status: 'PAID',
          refund_requested_at: null,
          refund_reason: null,
          updated_at: now,
        })
        .eq('id', orderId)) as unknown as { error: any };

      if (orderUpErr) {
        console.error('[api/admin/refund:reject] order update error:', orderUpErr);
        return NextResponse.json(
          {
            error: 'DB_ERROR',
            message:
              'Đã từ chối yêu cầu hoàn tiền nhưng cập nhật trạng thái đơn thất bại. Vui lòng kiểm tra lại đơn.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // ============================================================
    // ACTION: mark_completed (APPROVED hoặc FAILED retry)
    // ============================================================
    if (data.action === 'mark_completed') {
      console.log(`[api/admin/refund] admin=${adminId} action=mark_completed order=${orderCode}`);

      const { data: refund, error: findErr } = (await db
        .from('order_refunds')
        .select('*')
        .eq('order_id', orderId)
        .in('state', ['APPROVED', 'FAILED'])
        .maybeSingle()) as { data: OrderRefundRow | null; error: any };

      if (findErr) {
        console.error('[api/admin/refund:mark_completed] find error:', findErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Không thể tải yêu cầu hoàn tiền' },
          { status: 500 }
        );
      }
      if (!refund) {
        return NextResponse.json(
          {
            error: 'INVALID_STATE',
            message: 'Chỉ có thể hoàn tất refund đang APPROVED hoặc FAILED (retry)',
          },
          { status: 400 }
        );
      }

      const update: RefundUpdate = {
        state: 'COMPLETED',
        admin_id: adminId,
        completed_at: now,
        bill_proof_url: data.bill_proof_url,
      };
      const { data: updated, error: upErr } = (await db
        .from('order_refunds')
        .update(update)
        .eq('id', refund.id)
        .select('*')
        .single()) as { data: OrderRefundRow | null; error: any };

      if (upErr || !updated) {
        console.error('[api/admin/refund:mark_completed] update error:', upErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Hoàn tất hoàn tiền thất bại' },
          { status: 500 }
        );
      }

      // Mirror sang orders.payment_status='REFUNDED' (legacy column).
      const { error: orderUpErr } = (await db
        .from('orders')
        .update({
          payment_status: 'REFUNDED',
          updated_at: now,
        })
        .eq('id', orderId)) as unknown as { error: any };

      if (orderUpErr) {
        console.error('[api/admin/refund:mark_completed] order update error:', orderUpErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Cập nhật trạng thái đơn thất bại' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, refund: updated });
    }

    // ============================================================
    // ACTION: mark_failed (APPROVED → FAILED, để admin retry)
    // ============================================================
    if (data.action === 'mark_failed') {
      console.log(`[api/admin/refund] admin=${adminId} action=mark_failed order=${orderCode}`);

      const { data: refund, error: findErr } = (await db
        .from('order_refunds')
        .select('id, state')
        .eq('order_id', orderId)
        .eq('state', 'APPROVED')
        .maybeSingle()) as { data: { id: string; state: OrderRefundState } | null; error: any };

      if (findErr) {
        console.error('[api/admin/refund:mark_failed] find error:', findErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Không thể tải yêu cầu hoàn tiền' },
          { status: 500 }
        );
      }
      if (!refund) {
        return NextResponse.json(
          {
            error: 'INVALID_STATE',
            message: 'Chỉ có thể đánh dấu FAILED khi refund đang APPROVED',
          },
          { status: 400 }
        );
      }

      const update: RefundUpdate = {
        state: 'FAILED',
        admin_id: adminId,
        failed_at: now,
        admin_decision_reason: data.reason.trim(),
      };
      const { error: upErr } = await db
        .from('order_refunds')
        .update(update)
        .eq('id', refund.id);

      if (upErr) {
        console.error('[api/admin/refund:mark_failed] update error:', upErr);
        return NextResponse.json(
          { error: 'DB_ERROR', message: 'Đánh dấu FAILED thất bại' },
          { status: 500 }
        );
      }

      // FAILED không thay đổi orders.payment_status (vẫn là REFUND_REQUESTED
      // cho tới khi COMPLETED). Admin retry = gọi lại mark_completed.
      return NextResponse.json({ ok: true });
    }

    // Unreachable (zod discriminated union)
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Action không hợp lệ' },
      { status: 400 }
    );
  } catch (err) {
    return authErrorResponse(err, 'api/admin/refund');
  }
}
