/**
 * /api/account/reviews
 *
 *   GET  — Liệt kê review của customer (cả chưa duyệt), order theo created_at DESC.
 *   POST — Tạo review mới. Auto-fill customer_name từ profile.full_name
 *          (fallback email/phone) và is_verified_purchase từ RPC is_verified_purchase.
 *          is_approved = false (admin sẽ duyệt).
 *
 * Auth: requireCustomer. Mọi read/write qua admin client.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';
import type { Review } from '@/lib/types/account';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const reviewInsertSchema = z
  .object({
    product_id: z.string().uuid('product_id không hợp lệ'),
    rating: z
      .number()
      .int()
      .min(1, 'Đánh giá tối thiểu 1 sao')
      .max(5, 'Đánh giá tối đa 5 sao'),
    title: z.string().max(200).optional(),
    content: z.string().min(10, 'Nội dung tối thiểu 10 ký tự').max(2000),
  })
  .strict();

export async function GET() {
  try {
    const { user, adminClient } = await requireCustomer();

    const { data, error } = await adminClient
      .from('product_reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .returns<Review[]>();

    if (error) {
      console.error('[GET /api/account/reviews] error:', error);
      return NextResponse.json(
        { error: 'FETCH_FAILED', message: 'Không thể lấy danh sách review' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return authErrorResponse(err, 'GET /api/account/reviews');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile, adminClient } = await requireCustomer();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = reviewInsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { product_id, rating, title, content } = parsed.data;

    // Cast vì Supabase type narrowing khiến RPC args bị narrow về `undefined`
    // (xem docs/ts-errors-cleanup.md nhóm 6).
    const { data: verified, error: rpcErr } = await (adminClient.rpc as any)(
      'is_verified_purchase',
      { p_user_id: user.id, p_product_id: product_id }
    );

    if (rpcErr) {
      console.error(
        '[POST /api/account/reviews] is_verified_purchase rpc error:',
        rpcErr
      );
    }

    const customerName =
      profile.full_name?.trim() ||
      user.email?.split('@')[0] ||
      profile.phone ||
      'Khách hàng';

    const { data: created, error: insertErr } = await adminClient
      .from('product_reviews')
      .insert({
        product_id,
        user_id: user.id,
        customer_name: customerName,
        rating,
        title: title ?? null,
        content,
        is_verified_purchase: Boolean(verified),
        is_approved: false,
      })
      .select('*')
      .single<Review>();

    if (insertErr || !created) {
      console.error('[POST /api/account/reviews] insert error:', insertErr);
      return NextResponse.json(
        { error: 'INSERT_FAILED', message: 'Không thể tạo review' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err, 'POST /api/account/reviews');
  }
}
