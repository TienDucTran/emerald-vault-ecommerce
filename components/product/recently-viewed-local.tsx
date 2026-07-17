'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useRecentlyViewed,
  type RecentlyViewedItem,
} from '@/hooks/use-recently-viewed';
import { formatVND, MATERIAL_LABELS, cn } from '@/lib/utils';
import { ProductUnavailableOverlay, isUnavailableStatus } from '@/components/product/product-unavailable-overlay';

interface RecentlyViewedLocalProps {
  excludeId?: string;
  limit?: number;
}

export function RecentlyViewedLocal({ excludeId, limit = 6 }: RecentlyViewedLocalProps) {
  const { getItems } = useRecentlyViewed();
  const [items, setItems] = useState<RecentlyViewedItem[] | null>(null);

  useEffect(() => {
    const all = getItems();
    const filtered = excludeId ? all.filter((p) => p.id !== excludeId) : all;
    setItems(filtered.slice(0, limit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeId, limit]);

  if (items === null || items.length === 0) return null;

  return (
    <section className="mt-16 opacity-90">
      <h2
        className="mb-6 font-heading text-xl uppercase tracking-widest text-text-base motion-safe:animate-fadeInUp"
        style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
      >
        Sản phẩm vừa xem
      </h2>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {items.map((item, i) => {
          const unavailable = isUnavailableStatus(item.status);
          return (
            <Link
              key={item.id}
              href={`/san-pham/${item.slug}`}
              className="group relative block w-32 shrink-0 transition-all duration-300 motion-safe:animate-fadeInUp hover:-translate-y-1 sm:w-40"
              style={{ animationDelay: `${(i % 8) * 60}ms`, animationFillMode: 'backwards' }}
              aria-label={`Xem lại ${item.title}`}
            >
              <div className="relative aspect-square overflow-hidden rounded-sm border border-gold/15 bg-surface-emerald transition-all group-hover:border-gold/40 group-hover:shadow-card-hover">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  sizes="160px"
                  className={cn(
                    'object-cover transition-transform duration-500 group-hover:scale-110',
                    unavailable && 'grayscale'
                  )}
                />

                {/* Unavailable overlay — vintage stamp style, mini scale cho card nhỏ */}
                {unavailable && (
                  <ProductUnavailableOverlay
                    status={item.status as 'SOLD_OUT' | 'RESERVED'}
                    className="bg-background/60"
                  />
                )}
              </div>
              <div className="mt-2 space-y-0.5">
                <p
                  className={cn(
                    'line-clamp-1 text-xs transition-colors group-hover:text-gold',
                    unavailable ? 'text-text-muted' : 'text-text-base'
                  )}
                >
                  {item.title}
                </p>
                <p className="line-clamp-1 text-[10px] uppercase tracking-wider text-text-muted">
                  {MATERIAL_LABELS[item.material as keyof typeof MATERIAL_LABELS] ?? item.material}
                </p>
                <p
                  className={cn(
                    'font-heading text-xs font-bold',
                    unavailable ? 'text-text-muted line-through' : 'text-gold'
                  )}
                >
                  {formatVND(item.price)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
