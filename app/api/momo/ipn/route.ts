// POST /api/momo/ipn — server-to-server webhook từ MoMo.
// 1. Verify signature (HMAC-SHA256 theo docs)
// 2. Idempotency: nếu payment_transactions.momo_request_id đã SUCCESS → return 204
// 3. resultCode === 0 → gọi RPC confirm_payment (set order PAID, product SOLD_OUT, locks CONVERTED)
//    update payment_transactions.status = 'SUCCESS'
// 4. resultCode !== 0 → update FAILED
// Trả 204 No Content cho mọi case (theo MoMo docs).

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyIpnSignature } from '@/lib/momo/client';

interface IpnBody {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number | string;
  orderInfo: string;
  orderType: string;
  transId: number | string;
  resultCode: number | string;
  message: string;
  payType: string;
  responseTime: number | string;
  extraData: string;
  signature: string;
}

function decodeExtraData(b64: string): { orderId?: string } {
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json) as { orderId?: string };
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  if (!accessKey || !secretKey) {
    return new NextResponse(null, { status: 204 });
  }

  let body: IpnBody;
  try {
    body = (await req.json()) as IpnBody;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  // 1. Verify signature
  const ok = verifyIpnSignature(
    { ...body, accessKey },
    accessKey,
    secretKey
  );
  if (!ok) {
    console.warn('[momo/ipn] invalid signature, orderId=', body.orderId);
    return new NextResponse(null, { status: 204 });
  }

  const supabase = createAdminClient();
  const db = supabase.from('payment_transactions') as any;
  const ordersDb = supabase.from('orders') as any;

  // 2. Idempotency: check payment_transactions theo momo_request_id
  const { data: existing } = await db
    .select('id, status')
    .eq('momo_request_id', body.requestId)
    .maybeSingle();

  if (existing && existing.status === 'SUCCESS') {
    return new NextResponse(null, { status: 204 });
  }

  // 3. Tìm order theo code (= momo_order_id)
  const { data: order } = await ordersDb
    .select('id, code, payment_status')
    .eq('code', body.orderId)
    .maybeSingle();

  if (!order) {
    console.warn('[momo/ipn] order not found:', body.orderId);
    return new NextResponse(null, { status: 204 });
  }

  const success = Number(body.resultCode) === 0;
  const ipnAt = new Date().toISOString();

  // 4. Update payment_transactions
  if (existing) {
    await db
      .update({
        status: success ? 'SUCCESS' : 'FAILED',
        result_code: Number(body.resultCode),
        message: body.message,
        momo_trans_id: Number(body.transId),
        ipn_received_at: ipnAt,
      })
      .eq('id', existing.id);
  }
  // (Nếu chưa có row: tạo — có thể do create endpoint bị miss. Insert best-effort.)
  else {
    await db.insert({
      order_id: order.id,
      momo_request_id: body.requestId,
      momo_order_id: body.orderId,
      momo_trans_id: Number(body.transId),
      amount: Number(body.amount),
      pay_type: body.payType,
      result_code: Number(body.resultCode),
      message: body.message,
      signature: body.signature,
      status: success ? 'SUCCESS' : 'FAILED',
      ipn_received_at: ipnAt,
    });
  }

  // 5. Nếu success → gọi RPC confirm_payment (atomic)
  if (success) {
    const { error: rpcErr } = await (supabase.rpc as any)('confirm_payment', {
      p_order_id: order.id,
      p_momo_trans_id: Number(body.transId),
    });
    if (rpcErr) {
      console.error('[momo/ipn] confirm_payment failed:', rpcErr.message);
    }
  } else {
    // Failure: chỉ update order.payment_status
    await ordersDb
      .update({ payment_status: 'FAILED', updated_at: ipnAt })
      .eq('id', order.id);
  }

  return new NextResponse(null, { status: 204 });
}