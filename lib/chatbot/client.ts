// lib/chatbot/client.ts
// Weighted multi-provider chain (rule-based).
// Config qua env CHAT_PROVIDERS (CSV):
//   "groq:llama-3.1-8b-instant,openrouter:meta-llama/llama-3.3-70b-instruct:free,cerebras:llama-3.3-70b,cloudflare:@cf/meta/llama-3.1-8b-instruct,gemini:gemini-2.0-flash,openai:gpt-4o-mini"
// Mỗi entry = "<provider>:<model>". Thứ tự = thứ tự ưu tiên.
// Mỗi request thử từ trên xuống, fail thì fallback entry tiếp theo.
// Nếu CHAT_PROVIDERS không set → fallback về AI_PRIMARY (backward compat).
//
// Providers (tất cả dùng OpenAI-compat API trừ gemini/groq có SDK riêng):
// - openrouter: Free tier nhiều model (llama, qwen, mistral). baseURL: https://openrouter.ai/api/v1
//   Headers: HTTP-Referer, X-Title (recommended để tránh rate limit).
// - cerebras: Free tier, llama-3.3-70b inference cực nhanh (~2000 tok/s).
//   baseURL: https://api.cerebras.ai/v1
// - cloudflare: Workers AI free tier (10k neurons/day). Cần accountId trong URL.
//   baseURL: https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1
//   Model IDs giữ nguyên prefix @cf/ (vd: @cf/meta/llama-3.1-8b-instruct).
// - groq: Free tier, llama-3.1-8b-instant (nhanh, ít corrupt tool call hơn 70b).
// - gemini: gemini-2.0-flash free tier qua AI Studio.
// - openai: gpt-4o-mini paid (fallback cuối).
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { getChatConfig, type ChatProvider } from './config';
import { getUpstashConfig } from '@/lib/env';

// Optional Upstash Redis for cross-instance cooldown (Vercel serverless).
// Falls back to in-memory Map when env vars are missing (dev / single-node).
//
// IMPORTANT: Dùng getUpstashConfig() thay vì check process.env raw để tránh
// init Redis với URL placeholder không hợp lệ (vd "123" trong .env.local).
// getUpstashConfig() trả về { isConfigured: false } khi URL invalid → skip.
type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { px?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
};
let _redis: RedisLike | null = null;
let _redisInitPromise: Promise<void> | null = null;

/**
 * Lazy init Redis bằng dynamic import (ES module syntax — không dùng require).
 * Dùng promise pattern để đảm bảo chỉ init 1 lần và concurrent calls
 * đều chờ cùng 1 promise. Caller dùng `await getRedis()` thay vì truy cập
 * _redis trực tiếp.
 */
async function initRedis(): Promise<void> {
  if (_redis) return;
  const upstash = getUpstashConfig();
  if (!upstash.isConfigured || !upstash.url || !upstash.token) {
    console.log('[chatbot] cooldown store: in-memory Map (Upstash not configured)');
    return;
  }
  try {
    // Dynamic import — module optional. Nếu @upstash/redis chưa install thì catch.
    const upstashRedis = await import('@upstash/redis');
    _redis = new upstashRedis.Redis({
      url: upstash.url,
      token: upstash.token,
    }) as unknown as RedisLike;
    console.log('[chatbot] cooldown store: Upstash Redis');
  } catch (err) {
    console.warn('[chatbot] Upstash init failed, falling back to in-memory:', err);
    _redis = null;
  }
}

/**
 * Public accessor — caller dùng thay vì truy cập _redis trực tiếp.
 * Đảm bảo init lazy + concurrent-safe qua promise cache.
 */
export async function getRedis(): Promise<RedisLike | null> {
  if (_redis) return _redis;
  if (!_redisInitPromise) {
    _redisInitPromise = initRedis();
  }
  await _redisInitPromise;
  return _redis;
}

// Backward-compatible sync init cho callers cũ (nếu có) — không khuyến khích.
// Logic cũ được thay thế bằng initRedis() async pattern ở trên.
// Caller dùng `await getRedis()` thay vì truy cập _redis trực tiếp.

type ModelInstance = ReturnType<ReturnType<typeof createOpenAI>>;

export interface ChatModelEntry {
  provider: string;
  modelName: string;
  instance: ModelInstance;
}

let _lastUsedProvider: string | null = null;

export function getLastUsedProvider(): string {
  return _lastUsedProvider ?? 'none';
}

