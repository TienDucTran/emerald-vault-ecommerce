// lib/chatbot/tools.ts
// Tools cho AI SDK v6 (inputSchema, execute(input, options)) — §15.5
// Dùng createAdminClient() vì tools chạy server-side trong route handler (bypass RLS).
// Mỗi tool (trừ captureLead) được wrap với LRU cache (tool-cache.ts) + analytics logger (analytics.ts).
import { AsyncLocalStorage } from 'node:async_hooks';
import { tool } from 'ai';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { cachedToolCall, buildCacheKey, getDefaultTtl } from './tool-cache';
import { logToolCall } from './analytics';
import { escapeIlikePattern, unaccentIlikePattern } from './ilike-escape';
import { redactPII } from '@/lib/log/redact';

// Spam prevention cho captureLead: tối đa 3 leads / session / 5 phút.
// In-memory Map; acceptable cho single-instance Vercel deployment.
// Nếu scale multi-instance cần chuyển sang Redis/Upstash.
const _leadSpamCounter = new Map<string, { count: number; resetAt: number }>();
const LEAD_MAX_PER_SESSION = 3;
const LEAD_WINDOW_MS = 5 * 60 * 1000;

function isLeadSpam(sessionId: string): boolean {
  const now = Date.now();
  const entry = _leadSpamCounter.get(sessionId);
  if (!entry || entry.resetAt < now) {
    _leadSpamCounter.set(sessionId, { count: 1, resetAt: now + LEAD_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > LEAD_MAX_PER_SESSION;
}

// ---------------------------------------------------------------------------
// Helper: optional field mà chấp nhận null (LLM thỉnh thoảng pass null
// cho optional params thay vì bỏ qua). Zod mặc định reject null cho
// .optional(); AI SDK v6 strict mode của provider (Groq, OpenAI) cũng
// reject → "parameters for tool X did not match schema".
//
// Pattern: preprocess strip null → undefined rồi mới validate schema optional.
// Tương đương: `z.preprocess(v => v ?? undefined, baseSchema.optional())`.
//
// Dùng cho: z.string().optional(), z.number().optional(), z.enum([...]).optional(), z.boolean().
// ---------------------------------------------------------------------------

/**
 * Optional + nullable: chấp nhận string | null | undefined, trả về string | undefined.
 * Null → undefined (để optional schema validate pass).
 */
const optionalString = z.preprocess(
  (v) => (v === null ? undefined : v),
  z.string().optional()
);

/**
 * Optional + nullable number: chấp nhận number | null | undefined.
 */
const optionalNumber = z.preprocess(
  (v) => (v === null ? undefined : v),
  z.number().optional()
);

/**
 * Optional + nullable enum: tạo helper động vì z.enum() không thể reuse generic.
 */
function optionalEnum<T extends [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (v === null ? undefined : v),
    z.enum(values).optional()
  );
}

/**
 * Optional + nullable boolean.
 */
const optionalBoolean = z.preprocess(
  (v) => (v === null ? undefined : v),
  z.boolean().optional()
);

// Per-request context holder. The route handler sets this BEFORE calling
// streamText() so every tool call can read sessionId/userId/provider/model.
// This replaces the removed AI SDK v6 `experimental_context` option.
//
// Fix #3 (sprint 2026-07-27): chuyển từ module-level `let _currentCtx` sang
// AsyncLocalStorage. Lý do: module-level state share giữa MỌI concurrent request
// trong cùng Vercel instance (Node.js process) → race condition khi 2 request
// song song. Request A set context → streamText fire tool calls → Request B start
// và clearChatContext() → tool call của A chạy với B's context (hoặc null) →
// lead capture vào sai session, analytics log sai userId/provider.
//
// AsyncLocalStorage (Node.js built-in) lưu context theo async execution chain
// → mỗi request có snapshot riêng, không bị concurrent request overwrite.
type ChatCtx = {
  sessionId: string;
  userId: string | null;
  provider: string;
  model: string;
};

const _ctxStorage = new AsyncLocalStorage<ChatCtx>();

/**
 * Run callback với context scope riêng (ALS pattern). Route handler wrap toàn bộ
 * request logic trong đây → mọi tool call trong scope tự động có ctx riêng.
 *
 * Usage trong route handler:
 *   return await runWithChatContext(initialCtx, async () => {
 *     // ... logic handler, có thể setChatContext(updatedCtx) để update sau
 *   });
 */
export function runWithChatContext<T>(ctx: ChatCtx, fn: () => T): T {
  return _ctxStorage.run(ctx, fn);
}

/**
 * Set/update context trong scope hiện tại. Phải gọi TRONG `runWithChatContext`.
 * Dùng `enterWith` để các async continuation phía sau (tool call) thấy ctx mới
 * mà không cần tạo nested scope.
 */
export function setChatContext(ctx: ChatCtx): void {
  // enterWith makes subsequent reads (in same async chain) return new ctx,
  // without creating a nested scope.
  _ctxStorage.enterWith(ctx);
}

/**
 * Clear context khi request xong. Vì ALS scope auto-cleanup khi `run` callback
 * return, function này chủ yếu để tương thích API cũ + log. Không có tác dụng
 * race-prevention thật (đã có scope-based isolation).
 */
export function clearChatContext(): void {
  // No-op: ALS scope tự cleanup khi runWithChatContext return.
  // Giữ function để tương thích route handler (gọi trong finally).
}

/**
 * Read current context (in-scope only). Returns null nếu gọi ngoài ALS scope.
 */
function getChatContext(): ChatCtx | null {
  return _ctxStorage.getStore() ?? null;
}

// Map tên tiếng Việt → enum (giúp AI hiểu "bạc 925" / "nhẫn bạc" → BAC_925 / NHAN)
const MATERIAL_VI: Record<string, string> = {
  'bạc 925': 'BAC_925',
  'bac 925': 'BAC_925',
  'bac': 'BAC_925',
  'bạc': 'BAC_925',
  'mạ vàng 18k': 'MA_VANG_18K',
  'ma vang 18k': 'MA_VANG_18K',
  'mạ vàng 24k': 'MA_VANG_24K',
  'ma vang 24k': 'MA_VANG_24K',
  'mạ vàng': 'MA_VANG_24K',
  'vàng 18k': 'VANG_18K',
  'vang 18k': 'VANG_18K',
  'vàng': 'VANG_18K',
  'vang': 'VANG_18K',
  'kim cương': 'KIM_CUONG',
  'kim cuong': 'KIM_CUONG',
  'diamond': 'KIM_CUONG',
};

const CATEGORY_VI: Record<string, string> = {
  'nhẫn': 'NHAN',
  'nhan': 'NHAN',
  'ring': 'NHAN',
  'dây chuyền': 'DAY_CHUYEN',
  'day chuyen': 'DAY_CHUYEN',
  'necklace': 'DAY_CHUYEN',
  'bông tai': 'BONG_TAI',
  'bong tai': 'BONG_TAI',
  'earring': 'BONG_TAI',
  'hoa tai': 'BONG_TAI',
  'vòng tay': 'VONG_TAY',
  'vong tay': 'VONG_TAY',
  'bracelet': 'VONG_TAY',
  'mặt dây': 'MAT_DAY',
  'mat day': 'MAT_DAY',
  'pendant': 'MAT_DAY',
  'mặt dây chuyền': 'MAT_DAY',
};

export const MATERIAL_LABEL: Record<string, string> = {
  BAC_925: 'Bạc 925',
  MA_VANG_18K: 'Mạ vàng 18K',
  MA_VANG_24K: 'Mạ vàng 24K',
  VANG_18K: 'Vàng 18K',
  KIM_CUONG: 'Kim cương',
};

export const CATEGORY_LABEL: Record<string, string> = {
  NHAN: 'nhẫn',
  DAY_CHUYEN: 'dây chuyền',
  BONG_TAI: 'bông tai',
  VONG_TAY: 'vòng tay',
  MAT_DAY: 'mặt dây chuyền',
};

function detectMaterial(text: string): string | null {
  const t = text.toLowerCase();
  for (const key of Object.keys(MATERIAL_VI).sort((a, b) => b.length - a.length)) {
    if (t.includes(key)) return MATERIAL_VI[key];
  }
  return null;
}

function detectCategory(text: string): string | null {
  const t = text.toLowerCase();
  for (const key of Object.keys(CATEGORY_VI).sort((a, b) => b.length - a.length)) {
    if (t.includes(key)) return CATEGORY_VI[key];
  }
  return null;
}

export function detectPhone(text: string): string | null {
  const m = text.match(/(\+?84|0)\d{9,10}\b/);
  return m ? m[0] : null;
}

export function detectEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

export function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

// Helper: lấy sessionId/userId/provider/model từ per-request context holder.
// (Replaces AI SDK v6-removed `options.experimental_context`.)
//
// Đọc từ AsyncLocalStorage (in-scope) hoặc fallback `_externalCtx` (out-of-scope
// callbacks như onFinish chạy qua waitUntil sau khi response đã return).
function extractCtx(): {
  sessionId: string | null;
  userId: string | null;
  provider: string | null;
  model: string | null;
} {
  const ctx = getChatContext();
  if (!ctx) {
    return { sessionId: null, userId: null, provider: null, model: null };
  }
  return {
    sessionId: ctx.sessionId,
    userId: ctx.userId,
    provider: ctx.provider,
    model: ctx.model,
  };
}

export const searchProducts = tool({
  description:
    'Tìm sản phẩm theo tên, danh mục, chất liệu, giá, tier. LUÔN dùng tool này (hoặc semanticSearch) trước khi trả lời về sản phẩm. Tool tự map tiếng Việt → enum.',
  inputSchema: z.object({
    keyword: optionalString.describe('Tên/mô tả/mục đích sản phẩm (tiếng Việt)'),
    category: optionalEnum(['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY'])
      .describe('Loại trang sức'),
    material: optionalEnum(['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG'])
      .describe('Chất liệu'),
    qualityTier: optionalEnum(['SSS', 'SS', 'S']),
    minPrice: optionalNumber.describe('Giá tối thiểu (VND)'),
    maxPrice: optionalNumber.describe('Giá tối đa (VND)'),
    onlyAvailable: z.boolean().default(true),
    limit: z.number().default(5),
  }).refine(
    (data) => {
      if (data.minPrice != null && data.maxPrice != null) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    { message: 'minPrice không được lớn hơn maxPrice', path: ['minPrice'] }
  ),
  // Wrap: LRU cache (key theo tất cả params) + analytics
  execute: async (params, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('searchProducts', params as Record<string, unknown>);
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'searchProducts',
          args: params as Record<string, unknown>,
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              const detectedCategory =
                params.category || (params.keyword ? detectCategory(params.keyword) : null) || undefined;
              const detectedMaterial =
                params.material || (params.keyword ? detectMaterial(params.keyword) : null) || undefined;

              // Bóc keyword thô (loại bỏ từ khóa category/material để search title sạch hơn)
              let cleanKeyword = params.keyword;
              if (cleanKeyword) {
                const removeWords = [
                  ...Object.keys(MATERIAL_VI),
                  ...Object.keys(CATEGORY_VI),
                  'dưới', 'trên', 'khoảng', 'tầm', 'giá', 'mua', 'tìm', 'cho', 'mình', 'em', 'anh', 'chị', 'có', 'không',
                  'vàng', 'bạc', 'vintage', 'mới', 'cũ',
                ];
                for (const w of removeWords) {
                  cleanKeyword = cleanKeyword.replace(new RegExp(`\\b${w}\\b`, 'gi'), ' ').replace(/\s+/g, ' ').trim();
                }
              }

              const runQuery = async (overrides: Record<string, unknown> = {}) => {
                let q = supabase
                  .from('products')
                  .select('id, title, slug, price, image_url, material, quality_tier, status')
                  .order('is_featured', { ascending: false })
                  .limit((overrides.limit as number) ?? params.limit ?? 5);
                const keyword =
                  overrides.keyword !== undefined ? (overrides.keyword as string) : cleanKeyword;
                if (keyword) {
                  // Diacritics-insensitive: dùng generated column `title_unaccent` (xem
                  // migration 0028) thay vì gọi unaccent() trực tiếp. PostgREST không
                  // support function call trong `.or()` filter → `unaccent(title).ilike`
                  // bị wrap thành `((...))` và throw "failed to parse logic tree". Filter
                  // column thật thì PostgREST parse OK và còn hit được GIN trigram index.
                  const pat = unaccentIlikePattern(keyword).replace(/,/g, '');
                  q = q.or(`title.ilike.${pat},title_unaccent.ilike.${pat}`);
                }
                const category = (overrides.category as string | undefined) ?? detectedCategory;
                if (category) q = q.eq('category', category);
                const material = (overrides.material as string | undefined) ?? detectedMaterial;
                if (material) q = q.eq('material', material);
                if (overrides.qualityTier ?? params.qualityTier)
                  q = q.eq('quality_tier', (overrides.qualityTier ?? params.qualityTier) as string);
                if (overrides.minPrice ?? params.minPrice)
                  q = q.gte('price', (overrides.minPrice ?? params.minPrice) as number);
                if (overrides.maxPrice ?? params.maxPrice)
                  q = q.lte('price', (overrides.maxPrice ?? params.maxPrice) as number);
                if (params.onlyAvailable) q = q.eq('status', 'AVAILABLE');
                const { data, error } = await q;
              if (error) {
                console.error('[tool:searchProducts]', redactPII(error.message ?? ''));
                return [];
              }
                return data ?? [];
              };

              // Lần 1: tìm đúng filter
              let results = await runQuery();
              if (results.length > 0) return results;

              // Lần 2: mở rộng khoảng giá ±30%
              if ((params.minPrice || params.maxPrice) && !params.keyword && !detectedCategory && !detectedMaterial) {
                const center = ((params.minPrice ?? 0) + (params.maxPrice ?? 0)) / 2 || 0;
                if (center > 0) {
                  const pad = center * 0.3;
                  const expanded = await runQuery({
                    minPrice: Math.max(0, Math.floor(center - pad)),
                    maxPrice: Math.ceil(center + pad),
                  });
                  if (expanded.length > 0) return expanded;
                }
              }

              // Lần 3: bỏ keyword (giữ lại category/material nếu có)
              if (params.keyword) {
                const noKw = await runQuery({ keyword: '' });
                if (noKw.length > 0) return noKw;
              }

              return [];
            } catch (e) {
              console.error('[tool:searchProducts] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('searchProducts'),
    );
  },
});

export const semanticSearch = tool({
  description:
    'Tìm sản phẩm bằng ngữ nghĩa. Dùng khi khách hỏi kiểu mô tả tự nhiên: "nhẫn vintage thanh lịch", "quà tặng bạn gái".',
  inputSchema: z.object({
    query: z.string().describe('Câu mô tả tự nhiên của khách'),
    limit: z.number().default(5),
  }),
  // Wrap: LRU cache (key theo query + limit) + analytics
  execute: async ({ query, limit }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('semanticSearch', { query, limit });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'semanticSearch',
          args: { query, limit },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const { embedQuery } = await import('./embeddings');
              const vector = await embedQuery(query);
              if (!vector) {
                return await searchProducts.execute!({ keyword: query, limit } as never, {
                  toolCallId: 'semantic-fallback',
                  messages: [],
                });
              }
              const supabase = createAdminClient();
              const { data, error } = await supabase.rpc('match_products', {
                query_embedding: vector,
                match_count: limit,
              });
              if (error) {
                console.error('[tool:semanticSearch]', redactPII(error.message ?? ''));
                return [];
              }
              return (data ?? []).map((row: any) => ({
                id: row.id,
                title: row.title,
                slug: row.slug,
                price: row.price,
                image_url: row.image_url,
                material: row.material,
                quality_tier: row.quality_tier,
                similarity: row.similarity,
              }));
            } catch (e) {
              console.error('[tool:semanticSearch] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('semanticSearch'),
    );
  },
});

export const getProductDetail = tool({
  description: 'Lấy chi tiết 1 sản phẩm theo slug. Dùng khi khách hỏi về 1 sp cụ thể.',
  inputSchema: z.object({
    slug: z.string()
      .min(1, 'Slug không được rỗng')
      .max(200, 'Slug quá dài')
      .regex(/^[a-z0-9-]+$/, { message: 'Slug chỉ chứa chữ thường, số, và dấu gạch ngang' })
      .describe('Slug sản phẩm (VD: "nhan-bac-sapphire-xanh")'),
  }),
  // Wrap: LRU cache (key theo slug) + analytics
  execute: async ({ slug }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getProductDetail', { slug });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getProductDetail',
          args: { slug },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              const { data, error } = await supabase
                .from('products')
                .select('id, title, slug, description, price, image_url, material, category, quality_tier, status, season_tags')
                .eq('slug', slug)
                .single();
              if (error) return null;
              return data;
            } catch (e) {
              console.error('[tool:getProductDetail] exception:', e instanceof Error ? redactPII(e.message) : e);
              return null;
            }
          },
        }),
      getDefaultTtl('getProductDetail'),
    );
  },
});

