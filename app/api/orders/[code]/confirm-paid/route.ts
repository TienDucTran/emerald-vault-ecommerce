// POST /api/orders/[code]/confirm-paid
// Customer báo "đã chuyển khoản" — chuyển order WAITING_PAYMENT → WAITING_CONFIRM.
// Body: { phone: string }
//
// Response 200: { ok: true, order: { status, paymentStatus } }
// Response 4xx: { ok: false, error }

// Auth (defense-in-depth):
//   - Nếu user đang login (Supabase session): verify order.customer_id === user.id → 403 nếu sai.
//   - Nếu guest: fallback check normalizePhone(inputPhone) === normalizePhone(order.customer_phone) → 404.
// Body: { phone?: string } — phone chỉ bắt buộc với guest.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone/normalize';

// Phone optional ở schema — guest sẽ được bắt riêng trong handler.
const Body = z.object({
  phone: z.string().min(8).max(20).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  const code = decodeURIComponent(params.code);

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
  const phone = parsed.data.phone?.trim() ?? '';

  const supabase = createAdminClient();
  const db = supabase as any;

  // 1. Tìm order (chưa verify ownership)
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, code, customer_phone, customer_id, status, payment_status, payment_method')
    .eq('code', code)
    .maybeSingle();
  if (orderErr) {
    return NextResponse.json({ ok: false, error: orderErr.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }

  // 2. Auth check — branch theo session
  const ssr = createClient();
  const { data: { user } } = await ssr.auth.getUser();

  if (user) {
    // Đã login: customer_id phải khớp user.id
    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN', message: 'Bạn không có quyền với đơn này.' },
        { status: 403 }
      );
    }
  } else {
    // Guest: fallback check phone
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: 'PHONE_REQUIRED', message: 'Thiếu số điện thoại xác minh.' },
        { status: 400 }
      );
    }
    if (normalizePhone(order.customer_phone) !== normalizePhone(phone)) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }
  }
  if (order.payment_method !== 'BANK_TRANSFER') {
    return NextResponse.json(
      { ok: false, error: 'NOT_BANK_TRANSFER', message: 'Đơn không dùng CK ngân hàng.' },
      { status: 400 }
    );
  }

  // 2. Check bank_transfers tồn tại + chưa admin_confirm
  const { data: bt, error: btErr } = await db
    .from('bank_transfers')
    .select('id, admin_confirmed_at, user_confirmed_at, qr_expires_at')
    .eq('order_id', order.id)
    .maybeSingle();
  if (btErr) {
    return NextResponse.json({ ok: false, error: btErr.message }, { status: 500 });
  }
  if (!bt) {
    return NextResponse.json(
      { ok: false, error: 'NO_BANK_TRANSFER', message: 'Không tìm thấy thông tin CK.' },
      { status: 404 }
    );
  }
  // MED #5: Chặn user submit "đã CK" sau khi QR hết hạn (>24h).
  // Phía client cũng disable button, nhưng server phải enforce để chống bypass.
  if (bt.qr_expires_at && new Date(bt.qr_expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'QR_EXPIRED',
        message: 'QR đã hết hạn, vui lòng liên hệ admin để được hỗ trợ.',
      },
      { status: 410 }
    );
  }
  if (bt.admin_confirmed_at) {
    return NextResponse.json(
      { ok: false, error: 'ALREADY_CONFIRMED', message: 'Đơn đã được admin xác nhận.' },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  // 3. Update bank_transfers.user_confirmed_at
  if (!bt.user_confirmed_at) {
    const { error: upErr } = await db
      .from('bank_transfers')
      .update({ user_confirmed_at: now })
      .eq('id', bt.id);
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }
  }

  // 4. Nếu order đang WAITING_PAYMENT → chuyển sang WAITING_CONFIRM
  let newStatus = order.status;
  let newPaymentStatus = order.payment_status;
  if (order.status === 'WAITING_PAYMENT') {
    // Transition sang "Chờ xác nhận CK" ở CẢ orders.status và payment_status
    // (đồng bộ 2 trạng thái để admin thấy đúng state).
    const { error: stErr } = await db
      .from('orders')
      .update({
        status: 'WAITING_CONFIRM',
        payment_status: 'AWAITING_CONFIRM',
      })
      .eq('id', order.id);
    if (stErr) {
      return NextResponse.json({ ok: false, error: stErr.message }, { status: 500 });
    }
    newStatus = 'WAITING_CONFIRM';
    newPaymentStatus = 'AWAITING_CONFIRM';
  }

  return NextResponse.json({
    ok: true,
    order: {
      status: newStatus,
      paymentStatus: newPaymentStatus,
    },
  });
}
