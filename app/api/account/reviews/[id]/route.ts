/**
 * /api/account/reviews/[id]
 *
 *   PATCH  — Cập nhật review (chỉ owner, chỉ trong 7 ngày kể từ khi tạo).
 *   DELETE — Xoá review (chỉ owner).
 *
 * Auth: requireCustomer. Mọi write qua admin client.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';
import type { Review } from '@/lib/types/account';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const reviewUpdateSchema = z
  .object({
    title: z.string().max(200).optional(),
    content: z
      .string()
      .min(10, 'Nội dung tối thiểu 10 ký tự')
      .max(2000)
      .optional(),
    rating: z
      .number()
      .int()
      .min(1, 'Đánh giá tối thiểu 1 sao')
      .max(5, 'Đánh giá tối đa 5 sao')
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined || data.content !== undefined || data.rating !== undefined,
    { message: 'Phải cung cấp ít nhất 1 trường để cập nhật' }
  );

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { user, adminClient } = await requireCustomer();
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id review' },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = reviewUpdateSchema.safeParse(body);
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

    const { data: existing, error: findErr } = await adminClient
      .from('product_reviews')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle<Review>();

    if (findErr) {
      console.error('[PATCH /api/account/reviews/[id]] find error:', findErr);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy review' },
        { status: 404 }
      );
    }

    const createdAt = new Date(existing.created_at).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - createdAt > sevenDaysMs) {
      return NextResponse.json(
        {
          error: 'EDIT_WINDOW_EXPIRED',
          message: 'Đã quá thời hạn 7 ngày để chỉnh sửa review',
        },
        { status: 403 }
      );
    }

    const { data: updated, error: updateErr } = await adminClient
      .from('product_reviews')
      .update({
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.content !== undefined
          ? { content: parsed.data.content }
          : {}),
        ...(parsed.data.rating !== undefined
          ? { rating: parsed.data.rating }
          : {}),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single<Review>();

    if (updateErr || !updated) {
      console.error(
        '[PATCH /api/account/reviews/[id]] update error:',
        updateErr
      );
      return NextResponse.json(
        { error: 'UPDATE_FAILED', message: 'Không thể cập nhật review' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return authErrorResponse(err, 'PATCH /api/account/reviews/[id]');
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { user, adminClient } = await requireCustomer();
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id review' },
        { status: 400 }
      );
    }

    const { data: existing, error: findErr } = await adminClient
      .from('product_reviews')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findErr) {
      console.error(
        '[DELETE /api/account/reviews/[id]] find error:',
        findErr
      );
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy review' },
        { status: 404 }
      );
    }

    const { error: delErr } = await adminClient
      .from('product_reviews')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (delErr) {
      console.error(
        '[DELETE /api/account/reviews/[id]] delete error:',
        delErr
      );
      return NextResponse.json(
        { error: 'DELETE_FAILED', message: 'Không thể xoá review' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return authErrorResponse(err, 'DELETE /api/account/reviews/[id]');
  }
}
