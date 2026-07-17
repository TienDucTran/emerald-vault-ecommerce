'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ev-recently-viewed';
const MAX_ITEMS = 12;

export type RecentlyViewedItem = {
  id: string;
  slug: string;
  title: string;
  image_url: string;
  price: number;
  material: string;
  quality_tier: string;
  /**
   * Status snapshot lúc user xem (AVAILABLE | SOLD_OUT | RESERVED).
   * Dùng để render overlay vintage stamp trong RecentlyViewedLocal.
   *
   * Lưu ý: status có thể stale (user xem lúc AVAILABLE, sau đó admin SOLD_OUT
   * → recently viewed vẫn show AVAILABLE). Acceptable cho UX recently-viewed —
   * user click vào PDP sẽ thấy status mới nhất. Nếu cần fresh, fetch lại từ DB
   * qua `/api/products/brief` batch, nhưng tốn 1 round-trip.
   */
  status: 'AVAILABLE' | 'SOLD_OUT' | 'RESERVED' | string;
  viewedAt: number;
};

export type RecentlyViewedItemInput = Omit<RecentlyViewedItem, 'viewedAt'>;

function readStorage(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RecentlyViewedItem =>
        x &&
        typeof x.id === 'string' &&
        typeof x.slug === 'string' &&
        typeof x.title === 'string' &&
        typeof x.image_url === 'string' &&
        typeof x.price === 'number' &&
        typeof x.material === 'string' &&
        typeof x.quality_tier === 'string' &&
        // Backward compat: nếu localStorage cũ chưa có status → fallback 'AVAILABLE'
        // (tránh crash khi user upgrade code mà vẫn còn data cũ)
        (x.status === undefined || typeof x.status === 'string') &&
        typeof x.viewedAt === 'number'
    );
  } catch {
    return [];
  }
}

function writeStorage(items: RecentlyViewedItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Safari private mode hoặc quota exceeded — bỏ qua
  }
}

/**
 * Hook quản lý danh sách sản phẩm vừa xem, persist trong localStorage.
 * - SSR-safe: trả về [] cho tới khi hydrate
 * - Dedup theo `id`, đẩy item mới lên đầu, cap 12
 */
export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStorage();
    // Backfill status = 'AVAILABLE' cho item localStorage cũ (trước khi feature này được thêm)
    const normalized = stored.map((x) => ({
      ...x,
      status: x.status ?? 'AVAILABLE',
    }));
    setItems(normalized);
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addView = useCallback((input: RecentlyViewedItemInput) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== input.id);
      const next: RecentlyViewedItem[] = [
        { ...input, viewedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      writeStorage(next);
      return next;
    });
  }, []);

  const getItems = useCallback((): RecentlyViewedItem[] => {
    return readStorage();
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    writeStorage([]);
  }, []);

  return { items, hydrated, addView, getItems, clear };
}
