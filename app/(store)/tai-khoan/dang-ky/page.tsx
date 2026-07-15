                                                                                                                                                                                                                                                                                                                                                                    'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

const SITE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) ||
  (typeof window !== 'undefined' ? window.location.origin : '');

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const name = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.replace(/[\s.-]/g, '');

    if (name.length < 2 || name.length > 120) {
      setError('Họ và tên phải từ 2 đến 120 ký tự.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    if (!PHONE_RE.test(trimmedPhone)) {
      setError('Số điện thoại không hợp lệ (VD: 0912345678).');
      return;
    }
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
      const emailRedirectTo = `${SITE_URL}/tai-khoan/ho-so`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: name, phone: trimmedPhone },
          emailRedirectTo,
        },
      });

      if (signUpError) {
        setError(
          signUpError.message.includes('already registered')
            ? 'Email này đã được đăng ký.'
            : signUpError.message || 'Đăng ký thất bại. Vui lòng thử lại.'
        );
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push('/tai-khoan/ho-so');
        router.refresh();
        return;
      }

      setInfo('Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.');
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
          <h2 className="font-heading text-xl font-bold text-text-base mb-1">Tạo tài khoản</h2>
          <p className="text-xs text-text-muted/70 mb-6">
            Đăng ký để lưu đơn hàng, yêu thích và địa chỉ giao hàng.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/70">
                Họ và tên
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-[#4D4635] bg-[#1F1B13] px-4 py-3 text-sm text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:border-gold/50 focus:outline-none transition-colors disabled:opacity-50"
                placeholder="Nguyễn Văn A"
              />
            </div>

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

            <div>
              <label htmlFor="phone" className="mb-2 block text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/70">
                Số điện thoại
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-[#4D4635] bg-[#1F1B13] px-4 py-3 text-sm text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:border-gold/50 focus:outline-none transition-colors disabled:opacity-50"
                placeholder="0912345678"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[10px] font-heading tracking-[0.15em] uppercase text-text-muted/70">
                Mật khẩu
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
                placeholder="Nhập lại mật khẩu"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
                {error}
              </div>
            )}

            {info && (
              <div role="status" className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
                {info}
              </div>
            )}

            <Button type="submit" variant="primary" size="md" disabled={loading} className="w-full">
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-text-muted/70">
            Đã có tài khoản?{' '}
            <Link href="/tai-khoan/dang-nhap" className="text-gold hover:underline">
              Đăng nhập
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
