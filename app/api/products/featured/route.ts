// GET /api/products/featured?limit=4
import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedProducts } from '@/lib/supabase/queries/products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 4);
    const data = await getFeaturedProducts(Math.min(limit, 50));
    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
