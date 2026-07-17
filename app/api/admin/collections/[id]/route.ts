/**
 * /api/admin/collections/[id]
 *
 *   GET    — 1 collection (bao gồm cả draft). 404 nếu không tìm thấy.
 *   PATCH  — update partial body. 409 SLUG_EXISTS nếu đổi slug trùng.
 *   DELETE — xoá. products.collection_id FK ON DELETE SET NULL nên product
 *            KHÔNG bị xoá theo (chỉ set null). Có thể truyền ?detach=true
 *            để bỏ qua — hiện tại FK behavior đã đúng, không cần.
 *
 * Auth: requireAdmin.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { slugify } from '@/lib/utils';
import type { CollectionRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const slugRegex = /^[a-z0-9-]+$/;

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(slugRegex, 'Slug chỉ gồm chữ thường, số và dấu -')
    .optional()
    .or(z.literal('')),
  description: z.string().max(2000).optional().nullable(),
  cover_image_url: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  is_published: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
  launch_at: z.string().max(50).optional().nullable().or(z.literal('')),
  story_text: z.string().max(20000).optional().nullable().or(z.literal('')),
  hero_gallery: z.array(z.string().url().max(2000)).max(20).optional(),
  meta_title: z.string().max(200).optional().nullable().or(z.literal('')),
  meta_description: z.string().max(500).optional().nullable().or(z.literal('')),
});

function toNullIfEmpty(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const { adminClient } = await requireAdmin();
    const { data, error } = await adminClient
      .from('collections')
      .select('*')
      .eq('id', id)
      .maybeSingle<CollectionRow>();
    if (error) {
      console.error('[admin/collections/id GET] error:', error);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Không tải được collection' },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'NOT_FOUND', message: 'Không tìm thấy bộ sưu tập' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return authErrorResponse(err, 'admin/collections/id');
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
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
    const input = parsed.data;
    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', message: 'Body rỗng' },
        { status: 400 }
      );
    }

    const { adminClient } = await requireAdmin();

    // Check exists
    const { data: cur, error: curErr } = await adminClient
      .from('collections')
      .select('id, name, slug')
      .eq('id', id)
      .maybeSingle<{ id: string; name: string; slug: string }>();
    if (curErr) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: curErr.message },
        { status: 500 }
      );
    }
    if (!cur) {
      return NextResponse.json(
        { ok: false, error: 'NOT_FOUND', message: 'Không tìm thấy bộ sưu tập' },
        { status: 404 }
      );
    }

    const update: Record<string, unknown> = {};

    if (typeof input.name === 'string') {
      const n = input.name.trim();
      if (n.length > 0) update.name = n;
    }
    if (input.slug !== undefined) {
      let s: string;
      if (typeof input.slug === 'string' && input.slug.trim().length > 0) {
        s = input.slug.trim();
      } else {
        // empty → auto-generate từ name hiện tại (ưu tiên name mới nếu có)
        s = slugify((update.name as string | undefined) ?? cur.name);
      }
      if (!slugRegex.test(s)) {
        return NextResponse.json(
          { ok: false, error: 'BAD_REQUEST', message: 'Slug không hợp lệ' },
          { status: 400 }
        );
      }
      if (s !== cur.slug) {
        const { data: dup, error: dupErr } = await adminClient
          .from('collections')
          .select('id')
          .eq('slug', s)
          .neq('id', id)
          .maybeSingle();
        if (dupErr) {
          return NextResponse.json(
            { ok: false, error: 'DB_ERROR', message: dupErr.message },
            { status: 500 }
          );
        }
        if (dup) {
          return NextResponse.json(
            { ok: false, error: 'SLUG_EXISTS', message: 'Slug đã tồn tại' },
            { status: 409 }
          );
        }
      }
      update.slug = s;
    }
    if ('description' in input) update.description = toNullIfEmpty(input.description);
    if ('cover_image_url' in input) update.cover_image_url = toNullIfEmpty(input.cover_image_url);
    if (typeof input.is_published === 'boolean') update.is_published = input.is_published;
    if (typeof input.display_order === 'number') update.display_order = input.display_order;
    if ('launch_at' in input) update.launch_at = toNullIfEmpty(input.launch_at);
    if ('story_text' in input) update.story_text = toNullIfEmpty(input.story_text);
    if (Array.isArray(input.hero_gallery)) update.hero_gallery = input.hero_gallery;
    if ('meta_title' in input) update.meta_title = toNullIfEmpty(input.meta_title);
    if ('meta_description' in input) update.meta_description = toNullIfEmpty(input.meta_description);

    const { data: updated, error: upErr } = await adminClient
      .from('collections')
      .update(update)
      .eq('id', id)
      .select('*')
      .single<CollectionRow>();

    if (upErr || !updated) {
      console.error('[admin/collections/id PATCH] error:', upErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: upErr?.message ?? 'Không cập nhật được' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return authErrorResponse(err, 'admin/collections/id');
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const { adminClient } = await requireAdmin();

    const { data: cur, error: curErr } = await adminClient
      .from('collections')
      .select('id')
      .eq('id', id)
      .maybeSingle<{ id: string }>();
    if (curErr) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: curErr.message },
        { status: 500 }
      );
    }
    if (!cur) {
      return NextResponse.json(
        { ok: false, error: 'NOT_FOUND', message: 'Không tìm thấy bộ sưu tập' },
        { status: 404 }
      );
    }

    const { error: delErr } = await adminClient
      .from('collections')
      .delete()
      .eq('id', id);
    if (delErr) {
      console.error('[admin/collections/id DELETE] error:', delErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: delErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err, 'admin/collections/id');
  }
}
