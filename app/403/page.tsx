import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

/**
 * 403 — Không có quyền truy cập.
 * Server Component, retro/dark theme, đồng bộ với admin chrome.
 *
 * Có 2 nút:
 *   - "← Về trang chủ" → /
 *   - "Đăng xuất"       → /api/auth/logout (server-side, đảm bảo clear cookies)
 */
export default async function ForbiddenPage() {
  // Lấy user hiện tại (nếu có) để hiển thị email trong message.
  let userEmail: string | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // ignore — không có user cũng OK
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1117] text-[#D0C5AF]">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center">
          {/* 403 mark */}
          <div className="mb-6">
            <span className="font-heading text-8xl font-bold text-gold tracking-[0.1em]">
              403
            </span>
          </div>

          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] mb-3 tracking-[0.05em]">
            Không có quyền truy cập
          </h1>

          <p className="text-sm text-[#D0C5AF]/70 leading-relaxed max-w-md mx-auto">
            Tài khoản của bạn không được phép truy cập khu vực quản trị.
            {userEmail && (
              <>
                {' '}
                Đang đăng nhập với tài khoản{' '}
                <span className="text-gold font-medium">{userEmail}</span>.
              </>
            )}
          </p>

          <p className="mt-2 text-xs text-[#D0C5AF]/50">
            Vui lòng liên hệ quản trị viên hệ thống nếu bạn cho rằng đây là sai sót.
          </p>

          {/* Actions */}
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold transition-colors"
              style={{
                background: 'rgba(18, 36, 28, 0.6)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(242, 202, 80, 0.2)',
                color: '#F2CA50',
              }}
            >
              ← Về trang chủ
            </Link>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold transition-colors"
                style={{
                  background: '#F2CA50',
                  color: '#0D1117',
                }}
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-[10px] text-[#D0C5AF]/30 font-heading tracking-[0.1em] uppercase">
        © {new Date().getFullYear()} Emerald Vault — Access Denied
      </footer>
    </div>
  );
}
