'use client';

import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Clock } from 'lucide-react';
import { formatVND } from '@/lib/utils';
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
  item: CheckoutItem;
  payment?: PaymentOption;
}

const HOLD_SECONDS = 600; // FIX: C4 — đổi từ 584s (~09:44) sang 600s (10 phút tròn)

/* — 10-minute countdown timer — */
function useCountdown(seconds: number) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return {
    display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    expired: timeLeft === 0,
  };
}

export function CheckoutSummary({ item, payment }: CheckoutSummaryProps) {
  // FIX: C4 — countdown 10 phút tròn + theo dõi trạng thái hết hạn
  const { display: countdown, expired } = useCountdown(HOLD_SECONDS);

  return (
    <div className="rounded-md border border-gold/20 bg-surface-emerald shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
      {/* — Header — */}
      <div className="border-b border-gold/10 px-6 py-5 text-center">
        <h3 className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-gold">
          TÓM TẮT ĐƠN HÀNG
        </h3>
      </div>

      {/* — Product list — */}
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

      {/* — Price calculation — */}
      <div className="flex flex-col gap-4 border-t border-gold/10 px-6 py-8">
        {/* Tạm tính */}
        <div className="flex items-center justify-between">
          <span className="text-base text-text-muted">Tạm tính</span>
          <span className="text-base text-text-base">{formatVND(item.price)}</span>
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
            {formatVND(item.price)}
          </span>
        </div>
      </div>

      {/* — 10-min hold alert — */}
      <div
        className={`mx-6 mb-6 flex items-center gap-3 rounded-sm border p-4 ${
          expired
            ? 'border-red-500/40 bg-red-500/10'
            : 'border-gold/30 bg-background/50'
        }`}
      >
        <Clock
          className={`h-4 w-4 shrink-0 ${expired ? 'text-red-400' : 'text-gold'}`}
        />
        <div className="flex flex-col">
          <span
            className={`font-heading text-[11px] font-normal uppercase tracking-wider ${
              expired ? 'text-red-400' : 'text-gold'
            }`}
          >
            {expired
              ? 'ĐÃ HẾT THỜI GIAN GIỮ HÀNG'
              : 'THỜI GIAN GIỮ KHO CÒN LẠI'}
          </span>
          <span className="font-sans text-sm font-normal text-text-base">
            {expired ? '00:00' : countdown}
          </span>
        </div>
      </div>

      {/* — Selected payment method display — */}
      {payment && (
        <div className="mx-6 mb-4 flex items-center justify-between rounded-sm border border-gold/20 bg-background/30 px-4 py-3">
          <span className="font-heading text-[10px] font-normal uppercase tracking-wider text-text-muted">
            Thanh toán
          </span>
          <span className="font-sans text-sm font-semibold text-gold">
            {payment === 'MOMO'
              ? 'Ví MoMo'
              : payment === 'COD'
                ? 'COD'
                : 'Chuyển khoản'}
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
