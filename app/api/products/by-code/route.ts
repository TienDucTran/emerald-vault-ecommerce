// GET /api/products/by-code?code=EV-0001  (tra cứu nhanh theo SKU)
import { NextRequest, NextResponse } from 'next/server';
import { getProductByCode } from '@/lib/supabase/queries/products';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    const data = await getProductByCode(code);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
