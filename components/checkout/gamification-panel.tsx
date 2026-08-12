'use client';

/**
 * GamificationPanel — hiển thị BOGO progress + freeship + loyalty points
 * Đặt trong CheckoutSummary, render dựa trên data từ /api/gamification/check
 */

import { useEffect, useState } from 'react';
import { Gift, Truck, Sparkles, Trophy } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import { useCheckoutAddressStore } from '@/lib/store/checkout-address';
import { formatVND } from '@/lib/utils';
import type { GamificationCheck } from '@/lib/gamification/types';
import { BOGO_RULE_LABELS } from '@/lib/gamification/rules';

export function GamificationPanel() {
  const activeItems = useCartStore((s) =>
    s.items.filter((i) => Date.now() < i.expiresAt)
  );
  const province = useCheckoutAddressStore((s) => s.province);
  const district = useCheckoutAddressStore((s) => s.district);
  const [data, setData] = useState<GamificationCheck | null>(null);

  useEffect(() => {
    if (activeItems.length === 0) {
      setData(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          const res = await fetch('/api/gamification/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: activeItems.map((i) => ({
                productId: i.product.id,
                price: i.product.price,
                quality_tier: i.product.quality_tier,
              })),
              address: { province, district },
            }),
          });
          const json = await res.json();
          if (!cancelled && json.ok) {
            setData(json.data);
          }
        } catch {
          // Non-fatal — checkout vẫn hoạt động bình thường
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItems.length, province, district]);

  if (!data) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* — BOGO Progress (Mua X Tặng Y) — */}
      {data.bogo.next_goal && !data.bogo.best_achieved && (
        <BogoProgress
          label={BOGO_RULE_LABELS[data.bogo.next_goal.rule_code] ?? data.bogo.next_goal.rule_code}
          current={data.bogo.next_goal.trigger_value - data.bogo.next_goal.remaining}
          target={data.bogo.next_goal.trigger_value}
        />
      )}

      {/* — BOGO Achieved (đã đạt) — */}
      {data.bogo.best_achieved && (
        <BogoAchieved
          label={BOGO_RULE_LABELS[data.bogo.best_achieved.rule_code] ?? data.bogo.best_achieved.rule_code}
          giftCount={data.bogo.best_achieved.gift_count}
          voucherAmount={data.bogo.best_achieved.voucher_amount}
          nextGoal={data.bogo.next_goal}
        />
      )}

      {/* — Freeship Progress — */}
      {!data.freeship.is_free && (
        <FreeshipProgress
          zoneLabel={data.freeship.zone_label}
          remainingItems={data.freeship.remaining_items}
          remainingValue={data.freeship.remaining_value}
          itemCountRequired={data.freeship.item_count_required}
          valueRequired={data.freeship.value_required}
        />
      )}

      {/* — Freeship Achieved — */}
      {data.freeship.is_free && (
        <div className="flex items-center gap-2 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs">
          <Truck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="font-heading uppercase tracking-wider text-emerald-400">
            FREESHIP — {data.freeship.zone_label}
          </span>
        </div>
      )}

      {/* — Loyalty Points — */}
      {data.loyalty && (
        <LoyaltyBadge
          tierLabel={data.loyalty.tier_label}
          pointsEarned={data.loyalty.points_earned}
          totalPoints={data.loyalty.total_points}
          pointsRate={data.loyalty.points_rate}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function BogoProgress({ label, current, target }: { label: string; current: number; target: number }) {
  const percent = Math.min(100, (current / target) * 100);
  return (
    <div className="rounded-sm border border-gold/30 bg-gold/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Gift className="h-4 w-4 shrink-0 text-gold" />
        <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-gold">
          {label}
        </span>
      </div>
      {/* Progress bar */}
      <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-background/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-champagne transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>{current}/{target} món (SS/S)</span>
        <span className="text-gold">Mua thêm {target - current} → FREE!</span>
      </div>
    </div>
  );
}

function BogoAchieved({
  label,
  giftCount,
  voucherAmount,
  nextGoal,
}: {
  label: string;
  giftCount: number;
  voucherAmount: number;
  nextGoal: { rule_code: string; trigger_value: number; remaining: number } | null;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-gold/50 bg-gradient-to-r from-gold/10 to-gold-champagne/5 p-3">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 shrink-0 text-gold" />
        <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-gold">
          🎉 ĐẠT: {label}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-text-base">
        <span>🎁 Tặng {giftCount} món FREE</span>
        {voucherAmount > 0 && (
          <span className="text-gold">+ Voucher {formatVND(voucherAmount)}</span>
        )}
      </div>
      {nextGoal && (
        <div className="mt-1 border-t border-gold/20 pt-1.5 text-[10px] text-text-muted">
          Mua thêm {nextGoal.remaining} món để đạt{' '}
          <span className="text-gold">{BOGO_RULE_LABELS[nextGoal.rule_code] ?? nextGoal.rule_code}</span>
        </div>
      )}
    </div>
  );
}

function FreeshipProgress({
  zoneLabel,
  remainingItems,
  remainingValue,
  itemCountRequired,
  valueRequired,
}: {
  zoneLabel: string;
  remainingItems: number;
  remainingValue: number;
  itemCountRequired: number;
  valueRequired: number;
}) {
  const percent = Math.max(0, 100 - (remainingItems / itemCountRequired) * 100);
  return (
    <div className="rounded-sm border border-blue-400/30 bg-blue-500/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Truck className="h-4 w-4 shrink-0 text-blue-400" />
        <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-blue-400">
          FREESHIP — {zoneLabel}
        </span>
      </div>
      <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-background/50">
        <div
          className="h-full rounded-full bg-blue-400 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>Cần {itemCountRequired} món hoặc ≥ {formatVND(valueRequired)}</span>
        <span className="text-blue-400">
          {remainingItems > 0 ? `Còn thiếu ${remainingItems} món` : `Còn thiếu ${formatVND(remainingValue)}`}
        </span>
      </div>
    </div>
  );
}

function LoyaltyBadge({
  tierLabel,
  pointsEarned,
  totalPoints,
  pointsRate,
}: {
  tierLabel: string;
  pointsEarned: number;
  totalPoints: number;
  pointsRate: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-purple-400/30 bg-purple-500/5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 shrink-0 text-purple-400" />
        <div className="flex flex-col">
          <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-purple-400">
            {tierLabel}
          </span>
          <span className="text-[10px] text-text-muted">
            Điểm: {totalPoints.toLocaleString('vi-VN')} ({pointsRate}%)
          </span>
        </div>
      </div>
      {pointsEarned > 0 && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-gold">
          <Sparkles className="h-3 w-3" />
          +{pointsEarned} điểm
        </div>
      )}
    </div>
  );
}