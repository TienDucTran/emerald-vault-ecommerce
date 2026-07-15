'use client';

/**
 * Wishlist store — in-memory cache of the server-side wishlist.
 * No persistence (no localStorage). User must be logged in to use wishlist.
 *
 * Hydrated on app start by `useWishlistBootstrap` (mounted in Navbar)
 * and/or on first render of any <WishlistButton>.
 *
 * Public API kept stable for any future consumer:
 *   - hasItem(productId)  → boolean
 *   - setHas(id, value)   → optimistic update after API call
 *   - setItems(ids)       → bulk-load server response
 *   - clear()             → reset on logout
 */

import { create } from 'zustand';

type WishlistState = {
  /** Set of productIds currently in the user's server-side wishlist */
  ids: Set<string>;
  /** True sau khi initial server fetch đã hoàn tất (dù thành công hay rỗng) */
  loaded: boolean;

  /** Bulk-load server response: mảng productId → Set */
  setItems: (productIds: string[]) => void;

  /** Cập nhật 1 item (optimistic update sau add/remove) */
  setHas: (productId: string, value: boolean) => void;

  /** Check tồn tại theo productId */
  hasItem: (productId: string) => boolean;

  /** Reset về rỗng — dùng khi logout */
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  setItems: (productIds) => {
    set({ ids: new Set(productIds), loaded: true });
  },

  setHas: (productId, value) => {
    const next = new Set(get().ids);
    if (value) {
      next.add(productId);
    } else {
      next.delete(productId);
    }
    set({ ids: next });
  },

  hasItem: (productId) => get().ids.has(productId),

  clear: () => {
    set({ ids: new Set(), loaded: false });
  },
}));
