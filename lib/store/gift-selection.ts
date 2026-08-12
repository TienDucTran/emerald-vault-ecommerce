/**
 * Gift Selection Store — quản lý sản phẩm quà tặng user chọn trong checkout
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GiftProductChoice } from '@/lib/gamification/types';

interface GiftSelectionState {
  selectedGifts: GiftProductChoice[];
  ruleCode: string | null;
  toggleGift: (gift: GiftProductChoice, maxSelections: number) => void;
  setGifts: (gifts: GiftProductChoice[], ruleCode: string) => void;
  clear: () => void;
}

export const useGiftSelectionStore = create<GiftSelectionState>()(
  persist(
    (set, get) => ({
      selectedGifts: [],
      ruleCode: null,
      toggleGift: (gift, maxSelections) => {
        const current = get().selectedGifts;
        const existing = current.find((g) => g.product_id === gift.product_id);
        if (existing) {
          set({ selectedGifts: current.filter((g) => g.product_id !== gift.product_id) });
        } else if (current.length < maxSelections) {
          set({ selectedGifts: [...current, gift] });
        }
      },
      setGifts: (gifts, ruleCode) => set({ selectedGifts: gifts, ruleCode }),
      clear: () => set({ selectedGifts: [], ruleCode: null }),
    }),
    {
      name: 'gift-selection',
      partialize: (state) => ({
        selectedGifts: state.selectedGifts,
        ruleCode: state.ruleCode,
      }),
    }
  )
);