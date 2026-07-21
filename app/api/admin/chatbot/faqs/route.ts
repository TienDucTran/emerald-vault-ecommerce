/**
 * /api/admin/chatbot/faqs — CRUD chat_faqs
 * Auth: requireAdmin
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  keywords: z.array(z.string().max(50)).max(20).default([]),
  category: z.string().max(50).optional().nullable(),
  display_order: z.number().int().min(0).max(10000).default(0),
  is_published: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('chat_faqs')
      .select('id, question, answer, keywords, category, display_order, is_published, view_count, created_at, updated_at')
      .order('display_order', { ascending: true });
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
      .from('chat_faqs')
      .insert(parsed.data)
      .select('id')
      .single();
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
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
    const { error } = await supabase.from('chat_faqs').update(rest).eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
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
    const { error } = await supabase.from('chat_faqs').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}
