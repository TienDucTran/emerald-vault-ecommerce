'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/lib/types';

export type CartItem = {
  product: Product;
  /** Server lock id (UUID) — null nếu chưa lock thật (mock/fallback) */
  lockId: string | null;
  lockedAt: number;
  expiresAt: number;
};

type CartState = {
  items: CartItem[];

  /** Thêm vào cart (client-only, không gọi server) — dùng cho optimistic UI */
  addItemLocal: (product: Product, opts?: { lockId?: string | null; expiresAt?: number }) => void;

  /** Gọi API /api/lock-item, set state với lockId + expiresAt từ server */
  lockItemAsync: (
    product: Product,
    clientId: string
  ) => Promise<{ ok: true; expiresAt: number } | { ok: false; error: string }>;

  removeItem: (productId: string) => Promise<void>;
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

      addItemLocal: (product, opts) => {
        const now = Date.now();
        const expiresAt = opts?.expiresAt ?? now + LOCK_DURATION_MS;
        const newItem: CartItem = {
          product,
          lockId: opts?.lockId ?? null,
          lockedAt: now,
          expiresAt,
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

      lockItemAsync: async (product, clientId) => {
        try {
          const res = await fetch('/api/lock-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product.id, clientId }),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) {
            return { ok: false, error: json.error || 'LOCK_FAILED' };
          }
          const expiresAt = new Date(json.expiresAt).getTime();
          get().addItemLocal(product, { lockId: json.lockId, expiresAt });
          return { ok: true, expiresAt };
        } catch (e) {
          // Fallback local-only (Supabase down) — vẫn cho user giữ trong 10'
          const expiresAt = Date.now() + LOCK_DURATION_MS;
          get().addItemLocal(product, { lockId: null, expiresAt });
          return { ok: false, error: e instanceof Error ? e.message : 'NETWORK_ERROR' };
        }
      },

      removeItem: async (productId) => {
        const item = get().items.find((i) => i.product.id === productId);
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }));
        // Best-effort: gọi API release lock (idempotent)
        if (item?.lockId) {
          try {
            await fetch('/api/unlock-item', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lockId: item.lockId, productId }),
            });
          } catch {
            /* ignore */
          }
        }
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
      // Chỉ persist items, không persist functions
      partialize: (state) => ({ items: state.items }),
    }
  )
);
