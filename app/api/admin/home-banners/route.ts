// GET /api/admin/home-banners
//   Returns ALL home banners (including inactive), ordered by display_order.
//   Response 200: { ok: true, data: HomeBannerRow[] }
//
// POST /api/admin/home-banners
//   Body: { slot_key, title, subtitle?, image_url, link_url, display_order?, is_active?, valid_from?, valid_until? }
//   Creates a new banner. slot_key must be unique (409 if exists).
//   Response 201: { ok: true, data: HomeBannerRow }

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';
import type { HomeBannerRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const slotKeyRegex = /^[a-z_]+$/;

export async function GET() {
  try {
    const { adminClient } = await requireAdmin();
    const { data, error } = await adminClient
      .from('home_banners')
      .select('*')
      .order('display_order', { ascending: true });
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
    console.error('[admin/home-banners GET] error:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  slot_key: z.string().trim().min(1).max(40).regex(slotKeyRegex, 'slot_key chỉ gồm chữ thường và dấu _'),
  title: z.string().trim().min(1, 'Title là bắt buộc').max(120),
  subtitle: z.string().max(200).optional().nullable().or(z.literal('')),
  image_url: z.string().min(1, 'Image URL là bắt buộc').max(2000),
  link_url: z.string().min(1, 'Link URL là bắt buộc').max(500),
  display_order: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
  valid_from: z.string().max(50).optional().nullable().or(z.literal('')),
  valid_until: z.string().max(50).optional().nullable().or(z.literal('')),
});

function toNullIfEmpty(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export async function POST(req: Request) {
  try {
    const { adminClient } = await requireAdmin();
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

    const input = parsed.data;

    // Check unique slot_key
    const { data: existing } = await adminClient
      .from('home_banners')
      .select('id')
      .eq('slot_key', input.slot_key)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'SLOT_EXISTS', message: 'Slot này đã có banner. Hãy sửa banner hiện có.' },
        { status: 409 }
      );
    }

    const insertRow = {
      slot_key: input.slot_key,
      title: input.title.trim(),
      subtitle: toNullIfEmpty(input.subtitle),
      image_url: input.image_url,
      link_url: input.link_url,
      display_order: input.display_order ?? 0,
      is_active: input.is_active ?? true,
      valid_from: toNullIfEmpty(input.valid_from),
      valid_until: toNullIfEmpty(input.valid_until),
    };

    const { data: created, error: insErr } = await adminClient
      .from('home_banners')
      .insert(insertRow)
      .select('*')
      .single<HomeBannerRow>();

    if (insErr || !created) {
      console.error('[admin/home-banners POST] insert error:', insErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: insErr?.message ?? 'Không tạo được banner' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error('[admin/home-banners POST] error:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}