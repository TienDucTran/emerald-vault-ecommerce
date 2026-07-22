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
const _rateLimitCooldowns = new Map<string, number>(); // provider -> cooldownUntilMs
const DEFAULT_COOLDOWN_MS = 60_000; // 60s default if we can't parse "try again in Xs"
const RETRY_AFTER_RE = /try again in\s+([\d.]+)\s*s/i;
const RATE_LIMIT_DETECT_RE = /rate limit|429|tokens per minute|\btpm\b|quota|too many requests|try again in/i;

/**
 * Returns true if the provider is currently NOT in cooldown (or its cooldown
 * has already expired — in which case the stale entry is removed).
 */
export function isProviderAvailable(provider: string): boolean {
  const until = _rateLimitCooldowns.get(provider);
  if (until === undefined) return true;
  if (Date.now() >= until) {
    _rateLimitCooldowns.delete(provider);
    return true;
  }
  return false;
}

/**
 * Mark a provider as rate-limited. Parses "Please try again in 26.94s" from
 * the error message to set a precise cooldown (with 2s buffer); falls back to
 * DEFAULT_COOLDOWN_MS if the duration cannot be parsed.
 * Returns the cooldown duration in ms (for logging).
 */
export function markProviderRateLimited(provider: string, errorMessage?: string): number {
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
  _rateLimitCooldowns.set(provider, until);
  console.warn(
    `[chatbot] ${provider} marked rate-limited, cooldown=${Math.round(cooldownMs / 1000)}s (until ${new Date(until).toISOString()})`
  );
  return cooldownMs;
}

/**
 * For observability: returns map of provider -> remaining cooldown seconds.
 */
export function getCooldownInfo(): Record<string, number> {
  const now = Date.now();
  const out: Record<string, number> = {};
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
    // Cerebras: model verified working (alternative nếu 70b fail: 'llama-3.1-8b')
    cerebras: 'llama-3.3-70b',
    // Cloudflare: OpenAI-compat cần prefix @cf/ — đã verify trên docs
    cloudflare: '@cf/meta/llama-3.1-8b-instruct',
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
    cerebras: ['llama-3.3-70b', 'llama-3.1-8b', 'qwen-2.5-72b-instruct'],
    cloudflare: [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3.1-8b-instruct-awq',
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

  // 1) CHAT_PROVIDERS env
  const configured = parseChatProviders();
  for (const { provider, modelName } of configured) {
    if (!hasKeyFor(provider, cfg)) continue;
    if (!isProviderAvailable(provider)) {
      console.log(`[chatbot] skipping ${provider} (in cooldown)`);
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
      if (!isProviderAvailable(provider)) {
        console.log(`[chatbot] skipping ${provider} (in cooldown)`);
        continue;
      }
      const modelName = defaults[provider];
      const inst = instantiateModel(provider, modelName, cfg);
      if (inst) chain.push({ provider, modelName, instance: inst });
    }
  }

  const skipped = Object.entries(getCooldownInfo()).map(([p, s]) => `${p}(${s}s)`).join(', ');
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
