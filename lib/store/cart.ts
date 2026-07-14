'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/lib/types';

export type CartItem = {
  product: Product;
  lockedAt: number;
  expiresAt: number;
};

type CartState = {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  getItem: (productId: string) => CartItem | undefined;
  isExpired: (productId: string) => boolean;
  getTotal: () => number;
  getTimeLeft: (productId: string) => number;
};

const LOCK_DURATION_MS = 10 * 60 * 1000;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const now = Date.now();
        const newItem: CartItem = {
          product,
          lockedAt: now,
          expiresAt: now + LOCK_DURATION_MS,
        };
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id ? newItem : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        });
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }));
      },
      clear: () => set({ items: [] }),
      getItem: (productId) =>
        get().items.find((i) => i.product.id === productId),
      isExpired: (productId) => {
        const item = get().items.find((i) => i.product.id === productId);
        if (!item) return true;
        return Date.now() >= item.expiresAt;
      },
      getTotal: () =>
        get().items
          .filter((i) => Date.now() < i.expiresAt)
          .reduce((sum, i) => sum + i.product.price, 0),
      getTimeLeft: (productId) => {
        const item = get().items.find((i) => i.product.id === productId);
        if (!item) return 0;
        return Math.max(0, item.expiresAt - Date.now());
      },
    }),
    {
      name: 'ev-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
