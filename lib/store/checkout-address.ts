'use client';

/**
 * Checkout address store — lightweight store chia sẻ address state
 * giữa CheckoutForm (AddressPicker) và GamificationPanel (CheckoutSummary)
 * mà không cần prop drilling qua CheckoutClient.
 */

import { create } from 'zustand';

interface CheckoutAddressState {
  province: string | null;
  district: string | null;
  setAddress: (province: string | null, district: string | null) => void;
  reset: () => void;
}

export const useCheckoutAddressStore = create<CheckoutAddressState>((set) => ({
  province: null,
  district: null,
  setAddress: (province, district) => set({ province, district }),
  reset: () => set({ province: null, district: null }),
}));