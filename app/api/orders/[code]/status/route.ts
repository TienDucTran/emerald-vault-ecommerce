// GET /api/orders/[code]/status
// Polling trạng thái cho trang /momo/return.
// Trả field gọn để giảm payload.

import { NextResponse } from 'next/server';
import { getOrderStatus } from '@/lib/supabase/queries/orders';

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const code = decodeURIComponent(params.code);
  try {
    const status = await getOrderStatus(code);
    if (!status) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'UNKNOWN' },
      { status: 500 }
    );
  }
}
