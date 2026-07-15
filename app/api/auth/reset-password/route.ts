/**
 * POST /api/auth/reset-password
 *
 * Gửi email đặt lại mật khẩu cho khách hàng.
 * Luôn trả về thông báo thành công để tránh lộ email đã đăng ký.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email().max(120),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Dữ liệu gửi lên không hợp lệ.' },
        { status: 400 }
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Email không hợp lệ.' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${siteUrl}/tai-khoan/dat-lai-mat-khau`;

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          'Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.',
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
