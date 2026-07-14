// POST /api/lock-item
// Body: { productId: string, clientId: string }
// Response: 200 { ok: true, lockId, expiresAt } | 4xx { ok: false, error }
//
// Gọi RPC `lock_item` (Postgres function) — atomic, tránh race-condition.
// RPC trả về inventory_locks row → frontend dùng expiresAt cho countdown.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const Body = z.object({
  productId: z.string().uuid('productId must be UUID'),
  clientId: z.string().min(8, 'clientId invalid'),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { productId, clientId } = parsed.data;
  const supabase = createAdminClient();

  const { data, error } = await (supabase.rpc as any)('lock_item', {
    p_product_id: productId,
    p_client_id: clientId,
  });

  if (error) {
    // RPC raise exception: PRODUCT_NOT_FOUND / PRODUCT_SOLD_OUT / PRODUCT_LOCKED_BY_OTHER
    const msg = error.message || 'LOCK_FAILED';
    const code =
      msg.includes('PRODUCT_NOT_FOUND') ? 404
      : msg.includes('PRODUCT_SOLD_OUT') ? 410
      : msg.includes('PRODUCT_LOCKED_BY_OTHER') ? 409
      : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }

  // RPC trả về inventory_locks row
  const lock = Array.isArray(data) ? data[0] : data;
  if (!lock?.id || !lock?.expires_at) {
    return NextResponse.json({ ok: false, error: 'INVALID_LOCK_RESPONSE' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    lockId: lock.id,
    productId: lock.product_id,
    expiresAt: lock.expires_at,
  });
}