export const getCurrentCollections = tool({
  description:
    'Lấy danh sách các bộ sưu tập đang published. Dùng khi khách hỏi về mùa/collection/bst.',
  inputSchema: z.object({}),
  // Wrap: LRU cache (no params → key = getCurrentCollections:) + analytics
  execute: async (_params, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getCurrentCollections', {});
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getCurrentCollections',
          args: {},
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              const { data, error } = await supabase
                .from('collections')
                .select('id, name, slug, description, cover_image_url, launch_at')
                .eq('is_published', true)
                .order('display_order', { ascending: true });
              if (error) {
                console.error('[tool:getCurrentCollections]', redactPII(error.message ?? ''));
                return [];
              }
              return data ?? [];
            } catch (e) {
              console.error('[tool:getCurrentCollections] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getCurrentCollections'),
    );
  },
});

export const getRelatedProducts = tool({
  description:
    'Gợi ý sản phẩm liên quan theo category/material. Dùng để cross-sell khi khách xem 1 sp.',
  inputSchema: z.object({
    productId: optionalString,
    category: optionalEnum(['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY']),
    material: optionalEnum(['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG']),
    excludeProductId: optionalString,
    limit: z.number().default(4),
  }),
  // Wrap: LRU cache (key theo productId|category|material|excludeProductId|limit) + analytics
  execute: async ({ productId, category, material, excludeProductId, limit }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getRelatedProducts', {
      productId,
      category,
      material,
      excludeProductId,
      limit,
    });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getRelatedProducts',
          args: { productId, category, material, excludeProductId, limit },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              let q = supabase
                .from('products')
                .select('id, title, slug, price, image_url, material, quality_tier, status')
                .eq('status', 'AVAILABLE')
                .order('is_featured', { ascending: false })
                .limit(limit);
              if (category) q = q.eq('category', category);
              if (material) q = q.eq('material', material);
              if (excludeProductId) q = q.neq('id', excludeProductId);
              if (productId && !excludeProductId) q = q.neq('id', productId);
              const { data, error } = await q;
              if (error) {
                console.error('[tool:getRelatedProducts]', redactPII(error.message ?? ''));
                return [];
              }
              return data ?? [];
            } catch (e) {
              console.error('[tool:getRelatedProducts] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getRelatedProducts'),
    );
  },
});

