/**
 * GET /api/locations/wards?districtCode=XXX — danh sách phường/xã theo mã quận/huyện.
 * Cache 24h.
 */

import { NextResponse } from 'next/server';
import { fetchWards, stripWardPrefix, type Ward } from '@/lib/data/vietnam-locations';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24h

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const districtCode = searchParams.get('districtCode');

    if (!districtCode) {
      return NextResponse.json(
        { error: 'Thiếu tham số districtCode.' },
        { status: 400 }
      );
    }

    const code = parseInt(districtCode, 10);
    if (isNaN(code)) {
      return NextResponse.json(
        { error: 'districtCode không hợp lệ.' },
        { status: 400 }
      );
    }

    const wards = await fetchWards(code);
    const result: Array<{ code: number; name: string; displayName: string; division_type: string }> =
      wards.map((w: Ward) => ({
        code: w.code,
        name: w.name,
        displayName: stripWardPrefix(w.name),
        division_type: w.division_type,
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
    console.error('[/api/locations/wards] error:', err);
    return NextResponse.json(
      { error: 'Không thể tải danh sách phường/xã.' },
      { status: 502 }
    );
  }
}