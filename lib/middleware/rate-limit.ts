// lib/middleware/rate-limit.ts
// Sliding-window rate-limit helper dùng @upstash/ratelimit + Upstash Redis.
//
// Behavior:
//  - Nếu UPSTASH_REDIS_REST_URL có → dùng @upstash/ratelimit (sliding window).
//  - Nếu thiếu → trả { ok: true, degraded: true } (skip kiểm tra, không log spam).
//  - Log 1 lần lúc init để dev biết backend đang dùng.
//
// Identifier strategy:
//  - Default: IP từ x-forwarded-for (Vercel/Cloudflare set header này).
//  - Caller có thể override (vd IPN route dùng orderId từ body).

import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getUpstashConfig } from '@/lib/env';

export interface RateLimitOptions {
  /** identifier — IP address, userId, hoặc any unique key. */
  identifier: string;
  /** max requests trong window. */
  limit: number;
  /** window duration — Upstash format: '1 m', '10 s', '1 h', etc. */
  window: `${number} ${'s' | 'm' | 'h'}`;
  /** override prefix (default = namespace). */
  prefix?: string;
}

export interface RateLimitResult {
  ok: boolean;
  /** remaining requests trong window (-1 nếu degraded). */
  remaining: number;
  /** timestamp (ms) khi window reset. */
  resetAt: number;
  /** seconds until next allowed request (chỉ set khi ok=false). */
  retryAfter?: number;
  /** true nếu backend không khả dụng → skip check. */
  degraded?: boolean;
}

// ---------------------------------------------------------------------------
// Redis + Ratelimit cache (lazy init)
// ---------------------------------------------------------------------------

type RedisInstance = InstanceType<typeof Redis>;
type LimiterEntry = { limiter: Ratelimit; redis: RedisInstance };

const limiterCache = new Map<string, LimiterEntry>();
let initLogged = false;

/**
 * Build hoặc fetch cached Ratelimit instance cho 1 namespace.
 * Mỗi namespace dùng 1 limiter (Upstash ratelimit key = `prefix:identifier`).
 */
function getLimiter(namespace: string, prefix: string): LimiterEntry | null {
  const cached = limiterCache.get(namespace);
  if (cached) return cached;

  const cfg = getUpstashConfig();
  if (!cfg.isConfigured || !cfg.url || !cfg.token) return null;

  const redis = new Redis({ url: cfg.url, token: cfg.token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(0, '1 m'), // sẽ override per-call
    prefix,
    analytics: false,
  });
  const entry: LimiterEntry = { limiter, redis };
  limiterCache.set(namespace, entry);

  if (!initLogged) {
    initLogged = true;
    console.log('[rate-limit] backend: Upstash Redis (sliding window)');
  }
  return entry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit cho 1 identifier.
 * Return { ok: true } nếu trong window, { ok: false } nếu vượt limit.
 *
 * Graceful degradation: thiếu UPSTASH_REDIS_REST_URL → { ok: true, degraded: true }.
 */
export async function rateLimit(
  namespace: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const prefix = opts.prefix ?? `ratelimit:${namespace}`;
  const entry = getLimiter(namespace, prefix);

  if (!entry) {
    // Backend missing — log 1 lần rồi skip.
    if (!initLogged) {
      initLogged = true;
      console.warn(
        '[rate-limit] UPSTASH_REDIS_REST_URL missing — rate-limit disabled (degraded mode).'
      );
    }
    return {
      ok: true,
      remaining: -1,
      resetAt: Date.now(),
      degraded: true,
    };
  }

  // Upstash ratelimit không cho window per-call, chỉ cho limit per-call.
  // → Tạo limiter mới mỗi call? Quá đắt. Thay vào đó, dùng slidingWindow
  //   với limit mặc định ở init, rồi gọi .check() với custom suffix là
  //   "<identifier>:<limit>:<window>". Nhưng đơn giản hơn: shim bằng cách
  //   re-create Ratelimit per limit (cache by limit+window).
  //   → Để tối ưu, build key per (namespace, limit, window) và cache.
  const limiterKey = `${namespace}:${opts.limit}:${opts.window}`;
  let limiterEntry = limiterCache.get(limiterKey);
  if (!limiterEntry) {
    const redis = new Redis({
      url: getUpstashConfig().url!,
      token: getUpstashConfig().token!,
    });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.limit, opts.window),
      prefix,
      analytics: false,
    });
    limiterEntry = { limiter, redis };
    limiterCache.set(limiterKey, limiterEntry);
  }

  const { success, remaining, reset } = await limiterEntry.limiter.limit(
    opts.identifier
  );

  // Upstash @upstash/ratelimit types `reset` là `number | Date` nhưng ở runtime
  // thường trả number (epoch ms). Cast `unknown` để tránh TS2358 — fallback cho
  // cả string và Date cũng như number.
  const resetVal = reset as unknown;
  const resetAt =
    resetVal instanceof Date
      ? resetVal.getTime()
      : typeof resetVal === 'number'
        ? resetVal
        : Number(resetVal) || Date.now();
  const retryAfter = success
    ? undefined
    : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return {
    ok: success,
    remaining,
    resetAt,
    retryAfter,
  };
}

/**
 * Reset cache (test helper).
 * KHÔNG dùng trong production code.
 */
export function _resetRateLimitCacheForTests(): void {
  limiterCache.clear();
  initLogged = false;
}
