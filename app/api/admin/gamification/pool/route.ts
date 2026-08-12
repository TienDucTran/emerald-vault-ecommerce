/**
 * /api/admin/gamification/pool
 *
 * GET    — List all gift_pool items (joined products + rule_code). Admin only.
 *          Response 200: { ok: true, data: GiftPoolItem[] }
 *
 * POST   — Add a product to gift_pool for a rule.
 *          Body: { ruleId: string, productId: string, stock: number }
 *          - Marks product.is_gift = true (ẩn khỏi storefront)
 *          - stock = -1 nghĩa là unlimited
 *          Response 200: { ok: true }
 *          Response 409: { ok: false, error: 'ALREADY_IN_POOL' } — product đã thuộc pool của rule này
 *
 * DELETE — Remove a gift_pool entry.
 *          Body: { poolId: string }
 *          - Restore product.is_gift = false NẾU product không còn thuộc gift_pool nào khác
 *          Response 200: { ok: true }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAllGiftPoolAdmin,
  addGiftPoolItem,
  removeGiftPoolItem,
} from '@/lib/gamification/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const data = await getAllGiftPoolAdmin();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return authErrorResponse(err, 'admin/gamification/pool');
  }
}

const PostSchema = z.object({
  ruleId: z.string().uuid(),
  productId: z.string().uuid(),
  stock: z.number().int().min(-1),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { ruleId, productId, stock } = parsed.data;

    // Prevent duplicate (same product + same rule)
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('gift_pool')
      .select('id')
      .eq('rule_id', ruleId)
      .eq('product_id', productId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'ALREADY_IN_POOL', message: 'Sản phẩm đã có trong pool của rule này' },
        { status: 409 }
      );
    }

    const ok = await addGiftPoolItem(ruleId, productId, stock);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: 'INSERT_FAILED' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err, 'admin/gamification/pool');
  }
}

const DeleteSchema = z.object({ poolId: z.string().uuid() });

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { poolId } = parsed.data;

    // Lấy product_id trước khi xoá, để có thể restore is_gift=false nếu không còn pool nào tham chiếu
    const supabase = createAdminClient();
    const { data: poolRow } = await supabase
      .from('gift_pool')
      .select('product_id')
      .eq('id', poolId)
      .maybeSingle();

    const ok = await removeGiftPoolItem(poolId);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    // Restore is_gift=false nếu product không còn trong gift_pool nào
    if (poolRow?.product_id) {
      const { count } = await supabase
        .from('gift_pool')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', poolRow.product_id);
      if ((count ?? 0) === 0) {
        await supabase
          .from('products')
          .update({ is_gift: false })
          .eq('id', poolRow.product_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err, 'admin/gamification/pool');
  }
}