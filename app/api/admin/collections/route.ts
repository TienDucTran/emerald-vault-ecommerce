// GET /api/admin/collections
//   Response 200: { ok: true, data: Array<{ id: string; name: string; slug: string }> }
//   Response 4xx: { ok: false, error }
//
// Lưu ý:
//   - Chỉ trả về collection đã published (is_published = true).
//   - Sắp xếp theo display_order ASC, sau đó created_at DESC.
//   - Dùng cho ProductForm select "Bộ sưu tập" (New + Edit).
//
// POST /api/admin/collections
//   Body: { name, slug?, description, cover_image_url, is_published, display_order,
//           launch_at?, story_text?, hero_gallery?, meta_title?, meta_description? }
//   - `slug` tự generate từ `name` nếu trống (slugify Vietnamese-safe).
//   - Validate unique slug (409 SLUG_EXISTS).
//   - Response 201: { ok: true, data: CollectionRow }
//   - Response 4xx : { ok: false, error, message? }

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';
import { slugify } from '@/lib/utils';
import type { CollectionRow } from '@/lib/supabase/types';
import { invalidateCollectionCache } from '@/lib/chatbot/cache-invalidation';

// requireAdmin() gọi cookies() → bắt buộc dynamic.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { adminClient } = await requireAdmin();

    const { data, error } = await adminClient
      .from('collections')
      .select('id, name, slug')
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'LIST_FAILED', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

const slugRegex = /^[a-z0-9-]+$/;
const createSchema = z.object({
  name: z.string().trim().min(1, 'Tên là bắt buộc').max(200),
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(slugRegex, 'Slug chỉ gồm chữ thường, số và dấu -')
    .optional()
    .or(z.literal('')),
  description: z.string().max(2000).optional().nullable(),
  cover_image_url: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  is_published: z.boolean().optional().default(false),
  display_order: z.number().int().min(0).optional().default(0),
  launch_at: z.string().max(50).optional().nullable().or(z.literal('')),
  story_text: z.string().max(20000).optional().nullable().or(z.literal('')),
  hero_gallery: z.array(z.string().url().max(2000)).max(20).optional().default([]),
  meta_title: z.string().max(200).optional().nullable().or(z.literal('')),
  meta_description: z.string().max(500).optional().nullable().or(z.literal('')),
});

type CreateInput = z.infer<typeof createSchema>;

function toNullIfEmpty(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function toIntOr(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim().length > 0) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        {
          ok: false,
          error: 'BAD_REQUEST',
          message: first ? `${first.path.join('.')}: ${first.message}` : 'Dữ liệu không hợp lệ',
        },
        { status: 400 }
      );
    }
    const input: CreateInput = parsed.data;

    // Auto-generate slug từ name nếu không truyền / trống
    const finalSlug = (input.slug && input.slug.trim().length > 0)
      ? input.slug.trim()
      : slugify(input.name);

    if (!slugRegex.test(finalSlug)) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', message: 'Slug không hợp lệ sau khi tự sinh' },
        { status: 400 }
      );
    }

    const { adminClient } = await requireAdmin();

    // Check unique slug
    const { data: existing, error: slugErr } = await adminClient
      .from('collections')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();
    if (slugErr) {
      console.error('[admin/collections POST] slug check error:', slugErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Không kiểm tra được slug' },
        { status: 500 }
      );
    }
    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'SLUG_EXISTS', message: 'Slug đã tồn tại' },
        { status: 409 }
      );
    }

    const insertRow = {
      name: input.name.trim(),
      slug: finalSlug,
      description: toNullIfEmpty(input.description),
      cover_image_url: toNullIfEmpty(input.cover_image_url),
      is_published: input.is_published ?? false,
      display_order: toIntOr(input.display_order, 0),
      launch_at: toNullIfEmpty(input.launch_at),
      story_text: toNullIfEmpty(input.story_text),
      hero_gallery: Array.isArray(input.hero_gallery) ? input.hero_gallery : [],
      meta_title: toNullIfEmpty(input.meta_title),
      meta_description: toNullIfEmpty(input.meta_description),
    };

    const { data: created, error: insErr } = await adminClient
      .from('collections')
      .insert(insertRow)
      .select('*')
      .single<CollectionRow>();

    if (insErr || !created) {
      console.error('[admin/collections POST] insert error:', insErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: insErr?.message ?? 'Không tạo được collection' },
        { status: 500 }
      );
    }

    // Invalidate cache để chatbot thấy collection mới ngay
    invalidateCollectionCache();

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error('[admin/collections POST] unexpected error:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
