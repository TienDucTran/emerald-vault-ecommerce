// GET /api/products/by-category?category=NHAN&limit=50
import { NextRequest, NextResponse } from 'next/server';
import { getProductsByCategory } from '@/lib/supabase/queries/products';
import type { ProductCategory } from '@/lib/supabase/types';

const VALID: ProductCategory[] = ['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY'];

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category') as ProductCategory | null;
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50);
    if (!category || !VALID.includes(category)) {
      return NextResponse.json({ error: 'Invalid category', valid: VALID }, { status: 400 });
    }
    const data = await getProductsByCategory(category, Math.min(limit, 100));
    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
