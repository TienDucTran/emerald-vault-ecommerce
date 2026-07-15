'use client';

import { useEffect, useState, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

const DEFAULT_NEXT = '/tai-khoan/ho-so';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || DEFAULT_NEXT;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        router.replace(nextParam);
        return;
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
    setMagicSent(false);

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (signInError) {
        setError('Email hoặc mật khẩu không đúng.');
        setLoading(false);
        return;
      }
      setPassword('');
      router.push(nextParam);
      router.refresh();
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    setMagicSent(false);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Vui lòng nhập email để nhận liên kết đăng nhập.');
      return;
    }
    setMagicLoading(true);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, next: nextParam }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error || 'Không thể gửi liên kết. Vui lòng thử lại.');
        setMagicLoading(false);
        return;
      }
      setMagicSent(true);
      setMagicLoading(false);
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setMagicLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-sm text-text-muted/60 font-heading tracking-[0.1em]">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center">
          <h1 className="font-heading text-2xl font-bold tracking-[0.15em] text-gold uppercase">
            Emerald Vault
          </h1>
          <p className="mt-1 text-[10px] font-heading tracking-[0.2em] text-text-muted/50 uppercase">
            Si Nhật Vintage
          </p>
        </Link>

        <div className="rounded-lg border border-gold/20 bg-surface-emerald/60 p-8 backdrop-blur-sm">
          <h2 className="font-heading text-xl font-bold text-text-base mb-1">Đăng nhập</h2>
          <p className="text-xs text-text-muted/70 mb-6">
            Đăng nhập để theo dõi đơn hàng, đồng bộ yêu thích và nhận ưu đãi.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/70">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || magicLoading}
                className="w-full rounded-md border border-[#4D4635] bg-[#1F1B13] px-4 py-3 text-sm text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:border-gold/50 focus:outline-none transition-colors disabled:opacity-50"
                placeholder="ban@email.com"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/70">
                  Mật khẩu
                </label>
                <Link
                  href="/tai-khoan/quen-mat-khau"
                  className="text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/70 hover:text-gold transition-colors"
                >
                  Quên?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || magicLoading}
                className="w-full rounded-md border border-[#4D4635] bg-[#1F1B13] px-4 py-3 text-sm text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:border-gold/50 focus:outline-none transition-colors disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
                {error}
              </div>
            )}

            {magicSent && (
              <div role="status" className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
                Đã gửi liên kết đăng nhập. Vui lòng kiểm tra email.
              </div>
            )}

            <Button type="submit" variant="primary" size="md" disabled={loading || magicLoading} className="w-full">
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gold/15" />
            <span className="text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/40">hoặc</span>
            <div className="h-px flex-1 bg-gold/15" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleMagicLink}
            disabled={loading || magicLoading}
            className="w-full"
          >
            {magicLoading ? 'Đang gửi...' : 'Đăng nhập bằng magic link'}
          </Button>

          <div className="mt-6 text-center text-xs text-text-muted/70">
            Chưa có tài khoản?{' '}
            <Link href="/tai-khoan/dang-ky" className="text-gold hover:underline">
              Đăng ký
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] font-heading tracking-[0.1em] text-text-muted/30 uppercase">
          © Emerald Vault
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-sm text-text-muted/60 font-heading tracking-[0.1em]">
          Đang tải...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