// Rate-limit cooldown tracking (in-memory, per Node process).
// When a provider returns 429 / "Rate limit reached", the route handler calls
// markProviderRateLimited(); getChatModelChain() then filters those providers
// out until the cooldown expires. This avoids wasting 25s STREAM_TIMEOUT on
// every request just to rediscover the same provider is still rate-limited.
const _rateLimitCooldowns = new Map<string, number>(); // provider -> cooldownUntilMs (in-memory fallback)
const DEFAULT_COOLDOWN_MS = 60_000; // 60s default if we can't parse "try again in Xs"
const RETRY_AFTER_RE = /try again in\s+([\d.]+)\s*s/i;
const RATE_LIMIT_DETECT_RE = /rate limit|429|tokens per minute|\btpm\b|quota|too many requests|try again in/i;
const COOLDOWN_KEY = (p: string) => `chat:cd:${p}`;

/**
 * Returns true if the provider is currently NOT in cooldown (or its cooldown
 * has already expired — in which case the stale entry is removed).
 * Uses Upstash Redis if configured (Vercel-friendly, survives cold starts across
 * serverless instances); otherwise falls back to in-memory Map (dev only).
 */
export function isProviderAvailable(provider: string): boolean {
  // In-memory check is synchronous; Redis-backed `getCooldownInfo()` is the
  // authoritative source in production — but synchronous API is preserved here.
  // The route handler awaits getCooldownInfo() before constructing the chain,
  // so this sync method is only used as a last-mile guard.
  const until = _rateLimitCooldowns.get(provider);
  if (until === undefined) return true;
  if (Date.now() >= until) {
    _rateLimitCooldowns.delete(provider);
    return true;
  }
  return false;
}

/**
 * SYNC in-memory cooldown snapshot — same shape as `getCooldownInfo()` (async,
 * Redis-backed) but reads directly from `_rateLimitCooldowns` Map.
 *
 * Fix #1 (sprint 2026-07-27): `getChatModelChain()` was calling `getCooldownInfo()`
 * without awaiting → `memCooldowns` was a Promise object → `memCooldowns[provider]`
 * always undefined → cooldown filter was completely bypassed, defeating the entire
 * rate-limit protection. Use this sync helper for in-process cooldown checks
 * (per-instance). For Redis cross-instance cooldowns, callers should additionally
 * `await getCooldownInfo()` and merge.
 */
export function getCooldownInfoSync(): Record<string, number> {
  const now = Date.now();
  const out: Record<string, number> = {};
  for (const [provider, until] of _rateLimitCooldowns) {
    const remaining = Math.max(0, Math.ceil((until - now) / 1000));
    if (remaining > 0) out[provider] = remaining;
  }
  return out;
}

/**
 * Mark a provider as rate-limited. Parses "Please try again in 26.94s" from
 * the error message to set a precise cooldown (with 2s buffer); falls back to
 * DEFAULT_COOLDOWN_MS if the duration cannot be parsed.
 * Persists to Upstash Redis if available so cooldowns survive across
 * Vercel serverless instances; otherwise in-memory.
 * Returns the cooldown duration in ms (for logging).
 */
export async function markProviderRateLimited(provider: string, errorMessage?: string): Promise<number> {
  let cooldownMs = DEFAULT_COOLDOWN_MS;
  if (errorMessage) {
    const m = errorMessage.match(RETRY_AFTER_RE);
    if (m && m[1]) {
      const seconds = parseFloat(m[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        cooldownMs = Math.ceil(seconds * 1000) + 2000; // +2s buffer
      }
    }
  }
  const until = Date.now() + cooldownMs;

  // Persist to Redis if configured (production).
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(COOLDOWN_KEY(provider), String(until), { px: cooldownMs });
    } catch (e) {
      console.warn('[chatbot] redis set cooldown failed, falling back to memory:', e);
    }
  }
  // Always update in-memory too (sync reads + dev fallback).
  _rateLimitCooldowns.set(provider, until);

  console.warn(
    `[chatbot] ${provider} marked rate-limited, cooldown=${Math.round(cooldownMs / 1000)}s (until ${new Date(until).toISOString()})`
  );
  return cooldownMs;
}

/**
 * For observability: returns map of provider -> remaining cooldown seconds.
 * Reads from Redis if configured, otherwise from in-memory Map.
 */
export async function getCooldownInfo(): Promise<Record<string, number>> {
  const now = Date.now();
  const out: Record<string, number> = {};

  const redis = await getRedis();
  if (redis) {
    const providers = ['groq', 'openrouter', 'cerebras', 'cloudflare', 'gemini', 'openai'];
    await Promise.all(
      providers.map(async (p) => {
        try {
          const raw = await redis.get(COOLDOWN_KEY(p));
          const until = raw ? Number(raw) : 0;
          if (until && now < until) {
            out[p] = Math.ceil((until - now) / 1000);
          }
        } catch {
          // ignore — provider treated as available
        }
      })
    );
    return out;
  }

  for (const [provider, until] of _rateLimitCooldowns) {
    const remaining = Math.max(0, Math.ceil((until - now) / 1000));
    if (remaining > 0) out[provider] = remaining;
  }
  return out;
}

