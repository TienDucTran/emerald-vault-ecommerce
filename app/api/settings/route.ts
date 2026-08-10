// GET /api/settings
//   Public endpoint — returns all site settings as key-value map.
//   Used by homepage + footer + announcement bar.
//   Response 200: { ok: true, data: SiteSettings }

import { NextResponse } from 'next/server';
import { getSiteSettings, toSiteSettings, DEFAULT_SITE_SETTINGS } from '@/lib/supabase/queries/site-content';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const map = await getSiteSettings();
    const settings = toSiteSettings(map);
    return NextResponse.json({ ok: true, data: settings });
  } catch (e) {
    // Fallback to defaults on error (table might not exist yet)
    console.error('[api/settings GET] error:', e);
    return NextResponse.json({ ok: true, data: DEFAULT_SITE_SETTINGS });
  }
}