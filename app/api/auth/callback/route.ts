/**
 * Google OAuth Callback Route
 *
 * Supabase redirects user here sau khi Google OAuth thành công.
 * Flow:
 *   1. Nhận code + next từ query params (Supabase gửi)
 *   2. Exchange code lấy session (Supabase tự xử lý cookie)
 *   3. Sync thông tin Google (full_name, avatar_url) vào bảng profiles
 *   4. Đợi session commit cookie vào response
 *   5. Redirect user về trang đích (mặc định /tai-khoan/ho-so)
 *
 * Cấu hình trong Supabase Dashboard:
 *   Authentication → Providers → Google → Enable
 *   → nhập Client ID + Client Secret từ Google Cloud Console
 *   → Redirect URL: {SITE_URL}/api/auth/callback
 *
 * Google Cloud Console:
 *   → APIs & Services → Credentials → OAuth 2.0 Client ID (Web application)
 *   → Authorized redirect URIs: {SITE_URL}/api/auth/callback
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Supabase gửi code + next sau OAuth thành công
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/tai-khoan/ho-so';

  if (!code) {
    const loginUrl = new URL('/tai-khoan/dang-nhap', origin);
    loginUrl.searchParams.set('error', 'Liên kết xác thực không hợp lệ.');
    return NextResponse.redirect(loginUrl);
  }

  // Bước 1: Tạo response + supabase client — QUAN TRỌNG: cookie phải set vào response
  let response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Tạo response MỚI để ghi cookie vào header
          response = NextResponse.redirect(new URL(next, origin));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Bước 2: Exchange code → session (Supabase set cookie qua setAll ở trên)
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    const loginUrl = new URL('/tai-khoan/dang-nhap', origin);
    loginUrl.searchParams.set('error', 'Xác thực thất bại. Vui lòng thử lại.');
    return NextResponse.redirect(loginUrl);
  }

  // Bước 3: Lấy user info từ session để sync profile
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user) {
      const fullName = user.user_metadata?.full_name
        || user.user_metadata?.name
        || '';
      const avatarUrl = user.user_metadata?.avatar_url
        || user.user_metadata?.picture
        || '';

      // Kiểm tra xem profile đã tồn tại chưa
      const { data: existingProfile } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Tạo profile mới cho user OAuth
        const { error: insertError } = await (supabase as any)
          .from('profiles')
          .insert({
            id: user.id,
            full_name: fullName,
            role: 'customer',
            avatar_url: avatarUrl,
          });

        if (insertError) {
          console.error('[auth/callback] insert profile error:', insertError.message);
        }
      } else if (fullName) {
        // Profile đã tồn tại: CHỈ update full_name, KHÔNG update avatar_url
        // (để không ghi đè avatar custom user đã upload)
        // Nếu muốn force sync avatar từ Google, cần UX rõ ràng hơn (vd: button "Sync Google avatar")
        const { error: updateError } = await (supabase as any)
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', user.id);

        if (updateError) {
          console.error('[auth/callback] update profile error:', updateError.message);
        }
      }

      // Bước 4: Link guest orders nếu có (match theo email)
      const userEmail = user.email;
      if (userEmail) {
        const { error: linkError } = await (supabase as any).rpc('link_guest_orders_to_user', {
          p_user_id: user.id,
          p_phone: '',
        });
        if (linkError) {
          // Không phải lỗi critical — log nhẹ
          console.warn('[auth/callback] link_guest_orders warning:', linkError.message);
        }
      }
    }
  } catch (err) {
    // Non-critical: không block redirect
    console.warn('[auth/callback] profile sync error:', err);
  }

  // Bước 5: Redirect về trang đích (cookie đã được set trong response)
  return response;
}