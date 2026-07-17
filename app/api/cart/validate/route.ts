// POST /api/cart/validate — Validate cart items' inventory_locks server-side
// Body:
//   { items: [{ productId: string, lockId: string | null }] }
//
// Response 200:
//   { ok: true, items: [{ productId, valid, expiresAt, reason }] }
//
// Dùng bởi cart page trước khi user vào checkout (hoặc khi reload checkout page)
// để biết lock nào còn hiệu lực, lock nào đã expired/missing → nhắc user re-lock.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Body = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        lockId: z.string().uuid().nullable(),
      })
    )
    .min(1)
    .max(20),
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
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

  const { items } = parsed.data;
  const supabase = createClient();
  const db = supabase as any;

  const results: {
    productId: string;
    valid: boolean;
    expiresAt: string | null;
    reason: string | null;
  }[] = [];
  const now = Date.now();

  for (const it of items) {
    if (!it.lockId) {
      results.push({
        productId: it.productId,
        valid: false,
        expiresAt: null,
        reason: 'NO_LOCK',
      });
      continue;
    }
    const { data, error } = await db
      .from('inventory_locks')
      .select('id, status, expires_at, order_id, product_id')
      .eq('id', it.lockId)
      .maybeSingle();
    if (error) {
      results.push({
        productId: it.productId,
        valid: false,
        expiresAt: null,
        reason: 'DB_ERROR',
      });
      continue;
    }
    if (!data) {
      results.push({
        productId: it.productId,
        valid: false,
        expiresAt: null,
        reason: 'LOCK_NOT_FOUND',
      });
      continue;
    }
    if (data.product_id !== it.productId) {
      results.push({
        productId: it.productId,
        valid: false,
        expiresAt: data.expires_at,
        reason: 'PRODUCT_MISMATCH',
      });
      continue;
    }
    if (data.status !== 'ACTIVE') {
      results.push({
        productId: it.productId,
        valid: false,
        expiresAt: data.expires_at,
        reason: `STATUS_${data.status}`,
      });
      continue;
    }
    if (new Date(data.expires_at).getTime() <= now) {
      results.push({
        productId: it.productId,
        valid: false,
        expiresAt: data.expires_at,
        reason: 'EXPIRED',
      });
      continue;
    }
    if (data.order_id !== null) {
      results.push({
        productId: it.productId,
        valid: false,
        expiresAt: data.expires_at,
        reason: 'ALREADY_ORDERED',
      });
      continue;
    }
    results.push({
      productId: it.productId,
      valid: true,
      expiresAt: data.expires_at,
      reason: null,
    });
  }

  return NextResponse.json({ ok: true, items: results });
}
