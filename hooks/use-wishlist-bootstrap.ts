'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWishlistStore } from '@/lib/store/wishlist';

/**
 * useWishlistBootstrap — Đảm bảo server wishlist được load 1 lần / session
 * vào in-memory cache. Mount ở top-level (Navbar) hoặc bất kỳ client
 * component nào cần heart state ready ngay từ đầu.
 *
 * - Idempotent: nếu cache đã `loaded` thì bỏ qua.
 * - Silent failure: nếu user chưa đăng nhập hoặc API lỗi → không làm gì,
 *   để heart mặc định là unactive cho tới khi user click.
 */
export function useWishlistBootstrap(): void {
  useEffect(() => {
    if (useWishlistStore.getState().loaded) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const res = await fetch('/api/account/wishlist', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { data?: Array<{ product_id: string }> };
        const ids = (json.data ?? []).map((it) => it.product_id);
        if (!cancelled) {
          useWishlistStore.getState().setItems(ids);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
