// GET /api/orders/[code]?phone=...
// Tra cứu đơn hàng bằng code + verify phone (theo flows.md §8).
// Trả 404 nếu sai phone để tránh leak thông tin.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone');
  if (!phone) {
    return NextResponse.json({ ok: false, error: 'PHONE_REQUIRED' }, { status: 400 });
  }
  const code = decodeURIComponent(params.code);
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `*, order_items(*, product:products(id, slug, title, image_url))`
    )
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