export const getFeaturedProducts = tool({
  description: 'Lấy sản phẩm nổi bật (is_featured=true). Dùng khi khách hỏi chung chung "có gì hay".',
  inputSchema: z.object({
    limit: z.number().default(5),
  }),
  // Wrap: LRU cache (key theo limit) + analytics
  execute: async ({ limit }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getFeaturedProducts', { limit });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getFeaturedProducts',
          args: { limit },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              const { data, error } = await supabase
                .from('products')
                .select('id, title, slug, price, image_url, material, quality_tier, status')
                .eq('status', 'AVAILABLE')
                .eq('is_featured', true)
                .order('created_at', { ascending: false })
                .limit(limit);
              if (error) {
                console.error('[tool:getFeaturedProducts]', redactPII(error.message ?? ''));
                return [];
              }
              return data ?? [];
            } catch (e) {
              console.error('[tool:getFeaturedProducts] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getFeaturedProducts'),
    );
  },
});

export const captureLead = tool({
  description:
    'Lưu SĐT/email/Zalo khi khách để lại liên lạc. LUÔN gọi khi khách cung cấp số điện thoại, email, hoặc tên Zalo.',
  inputSchema: z.object({
    contactType: z.enum(['phone', 'email', 'zalo']).describe('Loại liên lạc'),
    contactValue: z.string()
      .min(3, 'Quá ngắn')
      .max(200, 'Quá dài')
      .describe('SĐT (VD: 0901234567), email (VD: ten@example.com), hoặc Zalo ID'),
    intent: optionalString.describe('Khách muốn gì (ngắn gọn)'),
    productId: optionalString.describe('ID sản phẩm khách quan tâm (nếu có)'),
  })
  // Validate format contactValue theo contactType — chuyển lên object-level vì
  // field-level .refine() của z.string() không có ctx.parent để đọc contactType.
  // superRefine cho phép truy cập cả 2 field + emit custom issue ở path contactValue.
  .superRefine((data, ctx) => {
    const val = data.contactValue;
    if (data.contactType === 'phone') {
      const normalized = val.replace(/[\s.-]/g, '');
      if (!/^(\+?84|0)\d{9,10}$/.test(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Số điện thoại không hợp lệ (VD: 0901234567 hoặc +84901234567)',
          path: ['contactValue'],
        });
      }
    } else if (data.contactType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email không hợp lệ (VD: ten@example.com)',
          path: ['contactValue'],
        });
      }
    } else if (data.contactType === 'zalo') {
      // Zalo ID thường là SĐT hoặc username; chấp nhận cả 2 format
      const normalized = val.replace(/[\s.-]/g, '');
      if (normalized.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Zalo ID quá ngắn (tối thiểu 3 ký tự)',
          path: ['contactValue'],
        });
      }
    }
  }),
  // KHÔNG cache (mỗi call unique — INSERT lead). CHỉ wrap analytics. contactValue sẽ được sanitize thành [REDACTED].
  execute: async ({ contactType, contactValue, intent, productId }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    return logToolCall({
      toolName: 'captureLead',
      args: { contactType, contactValue, intent, productId },
      sessionId,
      userId,
      provider,
      model,
      run: async () => {
        try {
          const supabase = createAdminClient();
          if (!sessionId) {
            console.error('[tool:captureLead] no sessionId in context');
            return { ok: false, error: 'NO_SESSION' };
          }
          // Spam prevention: tối đa LEAD_MAX_PER_SESSION lead / session / LEAD_WINDOW_MS.
          if (isLeadSpam(sessionId)) {
            console.warn(`[tool:captureLead] spam detected session=${sessionId}`);
            return {
              ok: false,
              error: 'TOO_MANY_LEADS',
              message: 'Bạn đã gửi quá nhiều liên lạc. Vui lòng thử lại sau ít phút.',
            };
          }
          const { data, error } = await supabase
            .from('chat_leads')
            .insert({
              session_id: sessionId,
              user_id: userId,
              contact_type: contactType,
              contact_value: contactValue,
              intent: intent ?? null,
              matched_product_id: productId ?? null,
            })
            .select('id')
            .single();
          if (error) {
            console.error('[tool:captureLead]', redactPII(error.message ?? ''));
            return { ok: false, error: error.message };
          }
          if (!data) {
            return { ok: false, error: 'NO_DATA' };
          }
          // BỎ contactValue khỏi result để tránh echo PII trong model context.
          return {
            ok: true,
            leadId: data.id,
            contactType,
            message: 'Đã lưu thành công.',
          };
        } catch (e) {
          console.error('[tool:captureLead] exception:', e instanceof Error ? redactPII(e.message) : e);
          return { ok: false, error: e instanceof Error ? redactPII(e.message) : 'unknown' };
        }
      },
    });
  },
});

