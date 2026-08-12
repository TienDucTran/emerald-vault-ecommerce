/**
 * GET /api/locations/provinces — danh sách 63 tỉnh/thành Việt Nam.
 * Cache 24h (dữ liệu hành chính ít thay đổi).
 */

import { NextResponse } from 'next/server';
import { fetchProvinces, stripDivisionPrefix, type Province } from '@/lib/data/vietnam-locations';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24h

export async function GET() {
  try {
    const provinces = await fetchProvinces();
    // Strip prefix "Thành phố "/"Tỉnh " cho dễ hiển thị
    const result: Array<{ code: number; name: string; displayName: string; division_type: string }> =
      provinces.map((p: Province) => ({
        code: p.code,
        name: p.name,
        displayName: stripDivisionPrefix(p.name),
        division_type: p.division_type,
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
    console.error('[/api/locations/provinces] error:', err);
    return NextResponse.json(
      { error: 'Không thể tải danh sách tỉnh/thành.' },
      { status: 502 }
    );
  }
}