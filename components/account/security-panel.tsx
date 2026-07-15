'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, Lock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type SectionState = 'idle' | 'loading' | 'success' | 'error';

const sectionClass = cn(
  'rounded-md border border-gold/20 bg-surface-emerald p-6'
);

const inputClass = cn(
  'w-full rounded-md border bg-background px-4 py-3 text-base text-text-base',
  'border-gold/30 placeholder:text-text-disabled/50',
  'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/10',
  'transition-colors'
);

const labelClass =
  'font-heading text-[10px] font-normal uppercase tracking-[0.05em] text-[#99907C]';

function Banner({
  kind,
  message,
}: {
  kind: 'success' | 'error';
  message: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        'mt-4 flex items-start gap-2 rounded-md border px-4 py-3 text-sm',
        kind === 'success'
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-error/30 bg-error/10 text-error'
      )}
    >
      {kind === 'success' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

export function SecurityPanel() {
  const router = useRouter();
  const supabase = createClient();

  return (
    <div className="flex flex-col gap-6">
      <ChangePasswordSection supabase={supabase} />
      <LogoutAllSection supabase={supabase} onAfter={() => router.push('/tai-khoan/dang-nhap')} />
      <DeleteAccountSection />
    </div>
  );
}

function ChangePasswordSection({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<SectionState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (next.length < 8) {
      setState('error');
      setMessage('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (next !== confirm) {
      setState('error');
      setMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (current === next) {
      setState('error');
      setMessage('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setState('loading');
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) {
        throw new Error('Không lấy được email người dùng hiện tại.');
      }
      const verify = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (verify.error) {
        throw new Error('Mật khẩu hiện tại không đúng.');
      }
      const update = await supabase.auth.updateUser({ password: next });
      if (update.error) {
        throw new Error(update.error.message);
      }
      setState('success');
      setMessage('Đổi mật khẩu thành công.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setState('error');
      setMessage(
        err instanceof Error ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại.'
      );
    }
  };

  return (
    <section className={sectionClass}>
      <header className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-gold" />
        <h2 className="font-heading text-lg font-bold text-text-base">
          Đổi mật khẩu
        </h2>
      </header>
      <p className="mt-1 text-sm text-text-muted">
        Mật khẩu mới phải có ít nhất 8 ký tự. Nên dùng kết hợp chữ, số và ký tự
        đặc biệt.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="current_password" className={labelClass}>
            MẬT KHẨU HIỆN TẠI
          </label>
          <input
            id="current_password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            className={inputClass}
            disabled={state === 'loading'}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="new_password" className={labelClass}>
              MẬT KHẨU MỚI
            </label>
            <input
              id="new_password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              disabled={state === 'loading'}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm_password" className={labelClass}>
              XÁC NHẬN MẬT KHẨU
            </label>
            <input
              id="confirm_password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              disabled={state === 'loading'}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={state === 'loading'}
          >
            {state === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Đổi mật khẩu
          </Button>
        </div>
        <Banner
          kind={state === 'success' ? 'success' : 'error'}
          message={state === 'idle' || state === 'loading' ? '' : message ?? ''}
        />
      </form>
    </section>
  );
}

function LogoutAllSection({
  supabase,
  onAfter,
}: {
  supabase: ReturnType<typeof createClient>;
  onAfter: () => void;
}) {
  const [state, setState] = useState<SectionState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleLogoutAll = async () => {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setState('loading');
    setMessage(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw new Error(error.message);
      setState('success');
      setMessage('Đã đăng xuất khỏi tất cả thiết bị.');
      window.setTimeout(() => onAfter(), 500);
    } catch (err) {
      setState('error');
      setMessage(
        err instanceof Error
          ? err.message
          : 'Đăng xuất thất bại, vui lòng thử lại.'
      );
    }
  };

  return (
    <section className={sectionClass}>
      <header className="flex items-center gap-2">
        <LogOut className="h-4 w-4 text-gold" />
        <h2 className="font-heading text-lg font-bold text-text-base">
          Đăng xuất khỏi tất cả thiết bị
        </h2>
      </header>
      <p className="mt-1 text-sm text-text-muted">
        Đăng xuất khỏi mọi thiết bị đang đăng nhập tài khoản này. Bạn sẽ cần
        đăng nhập lại trên từng thiết bị.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        {confirming ? (
          <>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleLogoutAll}
              disabled={state === 'loading'}
              className="bg-error text-white hover:bg-error/90"
            >
              {state === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Xác nhận đăng xuất tất cả?
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setConfirming(false)}
              disabled={state === 'loading'}
            >
              Huỷ
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleLogoutAll}
            disabled={state === 'loading'}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất tất cả
          </Button>
        )}
      </div>
      <Banner
        kind={state === 'success' ? 'success' : 'error'}
        message={state === 'idle' || state === 'loading' ? '' : message ?? ''}
      />
    </section>
  );
}

function DeleteAccountSection() {
  const [showContact, setShowContact] = useState(false);

  return (
    <section
      className={cn(
        sectionClass,
        'border-error/30'
      )}
    >
      <header className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-error" />
        <h2 className="font-heading text-lg font-bold text-text-base">
          Xoá tài khoản
        </h2>
      </header>
      <p className="mt-1 text-sm text-text-muted">
        Việc xoá tài khoản là không thể hoàn tác. Toàn bộ đơn hàng, địa chỉ,
        đánh giá và danh sách yêu thích của bạn sẽ bị xoá vĩnh viễn.
      </p>

      {!showContact ? (
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setShowContact(true)}
            className="border-error/50 text-error hover:bg-error/10 hover:border-error"
          >
            Xoá tài khoản
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2 rounded-md border border-error/30 bg-error/5 p-4 text-sm text-text-base">
          <p className="font-medium text-error">
            Tính năng xoá tài khoản hiện chưa khả dụng trên web.
          </p>
          <p className="text-text-muted">
            Vui lòng liên hệ{' '}
            <a
              href="mailto:support@emerald-vault.vn"
              className="font-medium text-gold underline-offset-4 hover:underline"
            >
              support@emerald-vault.vn
            </a>{' '}
            hoặc hotline{' '}
            <span className="font-medium text-gold">0901 234 567</span> để được
            hỗ trợ xoá tài khoản. Chúng tôi sẽ phản hồi trong vòng 24 giờ làm
            việc.
          </p>
        </div>
      )}
    </section>
  );
}
