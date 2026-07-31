// GET /api/orders/[code]/status
// Polling trạng thái cho trang /momo/return.
// Trả field gọn để giảm payload.

import { NextResponse } from 'next/server';
import { getOrderStatus } from '@/lib/supabase/queries/orders';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const limit = await rateLimit('order-status', {
    identifier: ip,
    limit: 60,
    window: '1 m',
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED', retryAfter: limit.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfter ?? 60),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(limit.resetAt),
        },
      }
    );
  }

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
