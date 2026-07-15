/**
 * POST /api/auth/magic-link
 *
 * Gửi magic-link OTP email cho đăng nhập không mật khẩu.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email().max(120),
  next: z.string().optional(),
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

    const { email, next } = parsed.data;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const nextPath = next || '/tai-khoan';
    const emailRedirectTo = `${siteUrl}/tai-khoan/ho-so?next=${encodeURIComponent(nextPath)}`;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'Đã gửi liên kết đăng nhập đến email của bạn.',
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
