// PUT /api/admin/home-banners/[id]
//   Body: partial HomeBanner fields — updates the banner.
//   Response 200: { ok: true, data: HomeBannerRow }
//
// DELETE /api/admin/home-banners/[id]
//   Deletes the banner.
//   Response 200: { ok: true }

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';
import type { HomeBannerRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateSchema = z.object({
  slot_key: z.string().trim().min(1).max(40).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  subtitle: z.string().max(200).optional().nullable().or(z.literal('')),
  image_url: z.string().min(1).max(2000).optional(),
  link_url: z.string().min(1).max(500).optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  valid_from: z.string().max(50).optional().nullable().or(z.literal('')),
  valid_until: z.string().max(50).optional().nullable().or(z.literal('')),
});

function toNullIfEmpty(v: unknown): string | null {
  if (v === null || v === undefined) return undefined as any;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { adminClient } = await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
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
    const updateRow: Record<string, unknown> = {};

    if (input.slot_key !== undefined) updateRow.slot_key = input.slot_key;
    if (input.title !== undefined) updateRow.title = input.title.trim();
    if (input.subtitle !== undefined) updateRow.subtitle = toNullIfEmpty(input.subtitle);
    if (input.image_url !== undefined) updateRow.image_url = input.image_url;
    if (input.link_url !== undefined) updateRow.link_url = input.link_url;
    if (input.display_order !== undefined) updateRow.display_order = input.display_order;
    if (input.is_active !== undefined) updateRow.is_active = input.is_active;
    if (input.valid_from !== undefined) updateRow.valid_from = toNullIfEmpty(input.valid_from);
    if (input.valid_until !== undefined) updateRow.valid_until = toNullIfEmpty(input.valid_until);

    if (Object.keys(updateRow).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', message: 'Không có trường nào để cập nhật' },
        { status: 400 }
      );
    }

    const { data: updated, error } = await adminClient
      .from('home_banners')
      .update(updateRow)
      .eq('id', params.id)
      .select('*')
      .single<HomeBannerRow>();

    if (error || !updated) {
      console.error('[admin/home-banners PUT] error:', error);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error?.message ?? 'Không cập nhật được banner' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error('[admin/home-banners PUT] error:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient
      .from('home_banners')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('[admin/home-banners DELETE] error:', error);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error('[admin/home-banners DELETE] error:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}