export const getKnowledge = tool({
  description:
    'Tra cứu thông tin cố định của shop: chính sách bảo hành/đổi trả/vận chuyển/thanh toán, địa chỉ, giờ mở cửa, hướng dẫn bảo quản trang sức. LUÔN dùng khi khách hỏi về chính sách, vận chuyển, đổi trả, liên hệ, hoặc cách bảo quản.',
  inputSchema: z.object({
    category: optionalEnum([
      'shipping', 'return', 'warranty', 'payment', 'about', 'contact', 'care', 'size', 'general',
    ]).describe('Phân loại: shipping/return/warranty/payment/about/contact/care/size/general'),
    query: optionalString.describe('Câu hỏi cụ thể của khách (để lọc chính xác hơn)'),
    limit: z.number().default(3),
  }),
  // Wrap: LRU cache (key theo category|query|limit) + analytics
  execute: async ({ category, query, limit }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getKnowledge', { category, query, limit });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getKnowledge',
          args: { category, query, limit },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              let q = supabase
                .from('chat_knowledge')
                .select('id, category, title, content, keywords, priority')
                .eq('is_published', true)
                .order('priority', { ascending: false })
                .limit(limit);
              if (category) q = q.eq('category', category);
              if (query) {
                // Escape ILIKE wildcards (% _) trong user input để tránh match sai.
                // PostgREST .or() dùng comma separator → cũng strip comma khỏi pattern.
                // Diacritics-insensitive: OR với generated column title_unaccent/content_unaccent
                // (xem migration 0028) thay vì gọi unaccent() trực tiếp trong filter — PostgREST
                // không support function call trong `.or()` nên `unaccent(title).ilike` bị wrap
                // thành `((...))` và throw "failed to parse logic tree". Column thật thì parse OK.
                const safeQuery = escapeIlikePattern(query).replace(/,/g, '');
                const k = `%${safeQuery}%`;
                q = q.or(
                  `title.ilike.${k},content.ilike.${k},` +
                  `title_unaccent.ilike.${k},content_unaccent.ilike.${k}`
                );
              }
              const { data, error } = await q;
              if (error) {
                console.error('[tool:getKnowledge]', redactPII(error.message ?? ''));
                return [];
              }
              return data ?? [];
            } catch (e) {
              console.error('[tool:getKnowledge] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getKnowledge'),
    );
  },
});

