/**
 * Zod schemas — single source of truth cho admin product validation.
 *
 * Dùng bởi:
 *   - POST   /api/admin/products           (CreateProductSchema)
 *   - PATCH  /api/admin/products/:id       (UpdateProductSchema = partial)
 *   - POST   /api/admin/products/bulk      (BulkProductsSchema)
 *   - GET    /api/admin/products           (ProductListQuerySchema — query string)
 *   - lib/supabase/queries/admin-products  (type ProductListQuery)
 *
 * Mọi route handler + query layer đều import từ file này để tránh trùng lặp
 * validation logic. Enum values phải khớp 1-1 với Postgres enum trong
 * supabase/migrations/0001 + 0002 và Material/ProductCategory/QualityTier/ProductStatus
 * trong lib/supabase/types.ts.
 */
import { z } from 'zod';

export const ProductMaterialEnum = z.enum([
  'BAC_925',
  'MA_VANG_18K',
  'MA_VANG_24K',
  'VANG_18K',
  'KIM_CUONG',
]);
export const ProductCategoryEnum = z.enum([
  'NHAN',
  'DAY_CHUYEN',
  'BONG_TAI',
  'VONG_TAY',
  'MAT_DAY',
]);
export const ProductTierEnum = z.enum(['SSS', 'SS', 'S']);
export const ProductStatusEnum = z.enum(['AVAILABLE', 'SOLD_OUT']);

/**
 * URL/relative-path validator: chấp nhận
 *   - http://...  /  https://...
 *   - đường dẫn tương đối bắt đầu bằng /
 * Tối đa 2000 ký tự.
 */
const imageUrlRule = z
  .string()
  .min(1)
  .max(2000)
  .refine(
    (v) => /^https?:\/\//i.test(v) || v.startsWith('/'),
    'Must be a valid URL (http/https) or a relative path starting with /'
  );

const seasonTagSchema = z.string().min(1).max(50);

export const CreateProductSchema = z.object({
  title: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        'slug must be lowercase, digits and dashes only (no leading/trailing/consecutive dashes)',
    }),
  material: ProductMaterialEnum,
  category: ProductCategoryEnum,
  image_url: imageUrlRule,
  price: z.number().int().positive().max(999_999_999_999),
  quality_tier: ProductTierEnum,

  code: z.string().min(1).max(40).optional(),
  color: z.string().min(1).max(60).optional(),
  description: z.string().max(5000).nullable().optional(),
  original_price: z.number().int().nonnegative().optional(),
  era: z.string().max(255).optional(),
  status: ProductStatusEnum.optional(),
  is_featured: z.boolean().optional(),
  season_tags: z.array(seasonTagSchema).max(20).optional(),
  collection_id: z.string().uuid().optional(),
  gallery: z.array(imageUrlRule).max(20).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const BulkProductsSchema = z.object({
  products: z.array(CreateProductSchema).min(1).max(500),
  /**
   * Nếu true: fail cả batch khi có 1 row lỗi.
   * Nếu false (mặc định): insert từng row, thu thập per-row errors, vẫn insert
   * những row hợp lệ.
   */
  atomic: z.boolean().optional().default(false),
});

export const ProductListQuerySchema = z.object({
  keyword: z.string().min(1).max(200).optional(),
  category: ProductCategoryEnum.optional(),
  material: ProductMaterialEnum.optional(),
  tier: ProductTierEnum.optional(),
  status: ProductStatusEnum.optional(),
  is_featured: z.enum(['true', 'false']).optional(),
  collection_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type BulkProductsInput = z.infer<typeof BulkProductsSchema>;
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;
