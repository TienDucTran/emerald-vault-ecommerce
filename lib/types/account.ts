/**
 * Shared types cho account APIs (addresses, wishlist, reviews).
 * Mirror schema trong supabase/migrations/0009_user_account.sql.
 *
 * Lưu ý: row types định nghĩa ở `lib/supabase/types.ts` (để tránh circular import
 * vì file đó cũng dùng các type này trong `Database['public']['Tables']`). File này
 * re-export + giữ alias cũ (`Address`, `WishlistItem`, `Review`) cho code đã import.
 */

import type { ProductRow, AddressRow, WishlistItemRow, ReviewRow } from '@/lib/supabase/types';

// Aliases để giữ tương thích với code đã dùng `Address` / `WishlistItem` / `Review`.
export type Address = AddressRow;
export type WishlistItem = WishlistItemRow;
export type Review = ReviewRow;

export type AddressInsert = Omit<Address, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AddressUpdate = Partial<
  Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

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

export type ReviewInsert = Omit<Review, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ReviewUpdate = Partial<
  Pick<Review, 'title' | 'content' | 'rating'>
>;