export const getFaq = tool({
  description:
    'Tra cứu FAQ cứng (Q&A). Dùng khi khách hỏi câu hỏi cụ thể có thể match FAQ. Trả về danh sách câu trả lời.',
  inputSchema: z.object({
    query: z.string().describe('Câu hỏi của khách (tiếng Việt)'),
    limit: z.number().default(5),
  }),
  // Wrap: LRU cache (key theo query|limit) + analytics
  execute: async ({ query, limit }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getFaq', { query, limit });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getFaq',
          args: { query, limit },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
              try {
                const supabase = createAdminClient();
                // Escape ILIKE wildcards + strip comma (PostgREST .or() separator).
                // Diacritics-insensitive: OR với generated column question_unaccent/answer_unaccent
                // (xem migration 0028) thay vì gọi unaccent() trực tiếp — PostgREST không support
                // function call trong `.or()` filter, gây "failed to parse logic tree".
                const safeQuery = escapeIlikePattern(query).replace(/,/g, '');
                const k = `%${safeQuery}%`;
                const { data, error } = await supabase
                  .from('chat_faqs')
                  .select('id, question, answer, keywords, category')
                  .eq('is_published', true)
                  .or(
                    `question.ilike.${k},answer.ilike.${k},` +
                    `question_unaccent.ilike.${k},answer_unaccent.ilike.${k}`
                  )
                  .order('display_order', { ascending: true })
                  .limit(limit);
              if (error) {
                console.error('[tool:getFaq]', redactPII(error.message ?? ''));
                return [];
              }
              return data ?? [];
            } catch (e) {
              console.error('[tool:getFaq] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getFaq'),
    );
  },
});

