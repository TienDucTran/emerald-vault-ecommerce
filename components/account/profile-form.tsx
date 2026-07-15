'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MOCK_PROFILE = {
  full_name: 'Nguyễn Văn A',
  phone: '0901 234 567',
  email: 'nguyen.vana@exclusive.com',
  date_of_birth: '1990-01-01',
  gender: 'male' as 'male' | 'female' | 'other' | null,
  marketing_opt_in: true,
  avatar_url: null,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  return parts[parts.length - 1].charAt(0).toUpperCase();
}

const inputClass = cn(
  'w-full rounded-md border bg-background px-4 py-3 text-base text-text-base',
  'border-gold/30 placeholder:text-text-disabled/50',
  'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/10',
  'transition-colors'
);

const labelClass = 'font-heading text-[10px] font-normal uppercase tracking-[0.05em] text-[#99907C]';

export function ProfileForm() {
  const [form, setForm] = useState(MOCK_PROFILE);
  const handleChange = (field: keyof typeof MOCK_PROFILE, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile saved:', form);
  };
  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gold/20 bg-surface p-8 shadow-card">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-xl border-2 border-gold bg-background">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt={form.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-bold text-gold">{getInitials(form.full_name)}</div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm">Đổi ảnh</Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="full_name" className={labelClass}>HỌ VÀ TÊN</label>
          <input id="full_name" type="text" value={form.full_name} onChange={(e) => handleChange('full_name', e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className={labelClass}>SỐ ĐIỆN THOẠI</label>
          <input id="phone" type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>EMAIL</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input id="email" type="email" value={form.email} readOnly className={cn(inputClass, 'bg-surface-emeraldAlt/50 text-text-muted cursor-not-allowed')} />
          <button type="button" className="shrink-0 font-heading text-[10px] uppercase tracking-wider text-gold transition-colors hover:text-gold-champagne sm:ml-2 sm:self-center">Thay đổi</button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="date_of_birth" className={labelClass}>NGÀY SINH</label>
          <input id="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <span className={labelClass}>GIỚI TÍNH</span>
          <div className="flex items-center gap-6 py-3">
            {(['male', 'female', 'other'] as const).map((g) => (
              <label key={g} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={() => handleChange('gender', g)}
                  className={cn('h-[18px] w-[18px] appearance-none rounded-full border transition-colors', form.gender === g ? 'border-gold bg-gold' : 'border-[#4D4635] bg-background')} />
                <span className="text-base text-text-muted">{g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-gold/10 pt-6">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-base text-text-base">Đăng ký nhận bản tin VIP</p>
            <p className="mt-1 text-xs text-text-muted">Nhận thông tin sớm nhất về các tuyệt phẩm giới hạn và sự kiện đấu giá.</p>
          </div>
          <button type="button" role="switch" aria-checked={form.marketing_opt_in} onClick={() => handleChange('marketing_opt_in', !form.marketing_opt_in)}
            className={cn('relative h-5 w-10 shrink-0 rounded-full transition-colors', form.marketing_opt_in ? 'bg-gold' : 'bg-[#4D4635]')}>
            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', form.marketing_opt_in ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
        </label>
      </div>
      <div className="mt-6 pt-6">
        <Button type="submit" variant="gold" className="px-12 py-4 text-base">LƯU THAY ĐỔI</Button>
      </div>
    </form>
  );
}
