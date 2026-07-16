// Database types — khớp 1-1 với schema trong supabase/migrations/0001 + 0002 + 0009
// Có thể regenerate bằng: npx supabase gen types typescript --project-id xxx
//
// Lưu ý: row types cho `addresses`, `wishlist_items`, `product_reviews` định nghĩa
// tại đây (không re-import từ `@/lib/types/account`) để tránh circular type import
// (`lib/types/account` cũng import `ProductRow` từ file này).
// `lib/types/account` re-export các type này để route files dùng chung.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type QualityTier = 'SSS' | 'SS' | 'S';
export type ProductCategory = 'NHAN' | 'DAY_CHUYEN' | 'BONG_TAI' | 'VONG_TAY' | 'MAT_DAY';
export type Material = 'BAC_925' | 'MA_VANG_18K' | 'MA_VANG_24K' | 'VANG_18K' | 'KIM_CUONG';
export type ProductStatus = 'AVAILABLE' | 'SOLD_OUT';
export type LockStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CONVERTED';
export type OrderStatus = 'NEW' | 'CONFIRMED' | 'SHIPPING' | 'DONE' | 'CANCELLED';
export type PaymentMethod = 'MOMO' | 'COD' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  display_order: number;
  launch_at: string | null;
  story_text: string | null;
  hero_gallery: string[];
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

export interface ProductRow {
  id: string;
  collection_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  material: Material;
  category: ProductCategory;
  image_url: string;
  gallery: string[];
  price: number;
  original_price: number | null;
  era: string | null;
  status: ProductStatus;
  is_featured: boolean;
  quality_tier: QualityTier;
  season_tags: string[];
  story_quote: string | null;
  story_body: string[];
  highlight_title: string | null;
  highlight_body: string | null;
  highlight_image: string | null;
  code: string | null;
  color: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSpecRow {
  id: string;
  product_id: string;
  label: string;
  value: string;
  display_order: number;
}

export interface InventoryLockRow {
  id: string;
  product_id: string;
  client_id: string;
  status: LockStatus;
  locked_at: string;
  expires_at: string;
  released_at: string | null;
  order_id: string | null;
}

export interface OrderRow {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  province: string | null;
  district: string | null;
  notes: string | null;
  total_amount: number;
  shipping_fee: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  price: number;
  snapshot_title: string;
  snapshot_image: string;
  snapshot_material: Material | null;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'customer' | 'admin';
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Migration 0009 — end-user account
// Mirror schema trong supabase/migrations/0009_user_account.sql.
// Cũng được re-export qua `lib/types/account.ts` cho route files (dùng chung 1 nguồn).
// ────────────────────────────────────────────────────────────────────────────

export interface AddressRow {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string;
  recipient_phone: string;
  address_line: string;
  province: string;
  district: string;
  ward: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishlistItemRow {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string | null;
  customer_name: string;
  rating: number;
  title: string | null;
  content: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// PostgREST-style Database type
export type Database = {
  public: {
    Tables: {
      collections:         { Row: CollectionRow;     Insert: Partial<CollectionRow>     & { name: string; slug: string }; Update: Partial<CollectionRow> };
      products:            { Row: ProductRow;        Insert: Partial<ProductRow>        & { title: string; slug: string; material: Material; category: ProductCategory; image_url: string; price: number; quality_tier: QualityTier }; Update: Partial<ProductRow> };
      product_specs:       { Row: ProductSpecRow;    Insert: Partial<ProductSpecRow>    & { product_id: string; label: string; value: string }; Update: Partial<ProductSpecRow> };
      inventory_locks:     { Row: InventoryLockRow;  Insert: Partial<InventoryLockRow>  & { product_id: string; client_id: string; expires_at: string }; Update: Partial<InventoryLockRow> };
      orders:              { Row: OrderRow;          Insert: Partial<OrderRow>          & { code: string; customer_name: string; customer_phone: string; total_amount: number; payment_method: PaymentMethod }; Update: Partial<OrderRow> };
      order_items:         { Row: OrderItemRow;      Insert: Partial<OrderItemRow>      & { order_id: string; product_id: string; price: number; snapshot_title: string; snapshot_image: string }; Update: Partial<OrderItemRow> };
      payment_transactions:{ Row: any;               Insert: any; Update: any };
      profiles:            { Row: ProfileRow;        Insert: Partial<ProfileRow>;        Update: Partial<ProfileRow> };
      // Migration 0009 — end-user account
      // `id`/timestamps: optional — Supabase tự generate/manage.
      // `user_id`: required NOT NULL. API routes set nó từ auth context (server-side), nên vẫn
      // cho phép trong Insert — không phải tự sinh được như id.
      addresses:           { Row: AddressRow;         Insert: Partial<Omit<AddressRow, 'id' | 'created_at' | 'updated_at'>>  & { user_id: string; recipient_name: string; recipient_phone: string; address_line: string; province: string; district: string }; Update: Partial<Omit<AddressRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>> };
      wishlist_items:      { Row: WishlistItemRow;    Insert: Omit<WishlistItemRow, 'id' | 'created_at'>; Update: never };
      product_reviews:     { Row: ReviewRow;          Insert: Partial<Omit<ReviewRow, 'id' | 'created_at' | 'updated_at' | 'is_approved'>>  & { product_id: string; customer_name: string; rating: number; content: string; user_id: string }; Update: Partial<Pick<ReviewRow, 'title' | 'content' | 'rating'>> };
    };
    Views: { [_ in never]: never };
    Functions: {
      lock_item:                  { Args: { p_product_id: string; p_client_id: string }; Returns: InventoryLockRow };
      confirm_payment:            { Args: { p_order_id: string; p_momo_trans_id: number }; Returns: null };
      link_guest_orders_to_user:  { Args: { p_user_id: string; p_phone: string }; Returns: number };
      is_verified_purchase:       { Args: { p_user_id: string; p_product_id: string }; Returns: boolean };
    };
    Enums: {
      quality_tier_enum:      QualityTier;
      product_category_enum:  ProductCategory;
      material_enum:          Material;
      product_status_enum:    ProductStatus;
      lock_status_enum:       LockStatus;
      order_status_enum:      OrderStatus;
      payment_method_enum:    PaymentMethod;
      payment_status_enum:    PaymentStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
