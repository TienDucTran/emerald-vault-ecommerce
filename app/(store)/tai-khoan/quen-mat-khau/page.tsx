'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Không thể gửi email. Vui lòng thử lại.');
        setLoading(false);
        return;
      }
      setSuccess(
        'Đã gửi email. Vui lòng kiểm tra hộp thư (kể cả thư mục spam).'
      );
      setLoading(false);
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setLoading(false);
    }
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
          <h2 className="font-heading text-xl font-bold text-text-base mb-1">Quên mật khẩu</h2>
          <p className="text-xs text-text-muted/70 mb-6">
            Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>

          {success ? (
            <div
              role="status"
              className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-xs text-success"
            >
              {success}
            </div>
          ) : (
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
                  disabled={loading}
                  className="w-full rounded-md border border-[#4D4635] bg-[#1F1B13] px-4 py-3 text-sm text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:border-gold/50 focus:outline-none transition-colors disabled:opacity-50"
                  placeholder="ban@email.com"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="md" disabled={loading} className="w-full">
                {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-text-muted/70">
            <Link href="/tai-khoan/dang-nhap" className="text-gold hover:underline">
              ← Quay lại đăng nhập
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
