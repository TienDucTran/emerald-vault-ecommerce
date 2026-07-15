'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ProfileFormData {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | null;
  marketing_opt_in: boolean;
  avatar_url: string | null;
}

export interface ProfileFormProps {
  initialData: ProfileFormData;
  userEmail: string;
}

const inputClass = cn(
  'w-full rounded-md border bg-background px-4 py-3 text-base text-text-base',
  'border-gold/30 placeholder:text-text-disabled/50',
  'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/10',
  'transition-colors'
);

const labelClass =
  'font-heading text-[10px] font-normal uppercase tracking-[0.05em] text-[#99907C]';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  return parts[parts.length - 1].charAt(0).toUpperCase();
}

export function ProfileForm({ initialData, userEmail }: ProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = <K extends keyof ProfileFormData>(
    field: K,
    value: ProfileFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(json?.message ?? `HTTP ${res.status}`);
      }
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể lưu thay đổi. Vui lòng thử lại.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gold/20 bg-surface p-8 shadow-card"
    >
      <div className="mb-8 flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-xl border-2 border-gold bg-background">
          {form.avatar_url ? (
            <img
              src={form.avatar_url}
              alt={form.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-bold text-gold">
              {getInitials(form.full_name || userEmail)}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled>
          Đổi ảnh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="full_name" className={labelClass}>
            HỌ VÀ TÊN
          </label>
          <input
            id="full_name"
            type="text"
            value={form.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            required
            className={inputClass}
            disabled={saving}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className={labelClass}>
            SỐ ĐIỆN THOẠI
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={inputClass}
            disabled={saving}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>
          EMAIL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="email"
            type="email"
            value={userEmail}
            readOnly
            className={cn(
              inputClass,
              'bg-surface-emeraldAlt/50 text-text-muted cursor-not-allowed'
            )}
          />
          <button
            type="button"
            disabled
            className="shrink-0 font-heading text-[10px] uppercase tracking-wider text-text-disabled/60 sm:ml-2 sm:self-center"
          >
            Thay đổi
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="date_of_birth" className={labelClass}>
            NGÀY SINH
          </label>
          <input
            id="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
            className={inputClass}
            disabled
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className={labelClass}>GIỚI TÍNH</span>
          <div className="flex items-center gap-6 py-3">
            {(['male', 'female', 'other'] as const).map((g) => (
              <label
                key={g}
                className="flex cursor-not-allowed items-center gap-2 opacity-60"
              >
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={form.gender === g}
                  disabled
                  onChange={() => handleChange('gender', g)}
                  className={cn(
                    'h-[18px] w-[18px] appearance-none rounded-full border transition-colors',
                    form.gender === g
                      ? 'border-gold bg-gold'
                      : 'border-[#4D4635] bg-background'
                  )}
                />
                <span className="text-base text-text-muted">
                  {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-gold/10 pt-6">
        <label className="flex cursor-not-allowed items-center justify-between gap-4 opacity-60">
          <div className="flex-1">
            <p className="text-base text-text-base">
              Đăng ký nhận bản tin VIP
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Tính năng sẽ sớm được kích hoạt.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.marketing_opt_in}
            disabled
            onClick={() =>
              handleChange('marketing_opt_in', !form.marketing_opt_in)
            }
            className={cn(
              'relative h-5 w-10 shrink-0 rounded-full transition-colors',
              form.marketing_opt_in ? 'bg-gold' : 'bg-[#4D4635]'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                form.marketing_opt_in ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-error/30 bg-error/10 px-4 py-2 text-sm text-error"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="mt-6 rounded-md border border-success/30 bg-success/10 px-4 py-2 text-sm text-success"
        >
          Đã lưu thay đổi.
        </p>
      ) : null}

      <div className="mt-6 pt-6">
        <Button
          type="submit"
          variant="gold"
          className="px-12 py-4 text-base"
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          LƯU THAY ĐỔI
        </Button>
      </div>
    </form>
  );
}