/**
 * Default model cho mỗi provider. Override bằng CHAT_PROVIDERS env.
 */
export function getProviderDefaults(): Record<ChatProvider, string> {
  return {
    // Groq: 8b-instant là nhanh nhất + ít corrupt tool call nhất
    groq: 'llama-3.1-8b-instant',
    // OpenRouter: PHẢI có :free suffix, không thì trả 404 invalid model
    openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
    // Cerebras: 8b nhanh hơn + ít timeout hơn so với 70b. 70b vẫn giữ trong
    // fallback list nếu 8b cũng unavailable. Đổi 2026-07-29 vì llama-3.3-70b
    // liên tục trả "Not Found" trong một số region/account.
    cerebras: 'llama-3.1-8b',
    // Cloudflare: OpenAI-compat cần prefix @cf/. Đổi từ llama-3.1-8b-instruct →
    // llama-3.3-70b-instruct-fp8-fast vì model cũ bị Cloudflare deprecate
    // ngày 2026-05-30 và trả "Model has been deprecated".
    cloudflare: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    // Gemini: chỉ work nếu có key free (không enable billing)
    gemini: 'gemini-2.0-flash',
    // OpenAI: paid, fallback cuối
    openai: 'gpt-4o-mini',
  };
}

/**
 * Fallback models cho mỗi provider (dùng khi default fail 404/Not Found).
 * Chain sẽ tự động thử fallback models trước khi nhảy sang provider khác.
 */
export function getFallbackModels(): Record<ChatProvider, string[]> {
  return {
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    openrouter: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free',
    ],
    cerebras: ['llama-3.1-8b', 'llama-3.3-70b', 'qwen-2.5-72b-instruct'],
    cloudflare: [
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/mistralai/mistral-7b-instruct-v0.1',
    ],
    gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    openai: ['gpt-4o-mini', 'gpt-4o'],
  };
}

/**
 * Parse env CHAT_PROVIDERS thành danh sách entry ưu tiên.
 * Format: "groq:llama-3.1-8b-instant,gemini:gemini-2.0-flash,openai:gpt-4o-mini"
 * Mỗi entry: "<provider>:<modelName>"
 */
function parseChatProviders(): { provider: string; modelName: string }[] {
  const raw = process.env.CHAT_PROVIDERS;
  if (!raw || !raw.trim()) return [];

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [provider, modelName] = entry.split(':').map((s) => s.trim());
      if (!provider || !modelName) return null;
      return { provider, modelName };
    })
    .filter((e): e is { provider: string; modelName: string } => e !== null);
}

/**
 * Factory: tạo model instance cho provider + modelName.
 * Trả về null nếu provider không có key hoặc không hỗ trợ.
 */
