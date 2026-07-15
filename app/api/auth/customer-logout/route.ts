/**
 * POST /api/auth/customer-logout
 *
 * Server-side signOut cho khách hàng (tương tự /api/auth/logout nhưng cho customer area).
 * Hỗ trợ cả POST (form action) và GET (link thẳng).
 * Redirect về /tai-khoan/dang-nhap sau khi logout.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleLogout(request: NextRequest) {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'Đăng xuất thất bại. Vui lòng thử lại.' },
      { status: 500 }
    );
  }

  const accept = request.headers.get('accept') || '';
  if (accept.includes('application/json')) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const loginUrl = new URL('/tai-khoan/dang-nhap', request.url);
  return NextResponse.redirect(loginUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  try {
    return await handleLogout(request);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleLogout(request);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
