'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useRecentlyViewed,
  STORAGE_KEY,
  type RecentlyViewedItem,
} from '@/hooks/use-recently-viewed';
import { formatVND, MATERIAL_LABELS, cn } from '@/lib/utils';
import { ProductUnavailableOverlay, isUnavailableStatus } from '@/components/product/product-unavailable-overlay';

type ProductStatus = 'AVAILABLE' | 'SOLD_OUT' | 'RESERVED' | string;

interface RecentlyViewedLocalProps {
  excludeId?: string;
  limit?: number;
}

export function RecentlyViewedLocal({ excludeId, limit = 6 }: RecentlyViewedLocalProps) {
  const { getItems } = useRecentlyViewed();
  const [items, setItems] = useState<RecentlyViewedItem[] | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, ProductStatus>>({});
  const itemsRef = useRef<RecentlyViewedItem[] | null>(null);
  const lastFetchedKeyRef = useRef<string>('');
  const visibilityGuardRef = useRef<number>(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const all = getItems();
    const filtered = excludeId ? all.filter((p) => p.id !== excludeId) : all;
    const next = filtered.slice(0, limit);
    setItems(next);
    itemsRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeId, limit]);

  // Fetch fresh statuses from /api/products/brief. Re-runs on items change and
  // when re-triggered by pageshow / visibilitychange via refreshKey bump.
  useEffect(() => {
    const list = itemsRef.current ?? items;
    if (!list || list.length === 0) return;
    const ids = list.map((it) => it.id);
    const key = ids.join(',');
    if (key === lastFetchedKeyRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/products/brief?ids=${ids.join(',')}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { data?: Array<{ id: string; status: ProductStatus }> };
        const rows = json.data ?? [];
        if (cancelled) return;
        const fresh: Record<string, ProductStatus> = {};
        for (const r of rows) fresh[r.id] = r.status;
        if (Object.keys(fresh).length === 0) return;
        setStatusMap((prev) => ({ ...prev, ...fresh }));
        lastFetchedKeyRef.current = key;

        // Persist fresh statuses back to localStorage (Safari private mode guarded).
        try {
          if (typeof window === 'undefined') return;
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return;
          let mutated = false;
          const merged = parsed.map((entry: RecentlyViewedItem) => {
            const s = fresh[entry.id];
            if (s && entry.status !== s) {
              mutated = true;
              return { ...entry, status: s };
            }
            return entry;
          });
          if (mutated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore — quota / private mode
        }
      } catch (err) {
        if (!cancelled) console.warn('[RecentlyViewedLocal] brief fetch failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, refreshKey]);

  // Re-fetch when restored from bfcache (mobile Safari).
  useEffect(() => {
    const handler = () => {
      if (!itemsRef.current || itemsRef.current.length === 0) return;
      lastFetchedKeyRef.current = '';
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('pageshow', handler);
    return () => window.removeEventListener('pageshow', handler);
  }, []);

  // Re-fetch when tab becomes visible again (debounced vs pageshow).
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      if (!itemsRef.current || itemsRef.current.length === 0) return;
      const now = Date.now();
      if (now - visibilityGuardRef.current < 250) return;
      visibilityGuardRef.current = now;
      lastFetchedKeyRef.current = '';
      setRefreshKey((k) => k + 1);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

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
          const effectiveStatus: ProductStatus = statusMap[item.id] ?? item.status;
          const unavailable = isUnavailableStatus(effectiveStatus);
          const overlayStatus: 'SOLD_OUT' | 'RESERVED' =
            effectiveStatus === 'RESERVED' ? 'RESERVED' : 'SOLD_OUT';
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
                {unavailable && (
                  <ProductUnavailableOverlay status={overlayStatus} className="bg-background/60" />
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
