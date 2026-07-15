'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { ProfileRow } from '@/lib/supabase/types';

const DEFAULT_NEXT = '/dashboard';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || DEFAULT_NEXT;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Nếu user đã đăng nhập VÀ là admin thì đẩy thẳng vào /dashboard (hoặc next).
  // Tránh flash màn login khi admin refresh trang khi đang trong session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single<ProfileRow>();
        if (cancelled) return;
        if (profile?.role === 'admin') {
          router.replace(nextParam);
          return;
        }
      }
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, nextParam]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError('Email hoặc mật khẩu không đúng');
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setError('Đăng nhập thất bại. Vui lòng thử lại');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<ProfileRow>();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError('Không tìm thấy hồ sơ người dùng');
        setLoading(false);
        return;
      }

      if (profile.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Tài khoản không có quyền admin');
        setLoading(false);
        return;
      }

      // Clear password khỏi state trước khi navigate.
      setPassword('');
      router.push(nextParam);
      router.refresh();
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại');
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117] text-[#D0C5AF]/60 text-sm font-heading tracking-[0.1em]">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1117] text-[#D0C5AF]">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Brand mark */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="font-heading text-3xl font-bold text-gold tracking-[0.15em] uppercase">
                Emerald Vault
              </h1>
              <p className="mt-2 text-xs font-heading tracking-[0.2em] text-[#D0C5AF]/50 uppercase">
                Admin Console
              </p>
            </Link>
          </div>

          {/* Login card */}
          <div
            className="rounded-sm p-8"
            style={{
              background: 'rgba(18, 36, 28, 0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(242, 202, 80, 0.2)',
            }}
          >
            <h2 className="font-heading text-xl font-bold text-[#EAE1D4] mb-1">
              Đăng nhập
            </h2>
            <p className="text-xs text-[#D0C5AF]/60 mb-6">
              Vui lòng đăng nhập bằng tài khoản admin được cấp quyền.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[10px] font-heading tracking-[0.15em] uppercase text-[#D0C5AF]/70 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-sm text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
                  placeholder="admin@emerald-vault.vn"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[10px] font-heading tracking-[0.15em] uppercase text-[#D0C5AF]/70 mb-2"
                >
                  Mật khẩu
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-sm text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div
                  className="px-4 py-3 rounded-sm text-xs text-[#FFB4AB] border"
                  style={{
                    background: 'rgba(255, 180, 171, 0.08)',
                    borderColor: 'rgba(255, 180, 171, 0.3)',
                  }}
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#F2CA50',
                  color: '#0D1117',
                }}
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-[#D0C5AF]/50 hover:text-gold transition-colors"
            >
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-[10px] text-[#D0C5AF]/30 font-heading tracking-[0.1em] uppercase">
        © {new Date().getFullYear()} Emerald Vault — Internal use only
      </footer>
    </div>
  );
}
