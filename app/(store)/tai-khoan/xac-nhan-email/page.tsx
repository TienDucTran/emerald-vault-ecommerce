'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast/toast-store';

const COUNTDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email')?.trim() || '';

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [hasEnv, setHasEnv] = useState(true);

  // Detect supabase env presence to gracefully disable resend when misconfigured.
  useEffect(() => {
    const supabase = createClient();
    // createClient() reads NEXT_PUBLIC_SUPABASE_URL/ANON_KEY at module load; if missing,
    // subsequent auth calls throw. Probe by checking env via process on client.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setHasEnv(Boolean(url && key));
    // supabase instance retained for resend call below
    void supabase;
  }, []);

  // Countdown ticker for the resend button.
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleResend() {
    if (!email) {
      toast.error('Không tìm thấy email để gửi lại.', {
        description: 'Vui lòng quay lại trang đăng ký và thử lại.',
      });
      return;
    }
    if (!hasEnv) {
      toast.error('Dịch vụ xác thực chưa được cấu hình.', {
        description: 'Vui lòng liên hệ hỗ trợ.',
      });
      return;
    }

    setSending(true);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/tai-khoan/ho-so`,
        },
      });

      if (resendError) {
        toast.error('Không thể gửi lại email.', {
          description: resendError.message || 'Vui lòng thử lại sau ít phút.',
        });
        setSending(false);
        return;
      }

      toast.success('Đã gửi lại email xác nhận.', {
        description: 'Vui lòng kiểm tra hộp thư (kể cả thư mục spam).',
      });
      setCountdown(COUNTDOWN_SECONDS);
      setSending(false);
    } catch {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
      setSending(false);
    }
  }

  const canResend = countdown <= 0 && !sending && hasEnv;

  return (
    <div className="shadow-card rounded-lg border border-gold/20 bg-surface-emerald/60 p-8 backdrop-blur-sm">
      <div className="mb-4 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-background/60">
          <Mail className="h-6 w-6 text-gold" aria-hidden />
        </div>
      </div>

      <h2 className="font-heading text-xl font-bold text-text-base mb-1 text-center">
        Xác nhận email
      </h2>
      <p className="text-xs text-text-muted/70 mb-6 text-center">
        {email ? (
          <>
            Chúng tôi đã gửi email xác nhận tới{' '}
            <span className="text-text-base font-medium break-all">{email}</span>.
            Vui lòng click link trong email để kích hoạt tài khoản.
          </>
        ) : (
          <>
            Chúng tôi đã gửi email xác nhận tới địa chỉ bạn đăng ký. Vui lòng click link
            trong email để kích hoạt tài khoản.
          </>
        )}
      </p>

      <div className="rounded-md border border-gold/20 bg-background/40 px-4 py-3 text-[11px] text-text-muted/80 space-y-1.5">
        <p className="font-heading tracking-[0.1em] uppercase text-text-muted/60">
          Lưu ý
        </p>
        <p>• Kiểm tra cả hộp thư spam/quảng cáo.</p>
        <p>• Link xác nhận có thời hạn, vui lòng xác nhận sớm.</p>
        <p>• Sau khi xác nhận, bạn có thể đăng nhập bình thường.</p>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleResend}
          disabled={!canResend}
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Đang gửi...
            </>
          ) : countdown > 0 ? (
            `Gửi lại email (${countdown}s)`
          ) : (
            'Gửi lại email'
          )}
        </Button>

        {!hasEnv ? (
          <p role="alert" className="mt-3 text-center text-[11px] text-error/80">
            Dịch vụ xác thực chưa được cấu hình. Vui lòng liên hệ hỗ trợ.
          </p>
        ) : null}
      </div>

      <div className="mt-6 text-center text-xs text-text-muted/70">
        <Link href="/tai-khoan/dang-nhap" className="text-gold hover:underline">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
          <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </Link>

        <Suspense
          fallback={
            <div className="shadow-card rounded-lg border border-gold/20 bg-surface-emerald/60 p-8 backdrop-blur-sm text-center text-xs text-text-muted/60 font-heading tracking-[0.1em]">
              Đang tải...
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>

        <p className="mt-6 text-center text-[10px] font-heading tracking-[0.1em] text-text-muted/30 uppercase">
          © Emerald Vault
        </p>
      </div>
    </main>
  );
}
