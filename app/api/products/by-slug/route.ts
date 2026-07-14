// GET /api/products/by-slug?slug=nhan-kim-cuong-le-hoang-gia
import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/supabase/queries/products';

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    const data = await getProductBySlug(slug);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
