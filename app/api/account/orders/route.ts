/**
 * GET /api/account/orders?limit=&offset=
 *
 * Trả về danh sách orders của customer đang đăng nhập.
 *   - `limit`  : mặc định 20, tối đa 100.
 *   - `offset` : mặc định 0.
 *
 * Auth: requireCustomer.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { AuthError, requireCustomer } from '@/lib/auth/require-customer';
import { getOrdersByCustomer } from '@/lib/supabase/queries/orders';

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireCustomer();

    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get('limit') ?? '20');
    const rawOffset = Number(url.searchParams.get('offset') ?? '0');

    const limit = Number.isFinite(rawLimit) ? rawLimit : 20;
    const offset = Number.isFinite(rawOffset) ? rawOffset : 0;

    const { data, total } = await getOrdersByCustomer(profile.id, {
      limit,
      offset,
    });

    return NextResponse.json({ data, total });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status }
      );
    }
    console.error('[GET /api/account/orders] unexpected error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
      { status: 500 }
    );
  }
}
