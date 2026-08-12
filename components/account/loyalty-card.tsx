import { Trophy, Sparkles, TrendingUp, Crown } from 'lucide-react';
import { formatVNDShort } from '@/lib/utils';
import type { CustomerLoyalty, LoyaltyTier } from '@/lib/gamification/types';
import { TIER_LABELS, TIER_THRESHOLDS, getPointsRate } from '@/lib/gamification/rules';
import { DEFAULT_LOYALTY_CONFIG } from '@/lib/gamification/rules';

const TIER_STYLES: Record<LoyaltyTier, { color: string; border: string; bg: string; icon: string }> = {
  BRONZE: {
    color: 'text-amber-600',
    border: 'border-amber-600/30',
    bg: 'bg-amber-600/5',
    icon: '🥉',
  },
  SILVER: {
    color: 'text-gray-300',
    border: 'border-gray-300/30',
    bg: 'bg-gray-300/5',
    icon: '🥈',
  },
  GOLD: {
    color: 'text-gold',
    border: 'border-gold/40',
    bg: 'bg-gold/5',
    icon: '🥇',
  },
  PLATINUM: {
    color: 'text-purple-300',
    border: 'border-purple-300/40',
    bg: 'bg-purple-300/5',
    icon: '💎',
  },
};

function getNextTier(tier: LoyaltyTier): LoyaltyTier | null {
  switch (tier) {
    case 'BRONZE':
      return 'SILVER';
    case 'SILVER':
      return 'GOLD';
    case 'GOLD':
      return 'PLATINUM';
    default:
      return null; // PLATINUM = max
  }
}

export interface LoyaltyCardProps {
  loyalty: CustomerLoyalty | null;
}

export function LoyaltyCard({ loyalty }: LoyaltyCardProps) {
  // Fallback khi chưa có loyalty data
  const tier: LoyaltyTier = (loyalty?.tier as LoyaltyTier) ?? 'BRONZE';
  const totalPoints = loyalty?.total_points ?? 0;
  const lifetimePoints = loyalty?.lifetime_points ?? 0;
  const ordersCount = loyalty?.orders_count ?? 0;
  const lifetimeValue = loyalty?.lifetime_value ?? 0;

  const tierLabel = TIER_LABELS[tier];
  const pointsRate = getPointsRate(tier, DEFAULT_LOYALTY_CONFIG);
  const tierStyle = TIER_STYLES[tier];

  const nextTier = getNextTier(tier);
  const currentThreshold = TIER_THRESHOLDS[tier];
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
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
      {/* — Loyalty Tier Card — */}
      <div
        className={`relative overflow-hidden rounded-lg border ${tierStyle.border} ${tierStyle.bg} p-6 shadow-card`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'linear-gradient(90deg, rgba(242,202,80,0) 0%, rgba(242,202,80,0.1) 50%, rgba(242,202,80,0) 100%)',
          }}
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs uppercase tracking-wider text-gold">
              HẠNG THÀNH VIÊN
            </span>
            <Trophy className={`h-5 w-5 ${tierStyle.color}`} />
          </div>

          {/* Tier badge */}
          <div className="flex flex-col items-center gap-1 py-2">
            <span className="text-4xl">{tierStyle.icon}</span>
            <span
              className={`font-heading text-2xl font-bold ${tierStyle.color}`}
            >
              {tierLabel}
            </span>
          </div>

          {/* Progress to next tier */}
          {nextTier ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">
                  {ordersCount} đơn hàng
                </span>
                <span className={tierStyle.color}>
                  Cần {nextThreshold!.min} đơn để lên {TIER_LABELS[nextTier].split(' ')[0]}
                </span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-emerald">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-gold shadow-[0_0_8px_rgba(242,202,80,0.5)] transition-all duration-500"
                  style={{ width: progressPercent + '%' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-sm border border-gold/20 bg-gold/5 py-2">
              <Crown className="h-4 w-4 text-gold" />
              <span className="font-heading text-xs text-gold">
                HẠNG CAO NHẤT — CẢM ƠN BẠN!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* — Points Summary — */}
      <div className="rounded-lg border border-gold/20 bg-surface-emerald/30 p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between border-b border-gold/10 pb-2">
          <h3 className="font-heading text-sm text-gold">
            ĐIỂM THƯỞNG
          </h3>
          <Sparkles className="h-4 w-4 text-gold" />
        </div>
        <div className="flex flex-col gap-4">
          {/* Current points */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-muted">Điểm khả dụng</span>
            <span className="font-sans text-lg font-bold text-gold">
              {totalPoints.toLocaleString('vi-VN')}
              <span className="ml-1 text-xs font-normal text-text-muted">điểm</span>
            </span>
          </div>
          {/* Lifetime points */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-muted">Tổng điểm tích lũy</span>
            <span className="font-sans text-sm text-text-base">
              {lifetimePoints.toLocaleString('vi-VN')}
              <span className="ml-1 text-xs text-text-muted">điểm</span>
            </span>
          </div>
          {/* Points rate */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-muted">Tỷ lệ tích điểm</span>
            <span className="rounded-sm border border-gold/20 bg-gold/5 px-2 py-0.5 text-xs font-semibold text-gold">
              {pointsRate}% / đơn
            </span>
          </div>
        </div>
      </div>

      {/* — Stats Summary — */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 rounded-lg border border-gold/10 bg-surface-emerald/20 p-4">
          <TrendingUp className="h-4 w-4 text-gold" />
          <span className="font-heading text-xl font-bold text-text-base">
            {ordersCount}
          </span>
          <span className="font-heading text-[10px] uppercase tracking-wider text-text-muted">
            ĐƠN HÀNG
          </span>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-gold/10 bg-surface-emerald/20 p-4">
          <span className="text-xs text-gold">💎</span>
          <span className="font-heading text-xl font-bold text-text-base">
            {formatVNDShort(lifetimeValue)}
          </span>
          <span className="font-heading text-[10px] uppercase tracking-wider text-text-muted">
            TỔNG CHI TIÊU
          </span>
        </div>
      </div>

      {/* — How it works — */}
      <div className="rounded-lg border border-gold/10 bg-surface-emerald/20 p-5">
        <h4 className="mb-3 font-heading text-xs uppercase tracking-wider text-gold">
          CÁCH TÍCH ĐIỂM
        </h4>
        <ul className="flex flex-col gap-2 text-xs text-text-muted">
          <li className="flex items-start gap-2">
            <span className="text-gold">•</span>
            <span>
              Mỗi đơn hàng hoàn tất earns{' '}
              <span className="text-gold">{pointsRate}%</span> giá trị đơn (1 điểm = 1.000đ)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold">•</span>
            <span>
              Điểm dùng để giảm giá đơn tiếp theo (tối đa{' '}
              <span className="text-gold">{DEFAULT_LOYALTY_CONFIG.max_redemption_percent}%</span>{' '}
              giá trị đơn)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold">•</span>
            <span>
              Cần tối thiển{' '}
              <span className="text-gold">
                {DEFAULT_LOYALTY_CONFIG.min_redemption_points} điểm
              </span>{' '}
              để đổi
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}