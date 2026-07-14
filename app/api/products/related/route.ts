// GET /api/products/related?productId=xxx&limit=4
import { NextRequest, NextResponse } from 'next/server';
import { getRelatedProducts } from '@/lib/supabase/queries/products';

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get('productId');
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 4);
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }
    const data = await getRelatedProducts(productId, Math.min(limit, 12));
    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
