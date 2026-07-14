// POST /api/unlock-item
// Body: { lockId?: string, productId: string, clientId?: string }
// Response: 204 No Content
//
// Idempotent — release lock sớm (user xoá khỏi cart, hoặc user tự yêu cầu hủy).
// Match 1 trong 2 điều kiện:
//  - lockId thuộc về clientId (verify qua SELECT trước khi UPDATE)
//  - hoặc cùng productId + lock còn ACTIVE
//
// Cron job `release-expired-locks` (pg_cron) sẽ dọn các lock quá hạn sau 10'.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const Body = z.object({
  lockId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  clientId: z.string().min(8).optional(),
}).refine(
  (v) => !!v.lockId || !!v.productId,
  { message: 'lockId or productId required' }
);

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

  const { lockId, productId, clientId } = parsed.data;
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Tìm lock ACTIVE theo lockId (ưu tiên) hoặc productId
  let q = supabase
    .from('inventory_locks')
    .update({ status: 'RELEASED', released_at: now })
    .eq('status', 'ACTIVE');

  if (lockId) {
    q = q.eq('id', lockId);
  } else if (productId) {
    q = q.eq('product_id', productId);
    if (clientId) q = q.eq('client_id', clientId);
  }

  const { error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 204 — idempotent, không cần trả body
  return new NextResponse(null, { status: 204 });
}
