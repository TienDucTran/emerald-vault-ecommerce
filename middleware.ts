/**
 * Middleware — Auth & Role Gate (flows.md §10, §18.10)
 *
 * Bảo vệ 4 nhóm route:
 *   - /admin/*        → admin pages
 *   - /api/admin/*     → admin-only API routes
 *   - /tai-khoan/*     → customer account pages (có whitelist auth sub-paths)
 *   - /api/account/*   → customer-only API routes
 *
 * Flow (admin):
 *   1. Read cookies via @supabase/ssr → call supabase.auth.getUser()
 *      (getUser validate JWT thật với Supabase Auth server; KHÔNG dùng getSession).
 *   2. Nếu !user → redirect /admin/login?next=<pathname>  (cho page) hoặc 401 JSON (cho API).
 *   3. Nếu user tồn tại → query profiles.role theo id.
 *   4. Nếu role !== 'admin' → redirect /403 (cho page) hoặc 403 JSON (cho API).
 *   5. Ngược lại → cho qua.
 *
 * Flow (customer):
 *   1. Tạo Supabase client giống admin flow.
 *   2. Nếu path nằm trong PUBLIC_AUTH_SUBPATHS (dang-nhap, dang-ky, quen-mat-khau,
 *      dat-lai-mat-khau) → pass through, không cần check.
 *   3. Nếu !user → redirect /tai-khoan/dang-nhap?next=<pathname>  (cho page) hoặc
 *      401 JSON (cho API).
 *   4. Nếu user tồn tại nhưng role !== 'customer' → redirect /403 (cho page) hoặc
 *      403 JSON (cho API).
 *   5. Ngược lại → cho qua.
 *
 * Lý do API trả JSON thay vì redirect: client gọi fetch không tự follow redirect
 * tới login page; trả JSON 401/403 giúp client xử lý lỗi rõ ràng.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';

const ADMIN_LOGIN = '/admin/login';
const FORBIDDEN = '/403';
const CUSTOMER_LOGIN = '/tai-khoan/dang-nhap';

const isApiAdminRoute = (pathname: string) => pathname.startsWith('/api/admin/');
const isApiAccountRoute = (pathname: string) => pathname.startsWith('/api/account/');
const isAdminRoute = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/');
const isTaiKhoanRoute = (pathname: string) =>
  pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/');

const PUBLIC_AUTH_SUBPATHS = [
  '/tai-khoan/dang-nhap',
  '/tai-khoan/dang-ky',
  '/tai-khoan/quen-mat-khau',
  '/tai-khoan/dat-lai-mat-khau',
];
const isPublicAuthPath = (pathname: string) =>
  PUBLIC_AUTH_SUBPATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

const ADMIN_PUBLIC_PATHS = ['/admin/login'];
const isAdminPublicPath = (pathname: string) =>
  ADMIN_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

interface MiddlewareContext {
  request: NextRequest;
  pathname: string;
  search: string;
  response: NextResponse;
  supabase: ReturnType<typeof createServerClient<Database>>;
}

/**
 * Tạo Supabase server client + response, gắn cookie refresh nếu Supabase rotate session.
 * Cookie adapter giống pattern trong `lib/auth/require-admin.ts`.
 */
function createSupabaseContext(request: NextRequest): MiddlewareContext {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { request, pathname, search, response, supabase };
}

/**
 * Validate JWT thật với Supabase Auth server — KHÔNG trust cookie payload.
 * getUser có thể throw khi JWT invalid / network error → coi như unauthenticated.
 */
async function getAuthenticatedUser(
  supabase: MiddlewareContext['supabase']
): Promise<{ id: string } | null> {
  try {
    const result = await supabase.auth.getUser();
    return result.data.user;
  } catch {
    return null;
  }
}

async function getUserRole(
  supabase: MiddlewareContext['supabase'],
  userId: string
): Promise<string | null> {
  try {
    const result = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    // Cast vì Supabase type narrowing khiến row bị narrow về `never`
    // (xem docs/ts-errors-cleanup.md nhóm 6).
    const role = (result.data as { role: string } | null)?.role;
    return role ?? null;
  } catch {
    return null;
  }
}

/**
 * Admin check: áp dụng cho /admin/* và /api/admin/*.
 * Trả về NextResponse để short-circuit, hoặc null để cho qua.
 */
async function checkAdmin(ctx: MiddlewareContext): Promise<NextResponse | null> {
  const { request, pathname, search, supabase } = ctx;

  if (isAdminPublicPath(pathname)) {
    return null;
  }

  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    if (isApiAdminRoute(pathname)) {
      return jsonError(401, 'UNAUTHENTICATED', 'Yêu cầu đăng nhập');
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ADMIN_LOGIN;
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== 'admin') {
    if (isApiAdminRoute(pathname)) {
      return jsonError(403, 'FORBIDDEN', 'Tài khoản không có quyền admin');
    }
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = FORBIDDEN;
    forbiddenUrl.search = '';
    return NextResponse.redirect(forbiddenUrl);
  }

  return null;
}

/**
 * Customer check: áp dụng cho /tai-khoan/* và /api/account/*.
 * Whitelist auth sub-paths (dang-nhap, dang-ky, quen-mat-khau, dat-lai-mat-khau)
 * trước khi check đăng nhập.
 * Trả về NextResponse để short-circuit, hoặc null để cho qua.
 */
async function checkCustomer(ctx: MiddlewareContext): Promise<NextResponse | null> {
  const { request, pathname, supabase } = ctx;

  if (isPublicAuthPath(pathname)) {
    return null;
  }

  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    if (isApiAccountRoute(pathname)) {
      return jsonError(401, 'NOT_AUTHENTICATED', 'Yêu cầu đăng nhập');
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = CUSTOMER_LOGIN;
    loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== 'customer') {
    if (isApiAccountRoute(pathname)) {
      return jsonError(403, 'NOT_CUSTOMER', 'Tài khoản không phải customer');
    }
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = FORBIDDEN;
    forbiddenUrl.search = '';
    return NextResponse.redirect(forbiddenUrl);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const ctx = createSupabaseContext(request);
  const { pathname, response } = ctx;

  if (isAdminRoute(pathname) || isApiAdminRoute(pathname)) {
    const blocked = await checkAdmin(ctx);
    if (blocked) return blocked;
    return response;
  }

  if (isTaiKhoanRoute(pathname) || isApiAccountRoute(pathname)) {
    const blocked = await checkCustomer(ctx);
    if (blocked) return blocked;
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/tai-khoan/:path*',
    '/api/account/:path*',
  ],
};
