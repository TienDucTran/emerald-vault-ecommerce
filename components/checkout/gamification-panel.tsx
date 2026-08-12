'use client';

/**
 * GamificationPanel — hiển thị BOGO progress + freeship + loyalty points
 * Đặt trong CheckoutSummary, render dựa trên data từ /api/gamification/check
 */

import { useEffect, useState } from 'react';
import { Gift, Truck, Sparkles, Trophy, Check } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import { useCheckoutAddressStore } from '@/lib/store/checkout-address';
import { useGiftSelectionStore } from '@/lib/store/gift-selection';
import { formatVND } from '@/lib/utils';
import type { GamificationCheck, GiftProductChoice } from '@/lib/gamification/types';
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
  return <GamificationPanelInner data={data} />;
}

/**
 * Inner — tách ra để hooks (gift selection sync) chạy sau khi data đã có.
 * Sync useGiftSelectionStore với best_achieved từ server:
 *  - Khi best_achieved đổi rule, giữ các quà đã chọn nếu vẫn còn trong pool, drop phần còn lại,
 *    cập nhật ruleCode, clamp về gift_count.
 *  - Khi không còn best_achieved (cart không đủ điều kiện) → clear toàn bộ.
 */
function GamificationPanelInner({ data }: { data: GamificationCheck }) {
  const setGifts = useGiftSelectionStore((s) => s.setGifts);
  const clearGifts = useGiftSelectionStore((s) => s.clear);
  const selectedGifts = useGiftSelectionStore((s) => s.selectedGifts);

  // Pool id signature — dùng làm dep cho sync effect (extract ra để lint check được)
  const poolSignature = data.bogo.best_achieved?.gift_products?.map((p) => p.product_id).join(',') ?? '';

  useEffect(() => {
    const best = data.bogo.best_achieved;
    if (!best || best.gift_products.length === 0) {
      if (useGiftSelectionStore.getState().selectedGifts.length > 0) clearGifts();
      return;
    }
    const poolIds = new Set(best.gift_products.map((p) => p.product_id));
    const kept = selectedGifts
      .filter((g) => poolIds.has(g.product_id))
      .slice(0, best.gift_count);
    setGifts(kept, best.rule_code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.bogo.best_achieved?.rule_code,
    data.bogo.best_achieved?.gift_count,
    poolSignature,
  ]);

  const best = data.bogo.best_achieved;

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

      {/* — Gift Product Picker — hiển thị khi đạt BOGO + pool có sản phẩm — */}
      {best && best.gift_products.length > 0 && (
        <GiftProductPicker
          giftProducts={best.gift_products}
          giftCount={best.gift_count}
          ruleCode={best.rule_code}
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

/**
 * GiftProductPicker — UI chọn quà miễn phí khi user đạt BOGO.
 * User click để toggle chọn, tối đa `giftCount` món. State lưu vào useGiftSelectionStore
 * và được CheckoutForm gửi kèm khi submit order (server validate lại chống fraud).
 */
function GiftProductPicker({
  giftProducts,
  giftCount,
}: {
  giftProducts: GiftProductChoice[];
  giftCount: number;
  ruleCode: string;
}) {
  const selectedGifts = useGiftSelectionStore((s) => s.selectedGifts);
  const toggleGift = useGiftSelectionStore((s) => s.toggleGift);

  const selectedIds = new Set(selectedGifts.map((g) => g.product_id));
  const remaining = Math.max(0, giftCount - selectedGifts.length);

  return (
    <div className="rounded-sm border border-gold/40 bg-gradient-to-b from-gold/10 to-transparent p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 shrink-0 text-gold" />
          <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-gold">
            Chọn {giftCount} quà miễn phí
          </span>
        </div>
        <span className={`text-[10px] font-bold ${remaining === 0 ? 'text-gold' : 'text-text-muted'}`}>
          {selectedGifts.length}/{giftCount} đã chọn
        </span>
      </div>

      {remaining > 0 && (
        <p className="mb-2 text-[10px] text-text-muted">
          Còn <span className="text-gold">{remaining}</span> quà để chọn — bấm vào món quà bạn thích bên dưới.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {giftProducts.map((p) => {
          const isSelected = selectedIds.has(p.product_id);
          const outOfStock = p.stock === 0;
          const disabled = !isSelected && remaining === 0;
          return (
            <button
              key={p.product_id}
              type="button"
              disabled={disabled || outOfStock}
              onClick={() => toggleGift(p, giftCount)}
              className={`group relative flex flex-col gap-1.5 rounded border p-2 text-left transition-all ${
                isSelected
                  ? 'border-gold bg-gold/15'
                  : outOfStock
                    ? 'border-[#4D4635]/30 bg-black/20 opacity-40'
                    : disabled
                      ? 'border-[#4D4635]/30 bg-black/20 opacity-50'
                      : 'border-[#4D4635]/40 bg-black/20 hover:border-gold/50 hover:bg-gold/5'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.product_image}
                alt={p.product_title}
                className="h-16 w-full rounded object-cover"
              />
              <div className="flex flex-col gap-0.5">
                <span className="line-clamp-1 text-[10px] font-medium text-text-base">
                  {p.product_title}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-gold/60">
                  {p.product_tier}
                  {p.stock !== -1 && p.stock <= 3 && p.stock > 0 && (
                    <span className="ml-1 text-amber-400/80">· còn {p.stock}</span>
                  )}
                  {outOfStock && <span className="ml-1 text-red-400/80">· hết</span>}
                </span>
              </div>
              {isSelected && (
                <div className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-gold text-background">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedGifts.length === 0 && (
        <p className="mt-2 text-[9px] text-text-muted/70">
          ⚠ Bạn cần chọn quà trước khi đặt hàng. Nếu bỏ qua, đơn vẫn tạo nhưng không kèm quà.
        </p>
      )}
    </div>
  );
}