// Server-side query cho admin products layer.
// Khác lib/supabase/queries/products.ts:
//   - dùng service-role client (createAdminClient) — bypass RLS
//   - KHÔNG filter status='AVAILABLE' — trả tất cả (AVAILABLE + SOLD_OUT)
//   - hỗ trợ keyword search, filter đầy đủ, pagination, count

import { createAdminClient } from '@/lib/supabase/admin';
import type { ProductRow } from '@/lib/supabase/types';
import type { ProductListQuery } from '@/lib/admin/products-schema';

export type AdminProduct = ProductRow;

export interface ListAdminProductsResult {
  data: AdminProduct[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Sanitize keyword trước khi nội suy vào PostgREST `or` filter.
 * Loại bỏ các ký tự đặc biệt có thể phá vỡ cú pháp PostgREST: % _ , ( )
 * để tránh PostgREST injection hoặc lỗi parse.
 */
function sanitizeKeyword(kw: string): string {
  return kw.replace(/[%_,()]/g, '');
}

export async function listAdminProducts(
  params: ProductListQuery
): Promise<ListAdminProductsResult> {
  const supabase = createAdminClient();
  const { page, pageSize } = params;

  let q = supabase
    .from('products')
    .select('*', { count: 'exact' });

  if (params.keyword) {
    const kw = sanitizeKeyword(params.keyword);
    if (kw.length > 0) {
      q = q.or(`title.ilike.%${kw}%,slug.ilike.%${kw}%`);
    }
  }
  if (params.category) q = q.eq('category', params.category);
  if (params.material) q = q.eq('material', params.material);
  if (params.tier) q = q.eq('quality_tier', params.tier);
  if (params.status) q = q.eq('status', params.status);
  if (params.is_featured) q = q.eq('is_featured', params.is_featured === 'true');
  if (params.collection_id) q = q.eq('collection_id', params.collection_id);

  q = q.order('created_at', { ascending: false });

  const from = (page - 1) * pageSize;
  q = q.range(from, from + pageSize - 1);

  const { data, error, count } = await q;
  if (error) throw error;

  return {
    data: (data ?? []) as AdminProduct[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAdminProductById(id: string): Promise<AdminProduct | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as AdminProduct | null) ?? null;
}
