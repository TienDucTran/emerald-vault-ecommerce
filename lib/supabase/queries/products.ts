// Server-side query functions cho products
// Mỗi filter = 1 function, gọi từ Server Components / Server Actions
// Pattern: build query PostgREST động dựa trên filter object

import { createClient } from '@/lib/supabase/server';
import type { ProductRow, ProductCategory, Material, QualityTier } from '@/lib/supabase/types';

const PRODUCT_BASIC = 'id, slug, code, title, material, category, image_url, gallery, price, original_price, status, is_featured, quality_tier, season_tags, color, collection_id, created_at' as const;
const PRODUCT_FULL = `${PRODUCT_BASIC}, description, era, story_quote, story_body, highlight_title, highlight_body, highlight_image, meta_title, meta_description, updated_at` as const;

export type ProductBasic = Pick<ProductRow,
  'id' | 'slug' | 'code' | 'title' | 'material' | 'category' | 'image_url' | 'gallery' |
  'price' | 'original_price' | 'status' | 'is_featured' | 'quality_tier' | 'season_tags' |
  'color' | 'collection_id' | 'created_at'
>;

// ============ CÁC FILTER RIÊNG BIỆT ============

/** Nổi bật (homepage featured, GA4 tracking) */
export async function getFeaturedProducts(limit = 4): Promise<ProductBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .eq('is_featured', true)
    .eq('status', 'AVAILABLE')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductBasic[];
}

/** Mới nhất (sort theo created_at DESC) */
export async function getNewestProducts(limit = 8): Promise<ProductBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .eq('status', 'AVAILABLE')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductBasic[];
}

/** Theo danh mục (NHAN, DAY_CHUYEN, ...) */
export async function getProductsByCategory(category: ProductCategory, limit = 50): Promise<ProductBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .eq('category', category)
    .eq('status', 'AVAILABLE')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductBasic[];
}

/** Theo chất liệu (BAC_925, VANG_18K, ...) */
export async function getProductsByMaterial(material: Material, limit = 50): Promise<ProductBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .eq('material', material)
    .eq('status', 'AVAILABLE')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductBasic[];
}

/** Theo tier (SSS, SS, S) — vd: trang "Tuyệt phẩm SSS" */
export async function getProductsByTier(tier: QualityTier, limit = 50): Promise<ProductBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .eq('quality_tier', tier)
    .eq('status', 'AVAILABLE')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductBasic[];
}

/** Theo mùa (SUMMER_2026, VINTAGE_AUTUMN, ...) — dùng GIN index */
export async function getProductsBySeason(season: string, limit = 50): Promise<ProductBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .contains('season_tags', [season])
    .eq('status', 'AVAILABLE')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductBasic[];
}

/** Theo bộ sưu tập (collection_id) */
export async function getProductsByCollection(collectionId: string, limit = 100): Promise<ProductBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .eq('collection_id', collectionId)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductBasic[];
}

