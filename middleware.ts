/**
 * Middleware — Auth & Role Gate (flows.md §10)
 *
 * Bảo vệ 2 nhóm route:
 *   - /dashboard/*   → admin pages
 *   - /api/admin/*   → admin-only API routes
 *
 * Flow:
 *   1. Read cookies via @supabase/ssr → call supabase.auth.getUser()
 *      (getUser validate JWT thật với Supabase Auth server; KHÔNG dùng getSession).
 *   2. Nếu !user → redirect /admin/login?next=<pathname>  (cho page) hoặc 401 JSON (cho API).
 *   3. Nếu user tồn tại → query profiles.role theo id.
 *   4. Nếu role !== 'admin' → redirect /403 (cho page) hoặc 403 JSON (cho API).
 *   5. Ngược lại → cho qua.
 *
 * Lý do API trả JSON thay vì redirect: client gọi fetch không tự follow redirect
 * tới login page; trả JSON 401/403 giúp client xử lý lỗi rõ ràng.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';

const ADMIN_LOGIN = '/admin/login';
const FORBIDDEN = '/403';

const isApiAdminRoute = (pathname: string) => pathname.startsWith('/api/admin/');

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Tạo response thẳng để có thể gắn cookie refresh nếu Supabase rotate session.
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Quan trọng: phải await createServerClient xong mới gọi được getUser
  // (vì @supabase/ssr khởi tạo async internals).
  // Validate JWT thật với Supabase Auth server — KHÔNG trust cookie payload.
  // getUser có thể throw khi JWT invalid / network error → coi như unauthenticated.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  if (!user) {
    if (isApiAdminRoute(pathname)) {
      return jsonError(401, 'UNAUTHENTICATED', 'Yêu cầu đăng nhập');
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ADMIN_LOGIN;
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  // User hợp lệ → kiểm tra role.
  let profile: { role: string } | null = null;
  try {
    const result = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    profile = result.data;
  } catch {
    profile = null;
  }

  if (!profile || profile.role !== 'admin') {
    if (isApiAdminRoute(pathname)) {
      return jsonError(403, 'FORBIDDEN', 'Tài khoản không có quyền admin');
    }
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = FORBIDDEN;
    forbiddenUrl.search = '';
    return NextResponse.redirect(forbiddenUrl);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
};
