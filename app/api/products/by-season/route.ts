// GET /api/products/by-season?season=SUMMER_2026&limit=50
import { NextRequest, NextResponse } from 'next/server';
import { getProductsBySeason } from '@/lib/supabase/queries/products';

export async function GET(req: NextRequest) {
  try {
    const season = req.nextUrl.searchParams.get('season');
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50);
    if (!season) {
      return NextResponse.json({ error: 'Missing season' }, { status: 400 });
    }
    const data = await getProductsBySeason(season, Math.min(limit, 100));
    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
