'use client';

import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Clock } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import { getPaymentMethodLabel } from '@/lib/order/status';
import type { PaymentOption } from './checkout-form';

export interface CheckoutItem {
  id: string;
  title: string;
  // FIX: C5 — code là optional vì mock products không phải lúc nào cũng có
  code?: string;
  tier: 'SSS' | 'SS' | 'S';
  price: number;
  image: string;
}

interface CheckoutSummaryProps {
  /** Primary / featured item (always required for header image + fallback). */
  item: CheckoutItem;
  /**
   * Full list of items being checked out. When provided AND length > 1,
   * the summary renders a stacked list with the first item featured and
   * the rest as compact rows. The total is computed from this array.
   */
  items?: CheckoutItem[];
  payment?: PaymentOption;
  /** Epoch ms — target time the hold expires. null = no active items. */
  minExpiresAt?: number | null;
  /** Number of active items being held in checkout. */
  itemCount?: number;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/* — Countdown driven by a real epoch ms target (re-sync every 1s) — */
function useCountdownFromTimestamp(targetMs: number | null | undefined): {
  display: string;
  expired: boolean;
} {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (targetMs == null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  if (targetMs == null) {
    return { display: '--:--', expired: false };
  }

  const diffMs = Math.max(0, targetMs - now);
  const totalSec = Math.floor(diffMs / 1000);
  const expired = diffMs === 0;

  if (expired) {
    return { display: '00:00', expired: true };
  }

  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return {
    display: h >= 1 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`,
    expired: false,
  };
}

export function CheckoutSummary({
  item,
  items,
  payment,
  minExpiresAt,
  itemCount,
}: CheckoutSummaryProps) {
  // Countdown driven by real expiresAt of the weakest active lock (null = nothing held).
  const { display: countdown, expired } = useCountdownFromTimestamp(minExpiresAt);
  const hasItems = (itemCount ?? 0) > 0 && minExpiresAt != null;
  const noActiveItems = !hasItems;
  const remainingMs = minExpiresAt != null ? minExpiresAt - Date.now() : 0;
  const isWarning = hasItems && !expired && remainingMs < 60_000;

  // — Render mode —
  // Multi mode: items prop provided AND length > 1.
  // The first item keeps the featured image + details; the rest render as a compact list.
  const isMulti = !!items && items.length > 1;
  // Total always derived from `items` if available, otherwise fall back to single `item`.
  const total = isMulti
    ? (items as CheckoutItem[]).reduce((sum, i) => sum + i.price, 0)
    : item.price;
  // Items rendered in the compact list (everything after the featured one).
  const restItems = isMulti ? (items as CheckoutItem[]).slice(1) : [];

  return (
    <div className="rounded-md border border-gold/20 bg-surface-emerald shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
      {/* — Header — */}
      <div className="flex flex-col items-center gap-1 border-b border-gold/10 px-6 py-5 text-center">
        <h3 className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-gold">
          TÓM TẮT ĐƠN HÀNG
        </h3>
        {isMulti && (
          <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-text-muted">
            SẢN PHẨM ({(items as CheckoutItem[]).length})
          </span>
        )}
      </div>

      {/* — Featured (first) item — */}
      <div className="flex gap-4 p-6">
        {/* Product image */}
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-sm border border-gold/20 bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Product details */}
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex flex-col gap-2">
            <h4 className="font-heading text-lg font-normal leading-tight text-text-base">
              {item.title}
            </h4>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-gold/40 px-2 py-0.5 font-heading text-[10px] font-normal uppercase tracking-wider text-gold">
                TIER {item.tier}
              </span>
              {item.code && (
                <span className="text-xs text-text-muted">
                  Mã hiệu {item.code}
                </span>
              )}
            </div>
          </div>
          <span className="font-sans text-lg font-normal text-gold">
            {formatVND(item.price)}
          </span>
        </div>
      </div>

      {/* — Compact list of remaining items (multi only) — */}
      {isMulti && restItems.length > 0 && (
        <ul className="mx-6 mb-6 overflow-hidden rounded-sm border border-gold/10">
          {restItems.map((it, idx) => (
            <li
              key={it.id}
              className={`flex items-center gap-3 bg-background/30 p-3 ${
                idx !== restItems.length - 1 ? 'border-b border-gold/10' : ''
              }`}
            >
              <div className="h-14 w-12 shrink-0 overflow-hidden rounded-sm border border-gold/20 bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.image}
                  alt={it.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                <span className="line-clamp-1 font-sans text-sm text-text-base">
                  {it.title}
                </span>
                {it.code && (
                  <span className="font-heading text-[10px] uppercase tracking-wider text-text-muted">
                    Mã {it.code}
                  </span>
                )}
              </div>
              <span className="shrink-0 font-sans text-sm font-normal text-gold">
                {formatVND(it.price)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* — Price calculation — */}
      <div className="flex flex-col gap-4 border-t border-gold/10 px-6 py-8">
        {/* Tạm tính */}
        <div className="flex items-center justify-between">
          <span className="text-base text-text-muted">Tạm tính</span>
          <span className="text-base text-text-base">{formatVND(total)}</span>
        </div>

        {/* Phí vận chuyển */}
        <div className="flex items-center justify-between">
          <span className="text-base text-text-muted">
            Phí vận chuyển bảo mật
          </span>
          <span className="text-base text-gold">Miễn phí</span>
        </div>

        {/* Tổng cộng */}
        <div className="flex items-center justify-between border-t border-gold/10 pt-4">
          <span className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-text-base">
            TỔNG CỘNG
          </span>
          <span className="font-sans text-2xl font-bold text-gold">
            {formatVND(total)}
          </span>
        </div>
      </div>

      {/* — 10-min hold alert — */}
      <div
        className={`mx-6 mb-6 flex flex-col gap-2 rounded-sm border p-4 ${
          expired || noActiveItems
            ? 'border-red-500/40 bg-red-500/10'
            : isWarning
              ? 'border-amber-400/50 bg-amber-500/10 animate-pulse'
              : 'border-gold/30 bg-background/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <Clock
            className={`h-4 w-4 shrink-0 ${
              expired || noActiveItems
                ? 'text-red-400'
                : isWarning
                  ? 'text-amber-400'
                  : 'text-gold'
            }`}
          />
          <div className="flex flex-col">
            <span
              className={`font-heading text-[11px] font-normal uppercase tracking-wider ${
                expired || noActiveItems
                  ? 'text-red-400'
                  : isWarning
                    ? 'text-amber-400'
                    : 'text-gold'
              }`}
            >
              {expired || noActiveItems
                ? 'ĐÃ HẾT THỜI GIAN GIỮ HÀNG'
                : 'THỜI GIAN GIỮ KHO CÒN LẠI'}
            </span>
            <span
              className={`font-sans text-sm font-normal ${
                expired || noActiveItems
                  ? 'text-red-400'
                  : isWarning
                    ? 'text-amber-300'
                    : 'text-text-base'
              }`}
            >
              {expired || noActiveItems ? '00:00' : countdown}
            </span>
          </div>
        </div>
        {(itemCount ?? 0) > 1 && (
          <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-text-muted">
            Giữ cho {itemCount} sản phẩm
          </span>
        )}
        {noActiveItems && (
          <span className="text-xs text-red-300">
            Tất cả sản phẩm đã hết thời gian giữ. Vui lòng quay lại giỏ hàng.
          </span>
        )}
      </div>

      {/* — Selected payment method display — */}
      {payment && (
        <div className="mx-6 mb-4 flex items-center justify-between rounded-sm border border-gold/20 bg-background/30 px-4 py-3">
          <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-text-muted">
            Thanh toán
          </span>
          <span className="font-sans text-sm font-semibold text-gold">
            {getPaymentMethodLabel(payment)}
          </span>
        </div>
      )}

      {/* — Trust badges — */}
      <div className="flex items-center justify-center gap-4 px-6 pb-6">
        <div className="flex items-center gap-1 opacity-60">
          <Lock className="h-3 w-3 text-text-base" />
          <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-text-base">
            BẢO MẬT SSL
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-60">
          <ShieldCheck className="h-3 w-3 text-text-base" />
          <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-text-base">
            CHỨNG THỰC GIA
          </span>
        </div>
      </div>
    </div>
  );
}
