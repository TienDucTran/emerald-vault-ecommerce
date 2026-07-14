// GET /api/products/newest?limit=8
import { NextRequest, NextResponse } from 'next/server';
import { getNewestProducts } from '@/lib/supabase/queries/products';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 8);
    const data = await getNewestProducts(Math.min(limit, 50));
    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
