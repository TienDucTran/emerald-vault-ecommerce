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
    setItems(readStorage());
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
