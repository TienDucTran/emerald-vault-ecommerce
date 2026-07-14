// GET /api/products/by-tier?tier=SSS&limit=50
import { NextRequest, NextResponse } from 'next/server';
import { getProductsByTier } from '@/lib/supabase/queries/products';
import type { QualityTier } from '@/lib/supabase/types';

const VALID: QualityTier[] = ['SSS', 'SS', 'S'];

export async function GET(req: NextRequest) {
  try {
    const tier = req.nextUrl.searchParams.get('tier') as QualityTier | null;
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50);
    if (!tier || !VALID.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier', valid: VALID }, { status: 400 });
    }
    const data = await getProductsByTier(tier, Math.min(limit, 100));
    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
