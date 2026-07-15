'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!session);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
        setLoading(false);
        return;
      }
      await supabase.auth.signOut();
      setSuccess('Đã đặt lại mật khẩu thành công.');
      setPassword('');
      setConfirm('');
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
          <h2 className="font-heading text-xl font-bold text-text-base mb-1">Đặt lại mật khẩu</h2>
          <p className="text-xs text-text-muted/70 mb-6">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>

          {checking ? (
            <div className="text-xs text-text-muted/60 font-heading tracking-[0.1em]">
              Đang kiểm tra liên kết...
            </div>
          ) : !hasSession ? (
            <div className="space-y-4">
              <div
                role="alert"
                className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error"
              >
                Liên kết đã hết hạn. Vui lòng yêu cầu lại.
              </div>
              <Link
                href="/tai-khoan/quen-mat-khau"
                className="block text-center text-xs text-gold hover:underline"
              >
                ← Yêu cầu liên kết mới
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div
                role="status"
                className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-xs text-success"
              >
                {success}
              </div>
              <Link
                href="/tai-khoan/dang-nhap"
                className="block text-center text-xs text-gold hover:underline"
              >
                → Đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="mb-2 block text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/70">
                  Mật khẩu mới
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-[#4D4635] bg-[#1F1B13] px-4 py-3 text-sm text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:border-gold/50 focus:outline-none transition-colors disabled:opacity-50"
                  placeholder="Tối thiểu 8 ký tự"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="mb-2 block text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/70">
                  Xác nhận mật khẩu
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-[#4D4635] bg-[#1F1B13] px-4 py-3 text-sm text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:border-gold/50 focus:outline-none transition-colors disabled:opacity-50"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="md" disabled={loading} className="w-full">
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
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
