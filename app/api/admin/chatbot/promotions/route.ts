/**
 * /api/admin/chatbot/promotions — CRUD chat_promotions
 * Auth: requireAdmin
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidatePromotionCache } from '@/lib/chatbot/cache-invalidation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  code: z.string().max(50).optional().nullable(),
  discount_type: z.enum(['percent', 'fixed', 'shipping', 'gift']),
  discount_value: z.number().min(0).optional().nullable(),
  min_order_value: z.number().int().min(0).optional().nullable(),
  applicable_categories: z.array(z.string()).max(10).default([]),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('chat_promotions')
      .select('id, title, description, code, discount_type, discount_value, min_order_value, applicable_categories, valid_from, valid_until, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION', message: parsed.error.message },
        { status: 400 }
      );
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('chat_promotions')
      .insert(parsed.data)
      .select('id')
      .single();
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    // Invalidate cache để chatbot thấy promotion mới ngay
    invalidatePromotionCache();
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: 'VALIDATION', message: 'Missing id' }, { status: 400 });
    }
    const { id, ...rest } = parsed.data;
    const supabase = createAdminClient();
    const { error } = await supabase.from('chat_promotions').update(rest).eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    // Invalidate cache để chatbot thấy promotion đã cập nhật
    invalidatePromotionCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'VALIDATION', message: 'Missing id' }, { status: 400 });
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from('chat_promotions').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    // Invalidate cache để chatbot không trả về promotion đã xoá
    invalidatePromotionCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}
