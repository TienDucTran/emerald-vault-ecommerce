/**
 * /api/admin/chatbot/knowledge — CRUD chat_knowledge
 * Auth: requireAdmin
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateKnowledgeCache } from '@/lib/chatbot/cache-invalidation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CATEGORIES = [
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

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(CATEGORIES),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  keywords: z.array(z.string().max(50)).max(30).default([]),
  priority: z.number().int().min(0).max(1000).default(0),
  is_published: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? undefined;
    const q = searchParams.get('q') ?? undefined;
    const supabase = createAdminClient();
    let query = supabase
      .from('chat_knowledge')
      .select('id, category, title, content, keywords, priority, is_published, created_at, updated_at')
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false });
    if (category) query = query.eq('category', category);
    if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
    const { data, error } = await query;
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
      .from('chat_knowledge')
      .insert(parsed.data)
      .select('id')
      .single();
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    // Invalidate cache để chatbot thấy knowledge mới ngay
    invalidateKnowledgeCache();
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
      return NextResponse.json(
        { error: 'VALIDATION', message: 'Missing id' },
        { status: 400 }
      );
    }
    const { id, ...rest } = parsed.data;
    const supabase = createAdminClient();
    const { error } = await supabase.from('chat_knowledge').update(rest).eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    // Invalidate cache để chatbot thấy knowledge đã cập nhật
    invalidateKnowledgeCache();
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
    const { error } = await supabase.from('chat_knowledge').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    // Invalidate cache để chatbot không trả về knowledge đã xoá
    invalidateKnowledgeCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}