/** Liên quan (cùng collection hoặc cùng category, loại trừ self) */
export async function getRelatedProducts(productId: string, limit = 4): Promise<ProductBasic[]> {
  const supabase = createClient();
  // Lấy product hiện tại để biết collection + category
  const { data: current, error: e1 } = await supabase
    .from('products')
    .select('collection_id, category')
    .eq('id', productId)
    .single();
  if (e1 || !current) return [];
  // Cast vì Supabase type narrowing khiến row bị narrow về `never`
  // (xem docs/ts-errors-cleanup.md nhóm 6).
  const currentRow = current as { collection_id: string | null; category: ProductCategory };

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .neq('id', productId)
    .or(`collection_id.eq.${currentRow.collection_id},category.eq.${currentRow.category}`)
    .eq('status', 'AVAILABLE')
    .order('is_featured', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProductBasic[];
}

/** Search full-text + filter combo (dùng cho page /san-pham) */
export interface SearchParams {
  keyword?: string;
  category?: ProductCategory;
  material?: Material;
  tier?: QualityTier;
  season?: string;
  collectionId?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyAvailable?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'featured';
  page?: number;
  pageSize?: number;
}

export async function searchProducts(params: SearchParams = {}) {
  const supabase = createClient();
  const { page = 1, pageSize = 20, sort = 'newest', onlyAvailable = true } = params;

  let q = supabase.from('products').select(PRODUCT_BASIC, { count: 'exact' });
  if (params.keyword)        q = q.ilike('title', `%${params.keyword}%`);
  if (params.category)       q = q.eq('category', params.category);
  if (params.material)       q = q.eq('material', params.material);
  if (params.tier)           q = q.eq('quality_tier', params.tier);
  if (params.season)         q = q.contains('season_tags', [params.season]);
  if (params.collectionId)   q = q.eq('collection_id', params.collectionId);
  if (params.minPrice)       q = q.gte('price', params.minPrice);
  if (params.maxPrice)       q = q.lte('price', params.maxPrice);
  if (onlyAvailable) {
    q = q.eq('status', 'AVAILABLE');
  } else {
    // Include RESERVED too (but never SOLD_OUT)
    q = q.neq('status', 'SOLD_OUT');
  }

  // Sort
  if (sort === 'newest')          q = q.order('created_at', { ascending: false });
  else if (sort === 'price_asc')  q = q.order('price', { ascending: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false });
  else                            q = q.order('is_featured', { ascending: false }).order('created_at', { ascending: false });

  // Pagination
  const from = (page - 1) * pageSize;
  q = q.range(from, from + pageSize - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: (data ?? []) as ProductBasic[], total: count ?? 0, page, pageSize };
}

/**
 * Counts per filter dimension (category / material / tier).
 * - `onlyAvailable: true`  → count chỉ AVAILABLE (khi "Chỉ xem hàng còn" BẬT).
 * - `onlyAvailable: false` → count AVAILABLE + RESERVED (khi "Chỉ xem hàng còn" TẮT).
 *   SOLD_OUT luôn bị loại (terminal).
 * Counts độc lập giữa các dimension (không áp filter khác khi tính count).
 * Dùng in-memory vì catalog nhỏ (~50–200 sp). Khi scale lên, chuyển sang RPC GROUP BY.
 */
export interface FilterCounts {
  category: Record<string, number>;
  material: Record<string, number>;
  tier: Record<string, number>;
  /** Tổng AVAILABLE (dùng làm mẫu số "Y" khi `onlyAvailable: true`). */
  availableTotal: number;
  /** Tổng AVAILABLE + RESERVED (dùng làm mẫu số "Y" khi `onlyAvailable: false`). */
  grandTotal: number;
}

export async function getFilterCounts(opts: { onlyAvailable: boolean }): Promise<FilterCounts> {
  const supabase = createClient();
  // Lấy tối thiểu field cần thiết để group. 1 query duy nhất.
  // SOLD_OUT bị loại ngay tại DB (terminal, không bao giờ tính).
  const { data, error } = await supabase
    .from('products')
    .select('category, material, quality_tier, status')
    .neq('status', 'SOLD_OUT');

  if (error) throw error;

  const rows = (data ?? []) as { category: string; material: string; quality_tier: string; status: string }[];
  const availableRows = rows.filter((r) => r.status === 'AVAILABLE');

  const counts: FilterCounts = {
    category: {},
    material: {},
    tier: {},
    availableTotal: availableRows.length,
    grandTotal: rows.length,
  };

  const source = opts.onlyAvailable ? availableRows : rows;

  for (const row of source) {
    counts.category[row.category] = (counts.category[row.category] ?? 0) + 1;
    counts.material[row.material] = (counts.material[row.material] ?? 0) + 1;
    counts.tier[row.quality_tier] = (counts.tier[row.quality_tier] ?? 0) + 1;
  }

  return counts;
}

/** Chi tiết 1 sản phẩm (kèm specs) */
export async function getProductBySlug(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(`${PRODUCT_FULL}, product_specs(id,label,value,display_order)`)
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data as (ProductRow & { product_specs: { id: string; label: string; value: string; display_order: number }[] }) | null;
}

/** Lấy 1 sản phẩm theo code (tra cứu nhanh) */
export async function getProductByCode(code: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_BASIC)
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data as ProductBasic | null;
}
