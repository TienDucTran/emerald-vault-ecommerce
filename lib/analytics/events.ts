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
  /**
   * Single product (legacy) — dùng khi chỉ có 1 sản phẩm.
   * Khi có nhiều sản phẩm, truyền `products: [...]` để GA4 nhận đầy đủ items[].
   */
  product?: Pick<
    Product,
    'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'
  >;
  /** Danh sách sản phẩm trong giỏ (ưu tiên hơn `product` nếu truyền cả hai). */
  products?: Array<
    Pick<
      Product,
      'id' | 'title' | 'category' | 'material' | 'quality_tier' | 'price'
    >
  >;
  shippingFee?: number;
  currency?: string;
}

export function buildBeginCheckoutEvent(
  params: BeginCheckoutParams
): { name: string; params: Record<string, unknown> } {
  const { product, products, shippingFee = 0, currency = CURRENCY } = params;
  const items = (products && products.length > 0
    ? products
    : product
    ? [product]
    : []
  ).map((p, i) => toAnalyticsItem(p, i));
  const value = items.reduce((sum, it) => sum + it.price * it.quantity, 0) + shippingFee;
  return {
    name: 'begin_checkout',
    params: {
      currency,
      value,
      items,
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

/* -------------------------------------------------------------------------- */
/*  9) chat_opened — User mở chat panel (bubble click)                          */
/* -------------------------------------------------------------------------- */

export interface ChatOpenedParams {
  session_id: string;
  /** User đã từng mở chat trước đó (đánh dấu qua localStorage). */
  is_returning_user: boolean;
}

export function buildChatOpenedEvent(
  params: ChatOpenedParams
): { name: string; params: Record<string, unknown> } {
  return {
    name: 'chat_opened',
    params: {
      session_id: params.session_id,
      is_returning_user: params.is_returning_user,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  10) chat_message_sent — User gửi 1 message qua input                        */
/* -------------------------------------------------------------------------- */

export interface ChatMessageSentParams {
  session_id: string;
  /** Độ dài message (ký tự, content.length). */
  message_length: number;
  /** Lịch sử trước đó đã có assistant message render product card chưa. */
  has_product_in_history: boolean;
}

export function buildChatMessageSentEvent(
  params: ChatMessageSentParams
): { name: string; params: Record<string, unknown> } {
  return {
    name: 'chat_message_sent',
    params: {
      session_id: params.session_id,
      message_length: params.message_length,
      has_product_in_history: params.has_product_in_history,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  11) chat_product_clicked — Click vào product card trong chat                */
/* -------------------------------------------------------------------------- */

export type ChatProductSource = 'inline_card' | 'featured' | 'related';

export interface ChatProductClickedParams {
  product_id: string;
  product_slug: string;
  product_price: number;
  /** Vị trí card xuất hiện trong panel. */
  source: ChatProductSource;
}

export function buildChatProductClickedEvent(
  params: ChatProductClickedParams
): { name: string; params: Record<string, unknown> } {
  return {
    name: 'chat_product_clicked',
    params: {
      product_id: params.product_id,
      product_slug: params.product_slug,
      product_price: params.product_price,
      source: params.source,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  12) chat_lead_captured — Tool captureLead thành công                         */
/* -------------------------------------------------------------------------- */

export type ChatContactType = 'phone' | 'email' | 'zalo';

export interface ChatLeadCapturedParams {
  session_id: string;
  contact_type: ChatContactType;
  /** Có match với product nào user đang quan tâm không. */
  has_matched_product: boolean;
}

export function buildChatLeadCapturedEvent(
  params: ChatLeadCapturedParams
): { name: string; params: Record<string, unknown> } {
  return {
    name: 'chat_lead_captured',
    params: {
      session_id: params.session_id,
      contact_type: params.contact_type,
      has_matched_product: params.has_matched_product,
    },
  };
}
