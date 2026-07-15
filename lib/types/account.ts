/**
 * Shared types cho account APIs (addresses, wishlist, reviews).
 * Mirror schema trong supabase/migrations/0009_user_account.sql.
 */

import type { ProductRow } from '@/lib/supabase/types';

export interface Address {
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

export type AddressInsert = Omit<Address, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AddressUpdate = Partial<
  Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export type ProductBasic = Pick<
  ProductRow,
  | 'id'
  | 'slug'
  | 'title'
  | 'image_url'
  | 'price'
  | 'original_price'
  | 'status'
  | 'category'
  | 'material'
>;

export interface WishlistItemWithProduct extends WishlistItem {
  product: ProductBasic | null;
}

export interface Review {
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

export type ReviewInsert = Omit<Review, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ReviewUpdate = Partial<
  Pick<Review, 'title' | 'content' | 'rating'>
>;
