// lib/env.ts
// Centralized environment validation (zod) — Next.js App Router server-only.
//
// Pattern:
//  - Import 'server-only' để chặn bundle vào Client Component.
//  - Validate 1 lần lúc module load (re-used cho các request kế tiếp).
//  - Escape hatch: SKIP_ENV_VALIDATION=1 (build time, khi env chưa ready).
//  - Friendly error: liệt kê đầy đủ missing vars → developer fix nhanh.
//
// Lý do dùng module-level cache (let cached = ...):
//  - process.env là constant trong Node runtime.
//  - Tránh chạy zod parse() mỗi request → tránh overhead + side-effect không cần.
//  - getServerEnv() vẫn throw nếu env invalid (không graceful degrade ở production).

import 'server-only';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Optional URL: empty string → undefined; non-empty → phải là URL hợp lệ.
 * Cho phép optional env vars kiểu URL mà user có thể bỏ trống mà không cần
 * cung cấp fallback constant.
 */
const optionalUrl = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : undefined))
  .pipe(z.string().url().optional());

/**
 * Optional non-empty string: empty/missing → undefined; có giá trị → string.
 */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : undefined));

/**
 * Optional URL hoặc string tự do (vd MOMO_RETURN_URL không bắt buộc là URL
 * vì fallback về NEXT_PUBLIC_SITE_URL). Dùng khi optional nhưng vẫn cần check
 * non-empty khi có.
 */
const optionalStringOrUndef = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : undefined));

// ---------------------------------------------------------------------------
// Server-side schema (TOÀN BỌ env)
// ---------------------------------------------------------------------------

const serverSchema = z.object({
  // ── Supabase (always required) ──────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // ── Site URL ────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL must be a valid URL'),

  // ── AI Chatbot (always required — chatbot is core feature) ──────────────
  AI_PRIMARY: z
    .enum(['groq', 'openai', 'gemini', 'openrouter', 'cerebras', 'cloudflare'])
    .default('groq'),
  GROQ_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  GOOGLE_AI_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,
  CEREBRAS_API_KEY: optionalString,
  CLOUDFLARE_API_KEY: optionalString,
  CLOUDFLARE_ACCOUNT_ID: optionalString,

  // ── Upstash Redis (optional — chatbot có fallback in-memory) ────────────
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  // ── Analytics ───────────────────────────────────────────────────────────
  NEXT_PUBLIC_GA_ID: optionalString,

  // ── Bank / VietQR (optional — checkout sẽ disable nếu thiếu) ──────────
  BANK_CODE: optionalString,
  BANK_ACCOUNT_NUMBER: optionalString,
  BANK_ACCOUNT_NAME: optionalString,

  // ── MoMo (Phase 2 — optional) ───────────────────────────────────────────
  MOMO_PARTNER_CODE: optionalString,
  MOMO_ACCESS_KEY: optionalString,
  MOMO_SECRET_KEY: optionalString,
  MOMO_REDIRECT_URL: optionalStringOrUndef,
  MOMO_IPN_URL: optionalStringOrUndef,

  // ── Sentry (Phase 2 — optional) ─────────────────────────────────────────
  SENTRY_DSN: optionalString,

  // ── Runtime (Next.js / Vercel) ──────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  VERCEL_URL: optionalString,
});

// ---------------------------------------------------------------------------
// Client-side schema (chỉ NEXT_PUBLIC_* — bundle được vào client)
// ---------------------------------------------------------------------------

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_SITE_URL: true,
  NEXT_PUBLIC_GA_ID: true,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

export interface BankConfig {
  isConfigured: boolean;
  code?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface ChatProviderConfig {
  provider: 'groq' | 'openai' | 'gemini' | 'openrouter' | 'cerebras' | 'cloudflare';
  isConfigured: boolean;
  keys: {
    groq?: string;
    openai?: string;
    gemini?: string;
    openrouter?: string;
    cerebras?: string;
    cloudflare?: string;
    cloudflareAccountId?: string;
  };
}

export interface MoMoConfig {
  isConfigured: boolean;
  partnerCode?: string;
  accessKey?: string;
  secretKey?: string;
  env: 'sandbox' | 'production';
  redirectUrl?: string;
  ipnUrl?: string;
}

// ---------------------------------------------------------------------------
// Parse + cache
// ---------------------------------------------------------------------------

let cached: ServerEnv | null = null;

/**
 * Extract missing keys (nếu có) từ zod SafeParseError.
 * Duyệt issues theo path — mỗi path = tên env var.
 */
function extractMissingKeys(error: z.ZodError): string[] {
  const missing: string[] = [];
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string') {
      // Gom duplicate (nhiều rule fail trên cùng key)
      if (!missing.includes(key)) missing.push(key);
    }
  }
  return missing;
}

