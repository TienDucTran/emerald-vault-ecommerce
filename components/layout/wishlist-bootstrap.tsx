'use client';

import { useEffect } from 'react';
import { useWishlistBootstrap } from '@/hooks/use-wishlist-bootstrap';

const LEGACY_WISHLIST_KEYS = [
  'ev-wishlist',
  'wishlist',
  'wishlist-storage',
  'wishlist-synced',
];

/**
 * Mount-only client component. Gọi `useWishlistBootstrap()` để load
 * server wishlist vào in-memory cache. Render null.
 */
export function WishlistBootstrap(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      for (const key of LEGACY_WISHLIST_KEYS) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore (private mode / quota)
    }
  }, []);

  useWishlistBootstrap();
  return null;
}
