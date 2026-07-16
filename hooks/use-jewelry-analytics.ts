'use client';

/**
 * useJewelryAnalytics — typed wrapper quanh `window.gtag`.
 *
 * Đặc điểm:
 *  - SSR-safe: không gọi gtag khi `window` chưa tồn tại.
 *  - Consent-gated: KHÔNG push event khi user chưa chấp nhận cookie.
 *    (Phù hợp Nghị định 13/2023 VN — analytics mặc định `denied`.)
 *  - Mỗi method trả về `void` (fire-and-forget) để không block UI.
 *  - Tất cả payload được build sẵn trong `lib/analytics/events.ts`
 *    (pure functions) → hook chỉ lo side-effect.
 *
 * Cài đặt:
 *  - `<GoogleAnalytics gaId="..."/>` được mount trong `app/(store)/layout.tsx`.
 *  - Default-deny `gtag('consent','default',...)` cũng ở đó.
 *  - `<ConsentBanner/>` gọi `gtag('consent','update',...)` khi user chọn.
 *
 * Lưu ý:
 *  - Trang admin (`/admin/**`) nằm ở route group `(admin)`, không có
 *    GoogleAnalytics mount → useJewelryAnalytics ở đó no-op.
 *  - Page reload giữa session: consent state lưu ở localStorage
 *    `ev_cookie_consent` (xem `components/analytics/consent-banner.tsx`).
 */

import { useCallback, useMemo } from 'react';
import {
  buildViewItemEvent,
  buildAddToCartEvent,
  buildLockSuccessEvent,
  buildLockTimeoutEvent,
  buildBeginCheckoutEvent,
  buildAddPaymentInfoEvent,
  buildPurchaseEvent,
  buildViewCollectionEvent,
  type AddPaymentInfoParams,
  type BeginCheckoutParams,
  type LockSuccessParams,
  type LockTimeoutParams,
  type PaymentMethod,
  type PurchaseParams,
  type ViewCollectionParams,
  type ViewItemParams,
  type AddToCartParams,
} from '@/lib/analytics/events';
import type { OrderRow, OrderItemRow } from '@/lib/supabase/types';
import type { Product } from '@/lib/types';
import { CURRENCY } from '@/lib/utils';

const CONSENT_KEY = 'ev_cookie_consent';

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'set' | 'config' | 'consent' | 'js',
      eventName: string | Date,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

function push(event: { name: string; params: Record<string, unknown> }): void {
  if (typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', event.name, event.params);
  } catch {
    // silently ignore — analytics không được phép vỡ app
  }
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useJewelryAnalytics() {
  // Stable function refs — không cần useCallback cho mỗi event vì push()
  // cũng rẻ và pure, nhưng làm vậy giúp tránh re-render downstream nếu
  // object này được truyền vào dependency array.
  const viewItem = useCallback(
    (params: ViewItemParams) => push(buildViewItemEvent(params)),
    []
  );

  const addToCart = useCallback(
    (params: AddToCartParams) => push(buildAddToCartEvent(params)),
    []
  );

  const lockItemSuccess = useCallback(
    (params: LockSuccessParams) => push(buildLockSuccessEvent(params)),
    []
  );

  const lockItemTimeout = useCallback(
    (params: LockTimeoutParams) => push(buildLockTimeoutEvent(params)),
    []
  );

  const beginCheckout = useCallback(
    (params: BeginCheckoutParams) => push(buildBeginCheckoutEvent(params)),
    []
  );

  const addPaymentInfo = useCallback(
    (params: AddPaymentInfoParams) => push(buildAddPaymentInfoEvent(params)),
    []
  );

  const purchase = useCallback(
    (params: { order: OrderRow; items: OrderItemRow[] }) =>
      push(buildPurchaseEvent(params as PurchaseParams)),
    []
  );

  const viewCollection = useCallback(
    (params: ViewCollectionParams) => push(buildViewCollectionEvent(params)),
    []
  );

  // Tiện ích debug — chỉ dùng khi dev.
  const debugConsent = useCallback(() => {
    if (typeof window === 'undefined') return 'ssr';
    try {
      return window.localStorage.getItem(CONSENT_KEY) ?? 'unset';
    } catch {
      return 'unavailable';
    }
  }, []);

  return useMemo(
    () => ({
      viewItem,
      addToCart,
      lockItemSuccess,
      lockItemTimeout,
      beginCheckout,
      addPaymentInfo,
      purchase,
      viewCollection,
      /** Trả về 'granted' | 'denied' | 'unset' | 'ssr' | 'unavailable' */
      debugConsent,
      /** Currency code chuẩn của app (cho caller muốn override). */
      currency: CURRENCY,
    }),
    [
      viewItem,
      addToCart,
      lockItemSuccess,
      lockItemTimeout,
      beginCheckout,
      addPaymentInfo,
      purchase,
      viewCollection,
      debugConsent,
    ]
  );
}

/* -------------------------------------------------------------------------- */
/*  Re-export kiểu cho consumer dùng lại (vd. <CollectionViewTracker/>)        */
/* -------------------------------------------------------------------------- */

export type {
  PaymentMethod,
  AddPaymentInfoParams,
  BeginCheckoutParams,
  LockSuccessParams,
  LockTimeoutParams,
  PurchaseParams,
  ViewCollectionParams,
  ViewItemParams,
  AddToCartParams,
};

export type UseJewelryAnalytics = ReturnType<typeof useJewelryAnalytics>;

/** Helper type cho collection view tracker. */
export interface CollectionViewEventInput {
  collection: { id: string; name: string; slug: string };
  productCount: number;
}

/** Helper type cho PDP view_item (Pick từ Product domain type). */
export type ProductViewItemInput = Pick<
  Product,
  'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'
>;