/**
 * Parse + validate toàn bộ env lúc startup.
 * Throw error với friendly message nếu thiếu required vars.
 */
function parseEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const missing = extractMissingKeys(result.error);
    const isProduction = process.env.NODE_ENV === 'production';
    const lines = [
      'Missing required environment variables:',
      ...missing.map((k) => `  - ${k}`),
      '',
      'See .env.local.example for full list.',
    ];
    const message = lines.join('\n');
    if (isProduction) {
      // Production: throw thẳng, không graceful degrade.
      throw new Error(message);
    }
    // Dev: vẫn throw — fail-fast hơn silent degrade.
    // (Tuy nhiên nếu SKIP_ENV_VALIDATION=1 thì parse() pass với optional empty.)
    throw new Error(message);
  }
  return result.data;
}

/**
 * Validate env, cached 1 lần cho cả process lifetime.
 * Throw on missing required keys (với friendly error listing missing vars).
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  // Escape hatch: build time (Next.js collect page data) thường chưa có env
  // → cho phép skip. SKIP_ENV_VALIDATION=1 cũng dùng cho unit tests.
  if (process.env.SKIP_ENV_VALIDATION === '1') {
    // Vẫn parse (không skip validation hoàn toàn — default cho optional).
    // Nếu required vars missing sẽ throw, tùy caller.
    cached = serverSchema.parse(process.env);
    return cached;
  }
  cached = parseEnv();
  return cached;
}

/**
 * Validate client-side env (chỉ NEXT_PUBLIC_*).
 * Next.js tự embed các var này vào client bundle qua inlining.
 *
 * Lưu ý: Hàm này chỉ nên được gọi từ Client Component (import 'client-only' bên
 * file consumer nếu cần). Module này vẫn là 'server-only' — nếu Client Component
 * import, build sẽ fail với 'server-only' guard.
 *
 * Pattern đúng: file riêng export getClientEnv() cho client, hoặc gọi thẳng
 * process.env.NEXT_PUBLIC_* ở client (Next.js sẽ inline vào JS bundle).
 *
 * Tuy nhiên để có type-safety, vẫn export — dev có thể dùng trong Server Component
 * hoặc API route để truy xuất tập var an toàn.
 */
