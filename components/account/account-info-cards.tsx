import { ShieldCheck, Crown } from 'lucide-react';
import { formatVNDShort } from '@/lib/utils';
import type { ProfileRow } from '@/lib/supabase/types';
import type { CustomerLoyalty, LoyaltyTier } from '@/lib/gamification/types';
import { TIER_LABELS, TIER_THRESHOLDS } from '@/lib/gamification/rules';

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

function getNextTier(tier: LoyaltyTier): LoyaltyTier | null {
  switch (tier) {
    case 'BRONZE':
      return 'SILVER';
    case 'SILVER':
      return 'GOLD';
    case 'GOLD':
      return 'PLATINUM';
    default:
      return null;
  }
}

export interface AccountInfoCardsProps {
  profile?: Pick<ProfileRow, 'id' | 'created_at'> | null;
  loyalty?: CustomerLoyalty | null;
}

export function AccountInfoCards({ profile, loyalty }: AccountInfoCardsProps) {
  // Dynamic data từ loyalty (fallback BRONZE nếu null)
  const tier: LoyaltyTier = (loyalty?.tier as LoyaltyTier) ?? 'BRONZE';
  const ordersCount = loyalty?.orders_count ?? 0;
  const lifetimeValue = loyalty?.lifetime_value ?? 0;

  const tierLabel = TIER_LABELS[tier];
  const nextTier = getNextTier(tier);
  const currentThreshold = TIER_THRESHOLDS[tier];
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;

  // Progress dựa trên orders_count (tier thresholds theo orders_count)
  const progressPercent = nextThreshold
    ? Math.min(
        100,
        Math.max(
          0,
          ((ordersCount - currentThreshold.min) /
            (nextThreshold.min - currentThreshold.min)) *
            100
        )
      )
    : 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gold/20 bg-surface-emerald/30 p-6 shadow-card">
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
            <span className="inline-flex items-center gap-1.5 rounded border border-success/20 bg-surface-emerald/30 px-2 py-0.5 text-xs text-success">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-muted">Đơn hàng đã mua</span>
            <span className="text-sm font-semibold text-text-base">
              {ordersCount}
            </span>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-gold/40 bg-surface p-6 shadow-gold-glow">
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
              TIER {tier}
            </span>
            <span className="font-heading text-[10px] uppercase tracking-[0.2em] text-gold">
              {tierLabel}
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
                {formatVNDShort(lifetimeValue)}đ chi tiêu
              </span>
              <span className="text-[11px] text-gold">
                {nextThreshold
                  ? `Cần ${nextThreshold.min} đơn để lên ${TIER_LABELS[nextTier!].split(' ')[0]}`
                  : 'Hạng cao nhất!'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-2 rounded-md border border-gold/10 bg-surface-emerald/20 p-4 shadow-sm">
          <ShieldCheck className="h-4 w-5 text-gold" />
          <span className="font-heading text-[10px] text-text-muted">BẢO MẬT 2 LỚP</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-md border border-gold/10 bg-surface-emerald/20 p-4 shadow-sm">
          <Crown className="h-4 w-5 text-gold" />
          <span className="font-heading text-[10px] text-text-muted">QUYỀN LỢI VIP</span>
        </div>
      </div>
    </div>
  );
}
