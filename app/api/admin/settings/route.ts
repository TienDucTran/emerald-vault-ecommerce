// GET /api/admin/settings
//   Returns all site settings (raw key-value map).
//   Response 200: { ok: true, data: Record<string, string> }
//
// PUT /api/admin/settings
//   Body: { settings: Record<string, string> }
//   Upserts all key-value pairs into site_settings table.
//   `announcement_messages` should be passed as JSON string.
//   Response 200: { ok: true, data: Record<string, string> }

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';
import { getSiteSettings } from '@/lib/supabase/queries/site-content';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireAdmin();
    const map = await getSiteSettings();
    return NextResponse.json({ ok: true, data: map });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error('[admin/settings GET] error:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export async function PUT(req: Request) {
  try {
    const { adminClient } = await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', message: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const entries = Object.entries(parsed.data.settings);
    if (entries.length === 0) {
      return NextResponse.json({ ok: true, data: {} });
    }

    // Upsert each key-value pair
    const upsertRows = entries.map(([key, value]) => ({ key, value })) as { key: string; value: string }[];
    const { error: upsertErr } = await adminClient
      .from('site_settings')
      .upsert(upsertRows, { onConflict: 'key' });

    if (upsertErr) {
      console.error('[admin/settings PUT] upsert error:', upsertErr);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: upsertErr.message },
        { status: 500 }
      );
    }

    // Re-fetch to return updated state
    const { data: updated, error: fetchErr } = await adminClient
      .from('site_settings')
      .select('key, value');
    if (fetchErr) {
      return NextResponse.json({ ok: true, data: Object.fromEntries(entries) });
    }

    const map: Record<string, string> = {};
    for (const row of updated ?? []) {
      map[row.key] = row.value;
    }
    return NextResponse.json({ ok: true, data: map });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error('[admin/settings PUT] error:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}