export function getClientEnv(): ClientEnv {
  const result = clientSchema.safeParse(process.env);
  if (!result.success) {
    const missing = extractMissingKeys(result.error);
    throw new Error(
      `Missing required client env vars: ${missing.join(', ')}`
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Domain-specific accessors
// ---------------------------------------------------------------------------

/**
 * Bank config cho VietQR checkout.
 * isConfigured = false nếu thiếu bất kỳ field nào (code/accountNumber/accountName).
 */
export function getBankConfig(): BankConfig {
  const env = getServerEnv();
  const code = env.BANK_CODE;
  const accountNumber = env.BANK_ACCOUNT_NUMBER;
  const accountName = env.BANK_ACCOUNT_NAME;
  const isConfigured = !!code && !!accountNumber && !!accountName;
  return {
    isConfigured,
    code,
    accountNumber,
    accountName,
  };
}

/**
 * Chat provider config cho lib/chatbot/config.ts.
 * Đảm bảo ít nhất 1 provider có key (primary hoặc fallback).
 */
export function getChatProviderConfig(): ChatProviderConfig {
  const env = getServerEnv();
  const provider = env.AI_PRIMARY;
  const keys = {
    groq: env.GROQ_API_KEY,
    openai: env.OPENAI_API_KEY,
    gemini: env.GOOGLE_AI_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
    cerebras: env.CEREBRAS_API_KEY,
    cloudflare: env.CLOUDFLARE_API_KEY,
    cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
  };
  const isConfigured = !!(
    keys.groq ||
    keys.openai ||
    keys.gemini ||
    keys.openrouter ||
    keys.cerebras ||
    (keys.cloudflare && keys.cloudflareAccountId)
  );
  return { provider, isConfigured, keys };
}

/**
 * MoMo config (Phase 2 — all optional, return isConfigured=true chỉ khi
 * cả 3 key đều có).
 */
export function getMoMoConfig(): MoMoConfig {
  const env = getServerEnv();
  const isConfigured = !!(
    env.MOMO_PARTNER_CODE &&
    env.MOMO_ACCESS_KEY &&
    env.MOMO_SECRET_KEY
  );
  const momoEnv: 'sandbox' | 'production' =
    env.NODE_ENV === 'production' ? 'production' : 'sandbox';
  return {
    isConfigured,
    partnerCode: env.MOMO_PARTNER_CODE,
    accessKey: env.MOMO_ACCESS_KEY,
    secretKey: env.MOMO_SECRET_KEY,
    env: momoEnv,
    redirectUrl: env.MOMO_REDIRECT_URL,
    ipnUrl: env.MOMO_IPN_URL,
  };
}

/**
 * Upstash Redis config (optional, chatbot rate-limit dùng cho cross-instance).
 */
export function getUpstashConfig(): {
  isConfigured: boolean;
  url?: string;
  token?: string;
} {
  const env = getServerEnv();
  const isConfigured = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  return {
    isConfigured,
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  };
}

// ---------------------------------------------------------------------------
// Runtime flags
// ---------------------------------------------------------------------------

export const isProduction = process.env.NODE_ENV === 'production';
export const isVercel = !!process.env.VERCEL;
/** 'production' | 'preview' | 'development' | undefined */
export const vercelEnv = process.env.VERCEL_ENV as
  | 'production'
  | 'preview'
  | 'development'
  | undefined;

// ---------------------------------------------------------------------------
// Optional-env dev warnings (log 1 lần lúc init)
// ---------------------------------------------------------------------------

const warnedOptional = new Set<string>();

function warnOptional(key: string, hint: string): void {
  if (warnedOptional.has(key)) return;
  if (process.env.NODE_ENV === 'production') return; // silent ở prod
  if (process.env[key]) return;
  warnedOptional.add(key);
  console.warn(`[env] ${key} missing — ${hint}`);
}

// Cache init: chỉ chạy 1 lần khi module được load lần đầu.
function initOptionalWarnings(): void {
  if (!cached) {
    try {
      getServerEnv();
    } catch {
      // Skip warnings nếu env invalid — lỗi đã throw ở getServerEnv() rồi.
      return;
    }
  }
  warnOptional('UPSTASH_REDIS_REST_URL', 'using in-memory fallback for rate-limit');
  warnOptional('UPSTASH_REDIS_REST_TOKEN', 'using in-memory fallback for rate-limit');
  warnOptional('CLOUDFLARE_API_KEY', 'CLOUDFLARE provider will be skipped');
  warnOptional('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE provider will be skipped');
  warnOptional('OPENAI_API_KEY', 'OPENAI provider will be skipped (paid fallback)');
  warnOptional('CEREBRAS_API_KEY', 'CEREBRAS provider will be skipped');
  warnOptional('OPENROUTER_API_KEY', 'OPENROUTER provider will be skipped');
  warnOptional('GOOGLE_AI_API_KEY', 'GEMINI provider will be skipped');
  warnOptional('MOMO_PARTNER_CODE', 'MoMo routes will return 503');
  warnOptional('MOMO_ACCESS_KEY', 'MoMo routes will return 503');
  warnOptional('MOMO_SECRET_KEY', 'MoMo routes will return 503');
  warnOptional('BANK_CODE', 'bank_transfer checkout will return 503');
  warnOptional('BANK_ACCOUNT_NUMBER', 'bank_transfer checkout will return 503');
  warnOptional('BANK_ACCOUNT_NAME', 'bank_transfer checkout will return 503');
  warnOptional('SENTRY_DSN', 'Sentry error reporting disabled');
  warnOptional('NEXT_PUBLIC_GA_ID', 'Google Analytics disabled');
}

initOptionalWarnings();
