// POST /api/momo/create
// Body: { orderCode: string }
// Response 200: { ok: true, payUrl, requestId, qrCodeUrl, deeplink }
// Response 4xx/5xx: { ok: false, error }
//
// Flow: lấy order từ DB → gọi MoMo createPayment → lưu payment_transactions row
// → trả payUrl cho client redirect.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMoMoPayment, isMoMoConfigured } from '@/lib/momo/client';
import { getOrderByCode } from '@/lib/supabase/queries/orders';

const Body = z.object({ orderCode: z.string().min(1) });

export async function POST(req: Request) {
  if (!isMoMoConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'MOMO_NOT_CONFIGURED' },
      { status: 503 }
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
    return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
  }
  const { orderCode } = parsed.data;

  const order = await getOrderByCode(orderCode);
  if (!order) {
    return NextResponse.json({ ok: false, error: 'ORDER_NOT_FOUND' }, { status: 404 });
  }
  if (order.payment_method !== 'MOMO') {
    return NextResponse.json(
      { ok: false, error: 'ORDER_NOT_MOMO' },
      { status: 400 }
    );
  }
  if (order.payment_status === 'PAID') {
    return NextResponse.json({ ok: false, error: 'ALREADY_PAID' }, { status: 409 });
  }

  const supabase = createAdminClient();
  const requestId = randomUUID();
  const redirectUrl =
    process.env.MOMO_REDIRECT_URL ?? `${process.env.NEXT_PUBLIC_SITE_URL}/momo/return`;
  const ipnUrl =
    process.env.MOMO_IPN_URL ?? `${process.env.NEXT_PUBLIC_SITE_URL}/api/momo/ipn`;
  const orderInfo = `Thanh toán đơn hàng ${order.code}`;

  let momoRes;
  try {
    momoRes = await createMoMoPayment({
      orderId: order.code,
      amount: order.total_amount,
      orderInfo,
      extraData: Buffer.from(JSON.stringify({ orderId: order.id })).toString('base64'),
      requestId,
      redirectUrl,
      ipnUrl,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'MOMO_REQUEST_FAILED' },
      { status: 502 }
    );
  }

  // Lưu payment_transactions (idempotent theo momo_request_id)
  const { error: txErr } = await supabase.from('payment_transactions').insert({
    order_id: order.id,
    momo_request_id: requestId,
    momo_order_id: order.code,
    amount: order.total_amount,
    status: momoRes.resultCode === 0 ? 'REDIRECTED' : 'FAILED',
    pay_type: 'webApp',
    result_code: momoRes.resultCode,
    message: momoRes.message,
  });
  if (txErr) {
    console.error('payment_transactions insert failed:', txErr.message);
    // Không fail request — vẫn trả payUrl để user thanh toán
  }

  if (momoRes.resultCode !== 0 || !momoRes.payUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: momoRes.message || 'MOMO_REJECTED',
        resultCode: momoRes.resultCode,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    payUrl: momoRes.payUrl,
    deeplink: momoRes.deeplink,
    qrCodeUrl: momoRes.qrCodeUrl,
    requestId,
  });
}
