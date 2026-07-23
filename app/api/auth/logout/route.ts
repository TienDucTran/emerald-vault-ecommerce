/**
 * POST /api/auth/logout
 *
 * Server-side signOut — đảm bảo cookies được clear đúng cách qua @supabase/ssr.
 * Hỗ trợ cả POST (từ form action trên 403 page) và GET (tiện cho link thẳng).
 *
 * Query params:
 *   - `to=admin`    (mặc định) → redirect về /admin/login
 *   - `to=customer`             → redirect về /tai-khoan/dang-nhap
 *
 * Ví dụ: POST /api/auth/logout?to=customer  (admin header gọi để
 * logout admin rồi đi tới trang đăng nhập khách hàng).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// createClient() (server) gọi cookies() → bắt buộc dynamic.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleLogout(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const to = request.nextUrl.searchParams.get('to');
  const loginUrl = request.nextUrl.clone();
  loginUrl.search = '';
  loginUrl.pathname = to === 'customer' ? '/tai-khoan/dang-nhap' : '/admin/login';

  // Nếu là form submit (POST) thì redirect; nếu là fetch (POST/GET JSON) thì trả JSON.
  const accept = request.headers.get('accept') || '';
  if (accept.includes('application/json')) {
    return NextResponse.json({ success: true });
  }
  return NextResponse.redirect(loginUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}