export const getUpcomingProducts = tool({
  description:
    'Lấy danh sách sản phẩm sắp ra mắt (đã công bố). Dùng khi khách hỏi "có gì mới sắp tới", "sản phẩm sắp ra", "upcoming". Trả về danh sách gồm title, short_pitch, expected_launch_date, material, category, estimated_price.',
  inputSchema: z.object({
    category: optionalEnum(['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY']),
    material: optionalEnum(['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG']),
    limit: z.number().default(5),
  }),
  // Wrap: LRU cache (key theo category|material|limit) + analytics
  execute: async ({ category, material, limit }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getUpcomingProducts', { category, material, limit });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getUpcomingProducts',
          args: { category, material, limit },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              let q = supabase
                .from('upcoming_products')
                .select(
                  'id, title, slug, short_pitch, description, estimated_price, material, category, cover_image_url, expected_launch_date'
                )
                .eq('is_announced', true)
                .gte('expected_launch_date', new Date().toISOString())
                .order('expected_launch_date', { ascending: true })
                .limit(limit);
              if (category) q = q.eq('category', category);
              if (material) q = q.eq('material', material);
              const { data, error } = await q;
              if (error) {
                console.error('[tool:getUpcomingProducts]', redactPII(error.message ?? ''));
                return [];
              }
              return data ?? [];
            } catch (e) {
              console.error('[tool:getUpcomingProducts] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getUpcomingProducts'),
    );
  },
});

