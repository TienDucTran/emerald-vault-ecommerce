'use client';

/**
 * Wishlist store — client-side only, persist in localStorage (mirrors cart.ts pattern).
 * Không gọi server. Dùng cho optimistic UI: thêm/xóa sản phẩm yêu thích.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/lib/types';

export type WishlistItem = {
  product: Product;
  /** Timestamp (ms) lúc thêm vào wishlist */
  addedAt: number;
};

type WishlistState = {
  items: WishlistItem[];

  /** Thêm vào wishlist (no-op nếu đã tồn tại) */
  addItem: (product: Product) => void;

  /** Xóa khỏi wishlist theo productId */
  removeItem: (productId: string) => void;

  /** Toggle: nếu có thì xóa, nếu chưa có thì thêm */
  toggleItem: (product: Product) => void;

  /** Check tồn tại theo productId */
  hasItem: (productId: string) => boolean;

  /** Xóa toàn bộ wishlist */
  clear: () => void;

  /** Tổng số item hiện tại */
  count: () => number;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            // No-op: đã tồn tại
            return state;
          }
          const newItem: WishlistItem = { product, addedAt: Date.now() };
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }));
      },

      toggleItem: (product) => {
        const exists = get().items.some((i) => i.product.id === product.id);
        if (exists) {
          get().removeItem(product.id);
        } else {
          get().addItem(product);
        }
      },

      hasItem: (productId) =>
        get().items.some((i) => i.product.id === productId),

      clear: () => set({ items: [] }),

      count: () => get().items.length,
    }),
    {
      name: 'ev-wishlist',
      storage: createJSONStorage(() => localStorage),
      // Chỉ persist items, không persist functions
      partialize: (state) => ({ items: state.items }),
    }
  )
);
