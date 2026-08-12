/**
 * GET /api/admin/gamification/rules
 *   Returns all gift rules (admin only).
 *   Response 200: { ok: true, data: GiftRule[] }
 *
 * PUT /api/admin/gamification/rules
 *   Update a gift rule (admin only). Bất kỳ trường nào trong set dưới đây.
 *   Body: { ruleId: string, is_active?, trigger_value?, gift_count?, voucher_amount? }
 *   Response 200: { ok: true }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateGiftRule } from '@/lib/gamification/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('gift_rules')
      .select('*')
      .order('trigger_value', { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (err) {
    return authErrorResponse(err, 'admin/gamification/rules');
  }
}

const UpdateSchema = z.object({
  ruleId: z.string().uuid(),
  is_active: z.boolean().optional(),
  trigger_value: z.number().int().min(0).optional(),
  gift_count: z.number().int().min(0).optional(),
  voucher_amount: z.number().int().min(0).optional(),
}).refine(
  (v) =>
    v.is_active !== undefined ||
    v.trigger_value !== undefined ||
    v.gift_count !== undefined ||
    v.voucher_amount !== undefined,
  { message: 'Không có trường nào để cập nhật' }
);

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ok = await updateGiftRule(parsed.data.ruleId, {
      is_active: parsed.data.is_active,
      trigger_value: parsed.data.trigger_value,
      gift_count: parsed.data.gift_count,
      voucher_amount: parsed.data.voucher_amount,
    });

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err, 'admin/gamification/rules');
  }
}