/**
 * /api/account/wishlist/[productId]
 *
 *   DELETE — Xoá product khỏi wishlist của customer.
 *   GET    — Check 1 product có trong wishlist của customer hay không.
 *
 * Auth: requireCustomer. Mọi read/write qua admin client.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: { productId: string };
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { user, adminClient } = await requireCustomer();
    const { productId } = context.params;

    if (!productId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu productId' },
        { status: 400 }
      );
    }

    const { error: delErr } = await adminClient
      .from('wishlist_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (delErr) {
      console.error(
        '[DELETE /api/account/wishlist/[productId]] delete error:',
        delErr
      );
      return NextResponse.json(
        { error: 'DELETE_FAILED', message: 'Không thể xoá khỏi wishlist' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return authErrorResponse(err, 'DELETE /api/account/wishlist/[productId]');
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { user, adminClient } = await requireCustomer();
    const { productId } = context.params;

    if (!productId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu productId' },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from('wishlist_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      console.error(
        '[GET /api/account/wishlist/[productId]] check error:',
        error
      );
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
        { status: 500 }
      );
    }

    return NextResponse.json({ in_wishlist: Boolean(data) });
  } catch (err) {
    return authErrorResponse(err, 'GET /api/account/wishlist/[productId]');
  }
}
