// GET /api/products/by-material?material=BAC_925&limit=50
import { NextRequest, NextResponse } from 'next/server';
import { getProductsByMaterial } from '@/lib/supabase/queries/products';
import type { Material } from '@/lib/supabase/types';

const VALID: Material[] = ['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG'];

export async function GET(req: NextRequest) {
  try {
    const material = req.nextUrl.searchParams.get('material') as Material | null;
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50);
    if (!material || !VALID.includes(material)) {
      return NextResponse.json({ error: 'Invalid material', valid: VALID }, { status: 400 });
    }
    const data = await getProductsByMaterial(material, Math.min(limit, 100));
    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
