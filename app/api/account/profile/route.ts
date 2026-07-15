/**
 * /api/account/profile
 *
 *   GET   — Trả profile của customer đang đăng nhập.
 *   PATCH — Cập nhật full_name và/hoặc phone. Validate qua zod.
 *
 * Auth: requireCustomer (cookie-bound server client). Mọi write qua
 * admin client (requireCustomer đã verify role = 'customer').
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';
import type { ProfileRow } from '@/lib/supabase/types';

const profileUpdateSchema = z
  .object({
    full_name: z.string().min(1).max(120).optional(),
    phone: z
      .string()
      .min(8)
      .max(20)
      .regex(/^[0-9+\s-]+$/)
      .optional()
      .or(z.literal('')),
  })
  .strict();

export async function GET() {
  try {
    const { profile } = await requireCustomer();
    return NextResponse.json({ profile: profile as ProfileRow });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile, adminClient } = await requireCustomer();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = profileUpdateSchema.safeParse(body);
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

    const update: Partial<ProfileRow> = {};
    if (parsed.data.full_name !== undefined) {
      update.full_name = parsed.data.full_name;
    }
    if (parsed.data.phone !== undefined) {
      // Cho phép xoá phone bằng cách gửi chuỗi rỗng.
      update.phone = parsed.data.phone === '' ? null : parsed.data.phone;
    }

    if (Object.keys(update).length === 0) {
      // Không có gì để cập nhật — trả về profile hiện tại.
      return NextResponse.json({ profile });
    }

    const { data: updated, error } = await adminClient
      .from('profiles')
      .update(update)
      .eq('id', profile.id)
      .select('*')
      .single<ProfileRow>();

    if (error || !updated) {
      console.error('[PATCH /api/account/profile] update error:', error);
      return NextResponse.json(
        { error: 'UPDATE_FAILED', message: 'Không thể cập nhật profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: updated });
  } catch (err) {
    return authErrorResponse(err, 'PATCH /api/account/profile');
  }
}