function instantiateModel(
  provider: string,
  modelName: string,
  cfg: ReturnType<typeof getChatConfig>
): ModelInstance | null {
  switch (provider) {
    case 'openrouter': {
      if (!cfg.openrouterKey) return null;
      const openrouter = createOpenAI({
        apiKey: cfg.openrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://emerald-vault.local',
          'X-Title': 'Emerald Vault',
        },
      });
      return openrouter(modelName);
    }
    case 'cerebras': {
      if (!cfg.cerebrasKey) return null;
      const cerebras = createOpenAI({
        apiKey: cfg.cerebrasKey,
        baseURL: 'https://api.cerebras.ai/v1',
      });
      return cerebras(modelName);
    }
    case 'cloudflare': {
      if (!cfg.cloudflareKey || !cfg.cloudflareAccountId) return null;
      const cloudflare = createOpenAI({
        apiKey: cfg.cloudflareKey,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${cfg.cloudflareAccountId}/ai/v1`,
      });
      return cloudflare(modelName);
    }
    case 'groq': {
      if (!cfg.groqKey) return null;
      const groq = createGroq({ apiKey: cfg.groqKey });
      return groq(modelName);
    }
    case 'gemini': {
      if (!cfg.geminiKey) return null;
      const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
      return google(modelName);
    }
    case 'openai': {
      if (!cfg.openaiKey) return null;
      const openai = createOpenAI({ apiKey: cfg.openaiKey });
      return openai(modelName);
    }
    default:
      return null;
  }
}

function hasKeyFor(provider: string, cfg: ReturnType<typeof getChatConfig>): boolean {
  switch (provider) {
    case 'openrouter':
      return !!cfg.openrouterKey;
    case 'cerebras':
      return !!cfg.cerebrasKey;
    case 'cloudflare':
      return !!cfg.cloudflareKey && !!cfg.cloudflareAccountId;
    case 'groq':
      return !!cfg.groqKey;
    case 'gemini':
      return !!cfg.geminiKey;
    case 'openai':
      return !!cfg.openaiKey;
    default:
      return false;
  }
}

/**
 * Build chain KHẢ DỤNG theo thứ tự ưu tiên:
 * 1. Nếu có CHAT_PROVIDERS env → dùng thứ tự đó, filter ra entries không có key
 * 2. Nếu không → dùng AI_PRIMARY (backward compat) + auto-fallback các provider còn key.
 *    Thứ tự auto-fallback ưu tiên free: groq → openrouter → cerebras → cloudflare → gemini → openai.
 */
export function getChatModelChain(): ChatModelEntry[] {
  const cfg = getChatConfig();
  const chain: ChatModelEntry[] = [];
  const defaults = getProviderDefaults();

  // Sync in-memory cooldown snapshot. Redis cooldowns are also populated into
  // this Map by the route handler (see markProviderRateLimited), so the
  // sync API stays accurate even in production.
  //
  // Fix #1 (sprint 2026-07-27): Dùng `getCooldownInfoSync()` thay vì
  // `getCooldownInfo()` (async). Lý do: `getCooldownInfo()` returns Promise
  // nhưng được gọi sync → `memCooldowns = Promise` → `memCooldowns[provider]`
  // luôn undefined → cooldown filter bị bypass hoàn toàn. Hệ quả: request cứ
  // thử provider đang cooldown → tốn 9s STREAM_TIMEOUT mỗi lần → chain fail.
  const memCooldowns = getCooldownInfoSync();

  // 1) CHAT_PROVIDERS env
  const configured = parseChatProviders();
  for (const { provider, modelName } of configured) {
    if (!hasKeyFor(provider, cfg)) continue;
    if (memCooldowns[provider]) {
      console.log(`[chatbot] skipping ${provider} (in cooldown, ${memCooldowns[provider]}s remaining)`);
      continue;
    }
    const inst = instantiateModel(provider, modelName, cfg);
    if (inst) chain.push({ provider, modelName, instance: inst });
  }

  // 2) Backward compat: nếu CHAT_PROVIDERS rỗng hoặc không có entry nào valid
  if (chain.length === 0) {
    // Primary provider trước
    const primaryProvider = cfg.provider;
    const primaryModel = defaults[primaryProvider] ?? defaults.groq;
    if (hasKeyFor(primaryProvider, cfg)) {
      const inst = instantiateModel(primaryProvider, primaryModel, cfg);
      if (inst) chain.push({ provider: primaryProvider, modelName: primaryModel, instance: inst });
    }

    // Auto-fallback: groq (free, nhanh) → các free provider khác → paid cuối
    const fallbackOrder: ChatProvider[] = [
      'groq',
      'openrouter',
      'cerebras',
      'cloudflare',
      'gemini',
      'openai',
    ];
    for (const provider of fallbackOrder) {
      if (chain.find((e) => e.provider === provider)) continue;
      if (!hasKeyFor(provider, cfg)) continue;
      if (memCooldowns[provider]) {
        console.log(`[chatbot] skipping ${provider} (in cooldown, ${memCooldowns[provider]}s remaining)`);
        continue;
      }
      const modelName = defaults[provider];
      const inst = instantiateModel(provider, modelName, cfg);
      if (inst) chain.push({ provider, modelName, instance: inst });
    }
  }

  const skipped = Object.entries(memCooldowns).map(([p, s]) => `${p}(${s}s)`).join(', ');
  if (skipped) {
    console.log(`[chatbot] chain=${chain.map((e) => e.provider).join(' → ')} | in cooldown: ${skipped}`);
  } else {
    console.log(`[chatbot] chain=${chain.map((e) => e.provider).join(' → ')} (no cooldowns)`);
  }

  return chain;
}

export function getChatModel() {
  const chain = getChatModelChain();
  if (chain.length === 0) return null;
  const first = chain[0];
  _lastUsedProvider = `${first.provider}/${first.modelName}`;
  return first.instance;
}

export function getChatModelName(): string {
  return _lastUsedProvider ?? 'unconfigured';
}

/**
 * Đánh dấu provider nào đã dùng (gọi từ route handler sau khi loop chain thành công).
 */
export function setActiveProvider(provider: string, modelName: string) {
  _lastUsedProvider = `${provider}/${modelName}`;
}
