// Type definitions for domain models. These match the Supabase schema in flows.md §2.

export type QualityTier = 'SSS' | 'SS' | 'S';
export type ProductCategory = 'NHAN' | 'DAY_CHUYEN' | 'BONG_TAI' | 'VONG_TAY' | 'MAT_DAY';
export type Material = 'BAC_925' | 'MA_VANG_18K' | 'MA_VANG_24K' | 'VANG_18K' | 'KIM_CUONG';
export type ProductStatus = 'AVAILABLE' | 'SOLD_OUT' | 'RESERVED';
export type OrderStatus = 'NEW' | 'CONFIRMED' | 'SHIPPING' | 'DONE' | 'CANCELLED';
export type PaymentMethod = 'MOMO' | 'COD' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  is_published: boolean;
  display_order: number;
  created_at?: string;
  // New fields (flows.md §16.4)
  launch_at?: string;
  story_text?: string;
  hero_gallery?: string[];
  meta_title?: string;
  meta_description?: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  collection_id?: string;
  title: string;
  slug: string;
  description?: string;
  material: Material;
  category: ProductCategory;
  image_url: string;
  gallery?: string[];
  price: number;
  /** Original price (strikethrough) — Figma detail page */
  original_price?: number;
  /** Era / provenance subtitle — e.g. "Vàng 18K & Kim Cương Tự Nhiên | Nhật Bản thập niên 1960" */
  era?: string;
  /** SKU code hiển thị (vd: 'EV-0001') — match DB column products.code */
  code?: string;
  /** Màu chủ đạo (free-text, vd: 'Bạc ánh trăng') — match DB column products.color */
  color?: string;
  status: ProductStatus;
  is_featured: boolean;
  quality_tier: QualityTier;
  season_tags: string[];
  created_at?: string;
  updated_at?: string;
  /** Storytelling section — Figma detail page */
  story_quote?: string;
  story_body?: string[];
  highlight_title?: string;
  highlight_body?: string;
  highlight_image?: string;
  /** Technical specs for accordion — Figma detail page */
  specs?: ProductSpec[];
}

export interface InventoryLock {
  id: string;
  product_id: string;
  client_id: string;
  status: 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CONVERTED';
  locked_at: string;
  expires_at: string;
  released_at?: string;
  order_id?: string;
}

export interface Order {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  province?: string;
  district?: string;
  notes?: string;
  total_amount: number;
  shipping_fee: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  price: number;
  snapshot_title: string;
  snapshot_image: string;
  snapshot_material?: Material;
}
