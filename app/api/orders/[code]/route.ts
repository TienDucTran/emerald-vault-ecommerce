// GET /api/orders/[code]?phone=...
// Tra cứu đơn hàng bằng code + verify phone (theo flows.md §8).
// Trả 404 nếu sai phone để tránh leak thông tin.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone');

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const limit = await rateLimit('order-lookup', {
    identifier: ip,
    limit: 10,
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
  if (!phone) {
    return NextResponse.json({ ok: false, error: 'PHONE_REQUIRED' }, { status: 400 });
  }
  const code = decodeURIComponent(params.code);
  const supabase = createAdminClient();
  const db = supabase.from('orders') as any;

  const { data: order, error } = await db
    .select(`*, order_items(*, product:products(id, slug, title, image_url))`)
    .eq('code', code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }
  // Verify phone (so sánh chính xác, sau khi trim)
  if (order.customer_phone.trim() !== phone.trim()) {
    // Trả 404 thay vì 403 để không tiết lộ đơn có tồn tại
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order });
}
