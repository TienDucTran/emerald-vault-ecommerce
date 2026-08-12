/**
 * GET /api/locations/districts?provinceCode=XX — danh sách quận/huyện theo mã tỉnh.
 * Cache 24h.
 */

import { NextResponse } from 'next/server';
import {
  fetchDistricts,
  stripDistrictPrefix,
  type District,
} from '@/lib/data/vietnam-locations';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24h

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceCode = searchParams.get('provinceCode');

    if (!provinceCode) {
      return NextResponse.json(
        { error: 'Thiếu tham số provinceCode.' },
        { status: 400 }
      );
    }

    const code = parseInt(provinceCode, 10);
    if (isNaN(code)) {
      return NextResponse.json(
        { error: 'provinceCode không hợp lệ.' },
        { status: 400 }
      );
    }

    const districts = await fetchDistricts(code);
    const result: Array<{ code: number; name: string; displayName: string; division_type: string }> =
      districts.map((d: District) => ({
        code: d.code,
        name: d.name,
        displayName: stripDistrictPrefix(d.name),
        division_type: d.division_type,
      }));

    return NextResponse.json(
      { data: result },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      }
    );
  } catch (err) {
    console.error('[/api/locations/districts] error:', err);
    return NextResponse.json(
      { error: 'Không thể tải danh sách quận/huyện.' },
      { status: 502 }
    );
  }
}