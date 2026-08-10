// GET /api/home-banners
//   Public endpoint — returns active home banners (filtered by valid_from/valid_until).
//   Used by homepage FeaturedCollections component.
//   Response 200: { ok: true, data: HomeBanner[] }

import { NextResponse } from 'next/server';
import { getActiveHomeBanners, toHomeBanner, DEFAULT_BANNERS } from '@/lib/supabase/queries/site-content';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const rows = await getActiveHomeBanners();
    const banners = rows.map(toHomeBanner);
    return NextResponse.json({ ok: true, data: banners });
  } catch (e) {
    // Fallback to defaults on error (table might not exist yet)
    console.error('[api/home-banners GET] error:', e);
    return NextResponse.json({ ok: true, data: DEFAULT_BANNERS });
  }
}