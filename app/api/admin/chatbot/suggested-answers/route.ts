/**
 * /api/admin/chatbot/suggested-answers — CRUD chat_suggested_answers
 * Auth: requireAdmin
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUGGESTED_CATEGORIES = [
  'shipping',
  'return',
  'warranty',
  'payment',
  'about',
  'contact',
  'care',
  'size',
  'general',
] as const;

const createSchema = z.object({
  category: z.enum(SUGGESTED_CATEGORIES),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  trigger_keywords: z.array(z.string().max(50)).max(50).default([]),
  priority: z.number().int().min(0).max(1000).default(0),
  is_published: z.boolean().default(false),
  source_question_cluster: z.string().max(2000).optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(SUGGESTED_CATEGORIES).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  trigger_keywords: z.array(z.string().max(50)).max(50).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  is_published: z.boolean().optional(),
  source_question_cluster: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('chat_suggested_answers')
      .select(
        'id, category, title, content, trigger_keywords, priority, is_published, source_question_cluster, created_at, updated_at',
      )
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'VALIDATION', message: parsed.error.message },
        { status: 400 },
      );
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('chat_suggested_answers')
      .insert(parsed.data)
      .select('id')
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data: { id: data.id } });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { ok: false, error: 'VALIDATION', message: 'Missing id' },
        { status: 400 },
      );
    }
    const { id, ...rest } = parsed.data;
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('chat_suggested_answers')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data: { id } });
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
      return NextResponse.json(
        { ok: false, error: 'VALIDATION', message: 'Missing id' },
        { status: 400 },
      );
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from('chat_suggested_answers').delete().eq('id', id);
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data: { id } });
  } catch (e) {
    return authErrorResponse(e);
  }
}
