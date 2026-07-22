// lib/chatbot/tool-cache.ts
// In-memory LRU + TTL cache cho chatbot tools.
// Đặc thù serverless (Vercel): KHÔNG share giữa các function instance.
// Mỗi cold start sẽ miss toàn bộ cache → chấp nhận được vì TTL ngắn (1–10 phút).

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 phút — fallback mặc định
const SHORT_TTL_MS = 60 * 1000; // 1 phút — data có thể thay đổi
const LONG_TTL_MS = 10 * 60 * 1000; // 10 phút — data gần như tĩnh
const MAX_ENTRIES = 200; // LRU cap

// TTL mặc định theo tên tool. Tool không có ở đây → dùng DEFAULT_TTL_MS.
const TTL_BY_TOOL: Record<string, number> = {
  // Data tĩnh / semi-static → cache lâu
  getKnowledge: LONG_TTL_MS,
  getFaq: LONG_TTL_MS,
  // Data động (admin CRUD thường xuyên) → cache ngắn
  searchProducts: SHORT_TTL_MS,
  semanticSearch: SHORT_TTL_MS,
  getProductDetail: SHORT_TTL_MS,
  getRelatedProducts: SHORT_TTL_MS,
  getFeaturedProducts: SHORT_TTL_MS,
  getCurrentCollections: SHORT_TTL_MS,
  getUpcomingProducts: SHORT_TTL_MS,
  getUpcomingCollections: SHORT_TTL_MS,
  getActivePromotions: SHORT_TTL_MS,
  // captureLead không cache vì mỗi call là unique (ghi DB).
};

interface CacheEntry<T> {
  value: T;
  expires: number;
  createdAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
let hits = 0;
let misses = 0;

// Xóa entry cũ nhất khi vượt MAX_ENTRIES. Map bảo toàn insertion order
// nên key đầu tiên chính là entry "least recently set".
function evictIfFull(): void {
  if (store.size <= MAX_ENTRIES) return;
  const oldestKey = store.keys().next().value;
  if (oldestKey !== undefined) store.delete(oldestKey);
}

/**
 * Lấy giá trị từ cache. Nếu miss hoặc expired → gọi factory, set lại, trả về.
 * @param key Khóa cache (nên dùng `buildCacheKey`).
 * @param factory Hàm tạo giá trị khi miss.
 * @param ttlMs TTL tùy chọn; nếu không truyền sẽ dùng TTL theo tool (nếu key bắt đầu bằng tool:) hoặc DEFAULT_TTL_MS.
 */
export async function cachedToolCall<T>(
  key: string,
  factory: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key);
  if (entry && entry.expires > now) {
    hits++;
    return entry.value as T;
  }
  misses++;
  const value = await factory();
  // Chọn TTL: ưu tiên tham số, sau đó suy ra từ prefix tool:, cuối cùng fallback default.
  const resolvedTtl =
    ttlMs ??
    (() => {
      const idx = key.indexOf(':');
      const tool = idx > 0 ? key.slice(0, idx) : key;
      return TTL_BY_TOOL[tool] ?? DEFAULT_TTL_MS;
    })();
  // Refresh LRU order: xóa rồi set lại để entry vừa truy cập trở thành "mới nhất".
  store.delete(key);
  store.set(key, {
    value: value as unknown,
    expires: now + resolvedTtl,
    createdAt: now,
  });
  evictIfFull();
  return value;
}

/**
 * Build cache key từ tool name + args. Sort keys để thứ tự args không ảnh hưởng key.
 * Args phải JSON.stringify-able (không truyền function, Date lạ, BigInt...).
 */
export function buildCacheKey(tool: string, args: Record<string, unknown>): string {
  const sorted = Object.keys(args)
    .sort()
    .map((k) => `${k}=${JSON.stringify(args[k])}`)
    .join('&');
  return `${tool}:${sorted}`;
}

/**
 * Lấy TTL mặc định cho 1 tool. Cho phép override qua parameter.
 * Hữu ích khi caller muốn dùng TTL_BY_TOOL nhưng cần giảm/tăng trong tình huống đặc biệt.
 */
export function getDefaultTtl(tool: string, override?: number): number {
  if (override !== undefined) return override;
  return TTL_BY_TOOL[tool] ?? DEFAULT_TTL_MS;
}

/**
 * Invalidate (xóa) 1 key chính xác.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Invalidate theo pattern. Khớp nếu key `startsWith(pattern)` hoặc `includes(pattern)`.
 * Trả về số entry đã xóa.
 */
export function invalidateCachePattern(pattern: string): number {
  let count = 0;
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(pattern) || k.includes(pattern)) {
      store.delete(k);
      count++;
    }
  }
  return count;
}

/**
 * Invalidate toàn bộ cache của 1 tool. Gọi sau khi admin CRUD data liên quan.
 * VD: invalidateTool('searchProducts') sau khi admin thêm/sửa/xóa sản phẩm.
 * @returns Số entry đã xóa.
 */
export function invalidateTool(tool: string): number {
  const prefix = `${tool}:`;
  let count = 0;
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) {
      store.delete(k);
      count++;
    }
  }
  return count;
}

/**
 * Thống kê cache cho admin debug / health check.
 * - `oldestEntryAge` trả về 0 khi cache rỗng.
 */
export function getCacheStats(): {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntryAge: number;
} {
  const total = hits + misses;
  const now = Date.now();
  let oldestAge = 0;
  for (const entry of store.values()) {
    const age = now - entry.createdAt;
    if (age > oldestAge) oldestAge = age;
  }
  return {
    size: store.size,
    hits,
    misses,
    hitRate: total > 0 ? hits / total : 0,
    oldestEntryAge: oldestAge,
  };
}

/**
 * Clear toàn bộ cache + reset counters. Chỉ dùng cho test / debug.
 */
export function clearCache(): void {
  store.clear();
  hits = 0;
  misses = 0;
}
