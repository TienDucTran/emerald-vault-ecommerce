'use client';

/**
 * ShippingFeeDisplay — hiển thị phí vận chuyển động dựa trên gamification check
 * Đọc address từ store, gọi API, hiển thị phí ship thật
 */

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/store/cart';
import { useCheckoutAddressStore } from '@/lib/store/checkout-address';
import { formatVND } from '@/lib/utils';
import { getZoneLabel } from '@/lib/gamification/freeship';
import type { ShippingZone } from '@/lib/gamification/types';

interface ShippingFeeData {
  is_free: boolean;
  ship_fee: number;
  zone: ShippingZone;
}

interface ShippingFeeDisplayProps {
  /** Callback khi shipping fee update — để parent cộng vào total */
  onFeeChange?: (fee: number) => void;
}

export function ShippingFeeDisplay({ onFeeChange }: ShippingFeeDisplayProps = {}) {
  const activeItems = useCartStore((s) =>
    s.items.filter((i) => Date.now() < i.expiresAt)
  );
  const province = useCheckoutAddressStore((s) => s.province);
  const district = useCheckoutAddressStore((s) => s.district);
  const [data, setData] = useState<ShippingFeeData | null>(null);

  // Stable string key — thay đổi khi item list thay đổi (thêm/xoá/đổi giá)
  const itemKey = activeItems
    .map((i) => `${i.product.id}:${i.product.price}`)
    .join('|');

  useEffect(() => {
    if (activeItems.length === 0) {
      setData(null);
      onFeeChange?.(0);
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
            const fee = json.data.freeship.is_free ? 0 : json.data.freeship.ship_fee;
            setData({
              is_free: json.data.freeship.is_free,
              ship_fee: json.data.freeship.ship_fee,
              zone: json.data.freeship.zone,
            });
            onFeeChange?.(fee);
          }
        } catch {
          // Non-fatal
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey, province, district]);

  if (!data) {
    // Default: hiển thị "—" khi chưa có data (đang load hoặc chưa chọn address)
    return (
      <div className="flex items-center justify-between">
        <span className="text-base text-text-muted">
          Phí vận chuyển
        </span>
        <span className="text-base text-text-muted">—</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-base text-text-muted">
          Phí vận chuyển
        </span>
        <span className={`text-base ${data.is_free ? 'text-gold' : 'text-text-base'}`}>
          {data.is_free ? 'Miễn phí' : formatVND(data.ship_fee)}
        </span>
      </div>
      <div className="text-[10px] text-text-muted">
        Khu vực: {getZoneLabel(data.zone)}
      </div>
    </div>
  );
}