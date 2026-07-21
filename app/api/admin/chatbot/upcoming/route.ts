/**
 * /api/admin/chatbot/upcoming — CRUD upcoming_products + upcoming_collections
 * ?type=products | collections
 * Auth: requireAdmin
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const productSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional().nullable(),
  short_pitch: z.string().max(500).optional().nullable(),
  estimated_price: z.number().int().min(0).optional().nullable(),
  material: z
    .enum(['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG'])
    .optional()
    .nullable(),
  category: z.enum(['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY']).optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal('')),
  gallery: z.array(z.string().url()).max(20).default([]),
  expected_launch_date: z.string().optional().nullable(),
  notify_enabled: z.boolean().default(true),
  is_announced: z.boolean().default(true),
});

const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional().nullable(),
  theme: z.string().max(200).optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal('')),
  expected_launch_date: z.string().optional().nullable(),
  teaser_note: z.string().max(1000).optional().nullable(),
  is_announced: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'products';
    const supabase = createAdminClient();
    if (type === 'collections') {
      const { data, error } = await supabase
        .from('upcoming_collections')
        .select('id, name, slug, description, theme, cover_image_url, teaser_note, expected_launch_date, is_announced, created_at, updated_at')
        .order('expected_launch_date', { ascending: true });
      if (error) {
        return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
      }
      return NextResponse.json({ items: data ?? [] });
    }
    const { data, error } = await supabase
      .from('upcoming_products')
      .select('id, title, slug, short_pitch, description, estimated_price, material, category, cover_image_url, gallery, expected_launch_date, notify_enabled, is_announced, created_at, updated_at')
      .order('expected_launch_date', { ascending: true });
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
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'products';
    const body = await req.json();
    const schema = type === 'collections' ? collectionSchema : productSchema;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION', message: parsed.error.message },
        { status: 400 }
      );
    }
    const supabase = createAdminClient();
    const table = type === 'collections' ? 'upcoming_collections' : 'upcoming_products';
    const { data, error } = await supabase.from(table).insert(parsed.data).select('id').single();
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
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'products';
    const body = await req.json();
    const schema = type === 'collections' ? collectionSchema : productSchema;
    const parsed = schema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: 'VALIDATION', message: 'Missing id' }, { status: 400 });
    }
    const { id, ...rest } = parsed.data;
    const supabase = createAdminClient();
    const table = type === 'collections' ? 'upcoming_collections' : 'upcoming_products';
    const { error } = await supabase.from(table).update(rest).eq('id', id);
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
    const type = searchParams.get('type') ?? 'products';
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'VALIDATION', message: 'Missing id' }, { status: 400 });
    }
    const supabase = createAdminClient();
    const table = type === 'collections' ? 'upcoming_collections' : 'upcoming_products';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}