export const getUpcomingCollections = tool({
  description:
    'Lấy danh sách bộ sưu tập sắp ra mắt (đã công bố). Dùng khi khách hỏi về BST tương lai.',
  inputSchema: z.object({
    limit: z.number().default(5),
  }),
  // Wrap: LRU cache (key theo limit) + analytics
  execute: async ({ limit }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getUpcomingCollections', { limit });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getUpcomingCollections',
          args: { limit },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              const { data, error } = await supabase
                .from('upcoming_collections')
                .select('id, name, slug, description, theme, cover_image_url, teaser_note, expected_launch_date')
                .eq('is_announced', true)
                .gte('expected_launch_date', new Date().toISOString())
                .order('expected_launch_date', { ascending: true })
                .limit(limit);
              if (error) {
                console.error('[tool:getUpcomingCollections]', redactPII(error.message ?? ''));
                return [];
              }
              return data ?? [];
            } catch (e) {
              console.error('[tool:getUpcomingCollections] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getUpcomingCollections'),
    );
  },
});

export const getActivePromotions = tool({
  description:
    'Lấy danh sách khuyến mãi đang chạy. Dùng khi khách hỏi về mã giảm giá, khuyến mãi, ưu đãi hiện tại. CHỈ chủ động đề xuất khi khách hỏi hoặc đơn hàng phù hợp điều kiện.',
  inputSchema: z.object({
    category: optionalEnum(['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY'])
      .describe('Filter theo category nếu khách đang xem sp cụ thể'),
    minOrderValue: optionalNumber.describe('Giá trị đơn hàng dự kiến'),
  }),
  // Wrap: LRU cache (key theo category|minOrderValue) + analytics. Lưu ý: cache có thể stale nếu promo hết hạn trong TTL — TTL ngắn 60s giảm rủi ro.
  execute: async ({ category, minOrderValue }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    // Cache key: bỏ minOrderValue khỏi key (filter post-cache ở dưới).
    // Mỗi minOrderValue khác nhau không nên tạo entry riêng → waste cache slot.
    const cacheKey = buildCacheKey('getActivePromotions', { category });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getActivePromotions',
          args: { category, minOrderValue },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              const now = new Date().toISOString();
              let q = supabase
                .from('chat_promotions')
                .select('id, title, description, code, discount_type, discount_value, min_order_value, applicable_categories, valid_until')
                .eq('is_active', true)
                .lte('valid_from', now)
                .or(`valid_until.is.null,valid_until.gte.${now}`);
              if (category) {
                // Match promotions applicable to this category (or unrestricted = empty array)
                q = q.or(`applicable_categories.cs.{${category}},applicable_categories.eq.{}`);
              }
              const { data, error } = await q;
              if (error) {
                console.error('[tool:getActivePromotions]', redactPII(error.message ?? ''));
                return [];
              }
              let promos = (data ?? []) as Array<{
                id: string;
                title: string;
                description: string | null;
                code: string | null;
                discount_type: string;
                discount_value: number | null;
                min_order_value: number | null;
                applicable_categories: string[];
                valid_until: string | null;
              }>;
              if (minOrderValue !== undefined) {
                promos = promos.filter((p) => !p.min_order_value || p.min_order_value <= minOrderValue);
              }
              return promos.slice(0, 5);
            } catch (e) {
              console.error('[tool:getActivePromotions] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getActivePromotions'),
    );
  },
});

