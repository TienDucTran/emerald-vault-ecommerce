import { ShieldCheck, Crown } from 'lucide-react';
import type { ProfileRow } from '@/lib/supabase/types';

const MOCK_TIER = {
  tier: 'SSS',
  tier_name: 'COLLECTOR GOLD',
  current_spend: 320_000_000,
  next_tier_threshold: 500_000_000,
};

function formatVNDShort(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'tỷ';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(0) + 'tr';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'k';
  return amount + 'đ';
}

function formatJoinDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export interface AccountInfoCardsProps {
  profile?: Pick<ProfileRow, 'id' | 'created_at'> | null;
}

export function AccountInfoCards({ profile }: AccountInfoCardsProps) {
  const progressPercent = Math.min(
    100,
    (MOCK_TIER.current_spend / MOCK_TIER.next_tier_threshold) * 100
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gold/20 bg-surface-emerald/30 p-6">
        <h3 className="mb-6 border-b border-gold/10 pb-2 font-heading text-sm text-gold">
          THÔNG TIN TÀI KHOẢN
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-muted">Mã thành viên</span>
            <span className="font-mono text-sm text-gold-champagne">
              {profile?.id
                ? `EV-USER-${profile.id.slice(-6).toUpperCase()}`
                : 'EV-USER-000000'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-muted">Ngày gia nhập</span>
            <span className="text-sm text-text-base">
              {profile?.created_at ? formatJoinDate(profile.created_at) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-muted">Trạng thái</span>
            <span className="inline-flex items-center gap-1.5 rounded border border-[#B2CDBC]/20 bg-[#344C3F]/30 px-2 py-0.5 text-xs text-[#B2CDBC]">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-gold/40 bg-surface p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'linear-gradient(90deg, rgba(242,202,80,0) 0%, rgba(242,202,80,0.2) 50%, rgba(242,202,80,0) 100%)',
          }}
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs text-gold">HẠNG THÀNH VIÊN</span>
            <Crown className="h-5 w-5 text-gold" />
          </div>
          <div className="flex flex-col items-center gap-1 py-4">
            <span className="font-heading text-[40px] font-bold leading-none text-gold-champagne">
              TIER {MOCK_TIER.tier}
            </span>
            <span className="font-heading text-[10px] uppercase tracking-[0.2em] text-gold">
              {MOCK_TIER.tier_name}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface-emerald">
              <div
                className="absolute inset-0 rounded-full bg-gradient-gold shadow-[0_0_8px_rgba(242,202,80,0.5)]"
                style={{ width: progressPercent + '%' }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                {formatVNDShort(MOCK_TIER.current_spend)}đ
              </span>
              <span className="text-[11px] text-gold">
                {formatVNDShort(MOCK_TIER.next_tier_threshold)}đ để lên hạng
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-2 rounded-md border border-gold/10 bg-surface-emerald/20 p-4">
          <ShieldCheck className="h-4 w-5 text-gold" />
          <span className="font-heading text-[10px] text-text-muted">BẢO MậT 2 LỚP</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-md border border-gold/10 bg-surface-emerald/20 p-4">
          <Crown className="h-4 w-5 text-gold" />
          <span className="font-heading text-[10px] text-text-muted">QUYỀN LỢI VIP</span>
        </div>
      </div>
    </div>
  );
}
