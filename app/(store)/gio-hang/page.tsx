'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, ArrowRight, Trash2, Clock } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import { formatCountdown } from '@/hooks/use-countdown';
import { useJewelryAnalytics } from '@/hooks/use-jewelry-analytics';
import { formatVND } from '@/lib/utils';

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 phút — đồng bộ với lib/constants

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const analytics = useJewelryAnalytics();
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Track items đã expire để gọi unlock-item 1 lần
  const expiredNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [mounted]);

  // Khi item vừa hết hạn → gọi API release lock (server-side cleanup)
  //                    + fire GA4 lock_item_timeout (1 lần / product)
  useEffect(() => {
    if (!mounted) return;
    const now = Date.now();
    for (const item of items) {
      if (now >= item.expiresAt && !expiredNotifiedRef.current.has(item.product.id)) {
        expiredNotifiedRef.current.add(item.product.id);
        if (item.lockId) {
          fetch('/api/unlock-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lockId: item.lockId, productId: item.product.id }),
            keepalive: true,
          }).catch(() => {});
        }
        // GA4: lock_item_timeout. Ước lượng lockDuration = LOCK_DURATION_MS
        // (user có thể đã refresh / reload làm mất locked_at thật, nên dùng constant).
        analytics.lockItemTimeout({
          product: {
            id: item.product.id,
            title: item.product.title,
            category: item.product.category,
            price: item.product.price,
          },
          lockDurationMs: LOCK_DURATION_MS,
        });
      }
    }
  }, [tick, items, mounted, analytics]);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md rounded-lg border border-gold/20 bg-surface p-10 text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border border-gold/30 bg-surface-emerald text-gold">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-heading text-2xl font-bold">Giỏ hàng trống</h1>
          <p className="text-sm text-text-muted">Đang tải...</p>
        </div>
      </div>
    );
  }

  const activeItems = items.filter((i) => Date.now() < i.expiresAt);
  const expiredItems = items.filter((i) => Date.now() >= i.expiresAt);
  const total = activeItems.reduce((sum, i) => sum + i.product.price, 0);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md rounded-lg border border-gold/20 bg-surface p-10 text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border border-gold/30 bg-surface-emerald text-gold">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-heading text-2xl font-bold">Giỏ hàng trống</h1>
          <p className="mb-6 text-sm text-text-muted">
            Bạn chưa giữ món đồ nào. Hãy khám phá bộ sưu tập và bấm "Giữ hàng 10 phút" để không ai cướp mất món bạn thích.
          </p>
          <Link
            href="/san-pham"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-gradient-gold px-6 text-sm font-semibold text-background transition-shadow hover:shadow-gold-glow-lg"
          >
            Khám phá sản phẩm
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 font-heading text-3xl font-bold text-gold">Giỏ hàng của bạn</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {activeItems.map((item) => {
            const timeLeft = Math.max(0, item.expiresAt - Date.now());
            return (
              <div
                key={item.product.id}
                className="flex gap-4 rounded-lg border border-gold/20 bg-surface p-4"
              >
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-surface-emerald">
                  <img
                    src={item.product.image_url}
                    alt={item.product.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="font-heading text-lg font-semibold text-text-base">
                    {item.product.title}
                  </h3>
                  <p className="text-sm text-text-muted">
                    {item.product.code ?? ''}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gold" />
                    <span className="font-mono text-gold">
                      {formatCountdown(timeLeft)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="font-sans text-lg text-gold">
                    {formatVND(item.product.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product.id)}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-red-400"
                    aria-label="Xoá"
                  >
                    <Trash2 className="h-3 w-3" />
                    Xoá
                  </button>
                </div>
              </div>
            );
          })}

          {expiredItems.map((item) => (
            <div
              key={item.product.id}
              className="flex gap-4 rounded-lg border border-gold/10 bg-surface/50 p-4 opacity-60"
            >
              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-surface-emerald">
                <img
                  src={item.product.image_url}
                  alt={item.product.title}
                  className="h-full w-full object-cover grayscale"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="font-heading text-lg font-semibold text-text-base">
                  {item.product.title}
                </h3>
                <span className="text-sm text-red-400">(Đã hết hạn)</span>
              </div>
              <div className="flex flex-col items-end justify-between">
                <span className="text-sm text-text-muted line-through">
                  {formatVND(item.product.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.product.id)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                  Xoá
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-gold/20 bg-surface p-6">
            <h2 className="mb-4 font-heading text-xl font-semibold text-gold">
              Tóm tắt
            </h2>
            <div className="mb-4 flex justify-between text-sm">
              <span className="text-text-muted">Sản phẩm đang giữ</span>
              <span className="text-text-base">{activeItems.length}</span>
            </div>
            <div className="mb-4 flex justify-between border-t border-gold/10 pt-4 text-base font-semibold">
              <span>Tổng cộng</span>
              <span className="text-gold">{formatVND(total)}</span>
            </div>
            <Link
              href="/thanh-toan"
              className={`flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-shadow ${
                activeItems.length === 0
                  ? 'pointer-events-none bg-surface-emerald text-text-muted'
                  : 'bg-gradient-gold text-background hover:shadow-gold-glow-lg'
              }`}
            >
              Tiến hành thanh toán
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