export const getSuggestedAnswers = tool({
  description:
    'Tra cứu các mẫu trả lời có sẵn do admin soạn. Dùng khi khách hỏi về chính sách (ship, đổi trả, bảo hành, thanh toán, liên hệ...) hoặc câu hỏi phổ biến. Mẫu trả lời sẽ là reference chính xác để model trả lời đúng ý admin, thay vì tự suy luận.',
  inputSchema: z.object({
    category: optionalEnum([
      'shipping', 'return', 'warranty', 'payment', 'about', 'contact', 'care', 'size', 'general', 'product', 'other',
    ]).describe('Phân loại: shipping/return/warranty/...'),
    query: optionalString.describe('Câu hỏi gốc của khách (để match keyword)'),
    limit: z.number().default(3),
  }),
  execute: async ({ category, query, limit }, options) => {
    const { sessionId, userId, provider, model } = extractCtx();
    const cacheKey = buildCacheKey('getSuggestedAnswers', { category, query, limit });
    return cachedToolCall(
      cacheKey,
      () =>
        logToolCall({
          toolName: 'getSuggestedAnswers',
          args: { category, query, limit },
          sessionId,
          userId,
          provider,
          model,
          run: async () => {
            try {
              const supabase = createAdminClient();
              let q = supabase
                .from('chat_suggested_answers')
                .select('id, category, title, content, trigger_keywords, priority, updated_at')
                .eq('is_published', true)
                .order('priority', { ascending: false })
                .order('updated_at', { ascending: false })
                .limit(limit);
              if (category) q = q.eq('category', category);
              if (query) {
                // Escape ILIKE wildcards + strip comma (PostgREST .or() separator).
                // Diacritics-insensitive: OR với generated column title_unaccent/content_unaccent
                // (xem migration 0028) thay vì gọi unaccent() trực tiếp — PostgREST không support
                // function call trong `.or()` filter, gây "failed to parse logic tree".
                const safeQuery = escapeIlikePattern(query).replace(/,/g, '');
                const k = `%${safeQuery}%`;
                q = q.or(
                  `title.ilike.${k},content.ilike.${k},` +
                  `title_unaccent.ilike.${k},content_unaccent.ilike.${k},` +
                  `trigger_keywords.cs.{${query.toLowerCase()}}`
                );
              }
              const { data, error } = await q;
              if (error) {
                console.error('[tool:getSuggestedAnswers]', redactPII(error.message ?? ''));
                return [];
              }
              return data ?? [];
            } catch (e) {
              console.error('[tool:getSuggestedAnswers] exception:', e instanceof Error ? redactPII(e.message) : e);
              return [];
            }
          },
        }),
      getDefaultTtl('getSuggestedAnswers'),
    );
  },
});

export const allTools = {
  searchProducts,
  semanticSearch,
  getProductDetail,
  getCurrentCollections,
  getRelatedProducts,
  getFeaturedProducts,
  captureLead,
  getKnowledge,
  getFaq,
  getUpcomingProducts,
  getUpcomingCollections,
  getActivePromotions,
  getSuggestedAnswers,
};

export const chatHelpers = {
  detectPhone,
  detectEmail,
  detectMaterial,
  detectCategory,
  MATERIAL_LABEL,
  CATEGORY_LABEL,
  formatVND,
};
