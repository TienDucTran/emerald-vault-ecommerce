// GET /api/products/search?keyword=...&category=...&material=...&tier=...&season=...
//                       &collectionId=...&minPrice=...&maxPrice=...&sort=newest
//                       &page=1&pageSize=20
import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/supabase/queries/products';
import type { ProductCategory, Material, QualityTier } from '@/lib/supabase/types';

const VALID_CAT: ProductCategory[] = ['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY'];
const VALID_MAT: Material[] = ['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG'];
const VALID_TIER: QualityTier[] = ['SSS', 'SS', 'S'];
const VALID_SORT = ['newest', 'price_asc', 'price_desc', 'featured'] as const;

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const category = p.get('category') as ProductCategory | null;
    const material = p.get('material') as Material | null;
    const tier = p.get('tier') as QualityTier | null;
    const sort = p.get('sort') as (typeof VALID_SORT)[number] | null;

    if (category && !VALID_CAT.includes(category))
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    if (material && !VALID_MAT.includes(material))
      return NextResponse.json({ error: 'Invalid material' }, { status: 400 });
    if (tier && !VALID_TIER.includes(tier))
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    if (sort && !VALID_SORT.includes(sort))
      return NextResponse.json({ error: 'Invalid sort' }, { status: 400 });

    const result = await searchProducts({
      keyword: p.get('keyword') ?? undefined,
      category: category ?? undefined,
      material: material ?? undefined,
      tier: tier ?? undefined,
      season: p.get('season') ?? undefined,
      collectionId: p.get('collectionId') ?? undefined,
      minPrice: p.get('minPrice') ? Number(p.get('minPrice')) : undefined,
      maxPrice: p.get('maxPrice') ? Number(p.get('maxPrice')) : undefined,
      onlyAvailable: p.get('onlyAvailable') !== 'false',
      sort: sort ?? 'newest',
      page: p.get('page') ? Number(p.get('page')) : 1,
      pageSize: p.get('pageSize') ? Math.min(Number(p.get('pageSize')), 100) : 20,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
