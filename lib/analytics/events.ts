/**
 * GA4 event payload builders — pure functions, không side effect.
 *
 * Tuân thủ schema GA4 ecommerce + custom event:
 *   - view_item, begin_checkout, add_payment_info, purchase  (recommended)
 *   - lock_item_success, lock_item_timeout, view_collection  (custom)
 *   - add_to_cart                                            (legacy, optional)
 *
 * Mọi giá trị tiền đều dùng số nguyên VND (không format). `CURRENCY` được
 * centralize trong `lib/utils.ts`.
 *
 * Hook phía client: `hooks/use-jewelry-analytics.ts`.
 */

import { CURRENCY } from '@/lib/utils';
import type {
  ProductCategory,
  Material,
  QualityTier,
  OrderRow,
  OrderItemRow,
} from '@/lib/supabase/types';
import type { Product } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Shared item shape (chuẩn GA4 ecommerce items[])                            */
/* -------------------------------------------------------------------------- */

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
  index?: number;
}

function toAnalyticsItem(
  p: Pick<Product, 'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'>,
  index?: number
): AnalyticsItem {
  return {
    item_id: p.id,
    item_name: p.title,
    item_category: p.category as ProductCategory,
    item_variant: `${p.material as Material} · ${p.quality_tier as QualityTier}`,
    price: p.price,
    quantity: 1,
    index,
  };
}

/* -------------------------------------------------------------------------- */
/*  1) view_item — Mount PDP                                                    */
/* -------------------------------------------------------------------------- */

export interface ViewItemParams {
  product: Pick<
    Product,
    'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'
  >;
  currency?: string;
}

export function buildViewItemEvent(
  params: ViewItemParams
): { name: string; params: Record<string, unknown> } {
  const { product, currency = CURRENCY } = params;
  return {
    name: 'view_item',
    params: {
      currency,
      value: product.price,
      items: [toAnalyticsItem(product, 0)],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  2) add_to_cart — legacy (giữ để tương thích nếu sau này bỏ lock flow)       */
/* -------------------------------------------------------------------------- */

export interface AddToCartParams {
  product: Pick<
    Product,
    'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'
  >;
  currency?: string;
}

export function buildAddToCartEvent(
  params: AddToCartParams
): { name: string; params: Record<string, unknown> } {
  const { product, currency = CURRENCY } = params;
  return {
    name: 'add_to_cart',
    params: {
      currency,
      value: product.price,
      items: [toAnalyticsItem(product)],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  3) lock_item_success — Custom event: lock API trả 200                       */
/* -------------------------------------------------------------------------- */

export interface LockSuccessParams {
  product: Pick<
    Product,
    'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'
  >;
  lockId: string;
  expiresAt: string; // ISO
  currency?: string;
}

export function buildLockSuccessEvent(
  params: LockSuccessParams
): { name: string; params: Record<string, unknown> } {
  const { product, lockId, expiresAt, currency = CURRENCY } = params;
  return {
    name: 'lock_item_success',
    params: {
      currency,
      product_id: product.id,
      product_name: product.title,
      category: product.category,
      material: product.material,
      quality_tier: product.quality_tier,
      price: product.price,
      value: product.price,
      lock_id: lockId,
      expires_at: expiresAt,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  4) lock_item_timeout — Custom event: countdown = 0                          */
/* -------------------------------------------------------------------------- */

export interface LockTimeoutParams {
  product: Pick<
    Product,
    'id' | 'title' | 'category' | 'price'
  >;
  /** Khoảng thời gian user đã giữ (ms). */
  lockDurationMs: number;
}

export function buildLockTimeoutEvent(
  params: LockTimeoutParams
): { name: string; params: Record<string, unknown> } {
  const { product, lockDurationMs } = params;
  return {
    name: 'lock_item_timeout',
    params: {
      product_id: product.id,
      product_name: product.title,
      category: product.category,
      price: product.price,
      lock_duration_ms: lockDurationMs,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  5) begin_checkout — User vào /thanh-toan                                    */
/* -------------------------------------------------------------------------- */

export interface BeginCheckoutParams {
  product: Pick<
    Product,
    'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'
  >;
  shippingFee?: number;
  currency?: string;
}

export function buildBeginCheckoutEvent(
  params: BeginCheckoutParams
): { name: string; params: Record<string, unknown> } {
  const { product, shippingFee = 0, currency = CURRENCY } = params;
  return {
    name: 'begin_checkout',
    params: {
      currency,
      value: product.price + shippingFee,
      items: [toAnalyticsItem(product, 0)],
      coupon: '',
      shipping: shippingFee,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  6) add_payment_info — User chọn MOMO / COD                                  */
/* -------------------------------------------------------------------------- */

export type PaymentMethod = 'MOMO' | 'COD' | 'BANK_TRANSFER';

export interface AddPaymentInfoParams {
  product: Pick<
    Product,
    'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'
  >;
  paymentMethod: PaymentMethod;
  shippingFee?: number;
  currency?: string;
}

export function buildAddPaymentInfoEvent(
  params: AddPaymentInfoParams
): { name: string; params: Record<string, unknown> } {
  const { product, paymentMethod, shippingFee = 0, currency = CURRENCY } = params;
  return {
    name: 'add_payment_info',
    params: {
      currency,
      value: product.price + shippingFee,
      payment_type: paymentMethod,
      items: [toAnalyticsItem(product, 0)],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  7) purchase — Order PAID (COD tạo xong / MoMo IPN resultCode=0)            */
/* -------------------------------------------------------------------------- */

export interface PurchaseParams {
  order: Pick<OrderRow, 'id' | 'code' | 'total_amount' | 'shipping_fee' | 'payment_method'>;
  items: OrderItemRow[];
  currency?: string;
}

export function buildPurchaseEvent(
  params: PurchaseParams
): { name: string; params: Record<string, unknown> } {
  const { order, items, currency = CURRENCY } = params;
  return {
    name: 'purchase',
    params: {
      currency,
      transaction_id: order.code,
      value: order.total_amount,
      shipping: order.shipping_fee ?? 0,
      payment_type: order.payment_method,
      coupon: '',
      items: items.map((oi, i) => ({
        item_id: oi.product_id,
        item_name: oi.snapshot_title,
        item_variant: oi.snapshot_material ?? undefined,
        price: oi.price,
        quantity: 1,
        index: i,
      })),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  8) view_collection — Mount /bo-suu-tap/[slug]                              */
/* -------------------------------------------------------------------------- */

export interface ViewCollectionParams {
  collection: { id: string; name: string; slug: string };
  productCount: number;
}

export function buildViewCollectionEvent(
  params: ViewCollectionParams
): { name: string; params: Record<string, unknown> } {
  const { collection, productCount } = params;
  return {
    name: 'view_collection',
    params: {
      collection_id: collection.id,
      collection_name: collection.name,
      collection_slug: collection.slug,
      product_count: productCount,
    },
  };
}
