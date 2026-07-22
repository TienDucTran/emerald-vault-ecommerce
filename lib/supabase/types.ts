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
export type OrderStatus =
  | 'NEW'
  | 'WAITING_PAYMENT'
  | 'WAITING_CONFIRM'
  | 'CONFIRMED'
  | 'SHIPPING'
  | 'DONE'
  | 'CANCELLED';
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

export interface NewsletterSubscriberRow {
  id: string;
  email: string;
  full_name: string | null;
  source: string | null;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
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
      // Migration 0006 — newsletter subscribers
      newsletter_subscribers: { Row: NewsletterSubscriberRow; Insert: Partial<Omit<NewsletterSubscriberRow, 'id' | 'subscribed_at'>> & { email: string }; Update: Partial<Pick<NewsletterSubscriberRow, 'is_active' | 'full_name' | 'source'>> };
      // Migration 0012-0017 — AI Chatbot + Knowledge Base
      chat_sessions:         { Row: ChatSessionRow;     Insert: Omit<ChatSessionRow, 'id' | 'started_at' | 'last_message_at'> & { id?: string; started_at?: string; last_message_at?: string }; Update: Partial<ChatSessionRow> };
      chat_messages:         { Row: ChatMessageRow;     Insert: Omit<ChatMessageRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<ChatMessageRow> };
      chat_leads:            { Row: ChatLeadRow;        Insert: Omit<ChatLeadRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<ChatLeadRow> };
      chat_knowledge:        { Row: ChatKnowledgeRow;   Insert: Omit<ChatKnowledgeRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<ChatKnowledgeRow> };
      chat_faqs:             { Row: ChatFaqRow;         Insert: Omit<ChatFaqRow, 'id' | 'created_at' | 'updated_at' | 'view_count'> & { id?: string; created_at?: string; updated_at?: string; view_count?: number }; Update: Partial<ChatFaqRow> };
      upcoming_products:     { Row: UpcomingProductRow; Insert: Omit<UpcomingProductRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<UpcomingProductRow> };
      upcoming_collections:  { Row: UpcomingCollectionRow; Insert: Omit<UpcomingCollectionRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<UpcomingCollectionRow> };
      chat_promotions:       { Row: ChatPromotionRow;   Insert: Omit<ChatPromotionRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<ChatPromotionRow> };
    };
    Views: { [_ in never]: never };
    Functions: {
      lock_item:                  { Args: { p_product_id: string; p_client_id: string }; Returns: InventoryLockRow };
      confirm_payment:            { Args: { p_order_id: string; p_momo_trans_id: number }; Returns: null };
      link_guest_orders_to_user:  { Args: { p_user_id: string; p_phone: string }; Returns: number };
      link_my_guest_orders:       { Args: Record<string, never>; Returns: number };
      is_verified_purchase:       { Args: { p_user_id: string; p_product_id: string }; Returns: boolean };
      match_products:             { Args: { query_embedding: number[]; match_count?: number }; Returns: Array<{ id: string; title: string; slug: string; price: number; image_url: string; material: Material; quality_tier: QualityTier; similarity: number }> };
      upsert_chat_session:        { Args: { p_client_id: string; p_user_id: string | null }; Returns: ChatSessionRow };
      update_product_embedding:    { Args: { p_id: string; p_vec: string }; Returns: null };
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

// ────────────────────────────────────────────────────────────────────────────
// Migration 0012-0017 — AI Chatbot + Knowledge Base
// Thêm row types + Database interface extends để typed query trả về đúng type.
// ────────────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system';
export type LeadContactType = 'phone' | 'email' | 'zalo';
export type DiscountType = 'percent' | 'fixed' | 'shipping' | 'gift';
export type KnowledgeCategory =
  | 'shipping'
  | 'return'
  | 'warranty'
  | 'payment'
  | 'about'
  | 'contact'
  | 'care'
  | 'size'
  | 'general';

export interface ChatSessionRow {
  id: string;
  client_id: string;
  user_id: string | null;
  started_at: string;
  last_message_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  tool_calls: Json | null;
  tool_results: Json | null;
  tokens_used: number | null;
  created_at: string;
}

export interface ChatLeadRow {
  id: string;
  session_id: string;
  user_id: string | null;
  contact_type: LeadContactType;
  contact_value: string;
  intent: string | null;
  matched_product_id: string | null;
  created_at: string;
}

export interface ChatKnowledgeRow {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string[] | null;
  priority: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatFaqRow {
  id: string;
  question: string;
  answer: string;
  keywords: string[] | null;
  category: string | null;
  display_order: number;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface UpcomingProductRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_pitch: string | null;
  estimated_price: number | null;
  material: Material | null;
  category: ProductCategory | null;
  cover_image_url: string | null;
  gallery: string[] | null;
  expected_launch_date: string | null;
  notify_enabled: boolean;
  is_announced: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpcomingCollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  theme: string | null;
  cover_image_url: string | null;
  teaser_note: string | null;
  expected_launch_date: string | null;
  is_announced: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatPromotionRow {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  discount_type: DiscountType;
  discount_value: number | null;
  min_order_value: number | null;
  applicable_categories: string[] | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

// Extend Database với các bảng chatbot — không dùng declare module (conflict với Database export).
// Các types đã được merge trực tiếp vào Database interface ở trên.
