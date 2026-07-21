// lib/chatbot/client.ts
// Weighted multi-provider chain (rule-based).
// Config qua env CHAT_PROVIDERS (CSV):
//   "groq:llama-3.3-70b-versatile,gemini:gemini-2.0-flash,openai:gpt-4o-mini"
// Mỗi entry = "<provider>:<model>". Thứ tự = thứ tự ưu tiên.
// Mỗi request thử từ trên xuống, fail thì fallback entry tiếp theo.
// Nếu CHAT_PROVIDERS không set → fallback về AI_PRIMARY (backward compat).
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { getChatConfig } from './config';

export interface ChatModelEntry {
  provider: string;
  modelName: string;
  instance: any;
}

let _lastUsedProvider: string | null = null;

export function getLastUsedProvider(): string {
  return _lastUsedProvider ?? 'none';
}

/**
 * Parse env CHAT_PROVIDERS thành danh sách entry ưu tiên.
 * Format: "groq:llama-3.3-70b-versatile,gemini:gemini-2.0-flash,openai:gpt-4o-mini"
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
 * Build chain KHẢ DỤNG theo thứ tự ưu tiên:
 * 1. Nếu có CHAT_PROVIDERS env → dùng thứ tự đó, filter ra entries không có key
 * 2. Nếu không → dùng AI_PRIMARY (backward compat) + auto-fallback các provider còn key
 */
export function getChatModelChain(): ChatModelEntry[] {
  const cfg = getChatConfig();
  const chain: ChatModelEntry[] = [];

  const hasKey = (provider: string) => {
    if (provider === 'gemini') return !!cfg.geminiKey;
    if (provider === 'openai') return !!cfg.openaiKey;
    if (provider === 'groq') return !!cfg.groqKey;
    return false;
  };

  const instantiate = (provider: string, modelName: string): any => {
    if (provider === 'gemini' && cfg.geminiKey) {
      const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
      return google(modelName);
    }
    if (provider === 'openai' && cfg.openaiKey) {
      const openai = createOpenAI({ apiKey: cfg.openaiKey });
      return openai(modelName);
    }
    if (provider === 'groq' && cfg.groqKey) {
      const groq = createGroq({ apiKey: cfg.groqKey });
      return groq(modelName);
    }
    return null;
  };

  // 1) CHAT_PROVIDERS env
  const configured = parseChatProviders();
  for (const { provider, modelName } of configured) {
    if (!hasKey(provider)) continue;
    const inst = instantiate(provider, modelName);
    if (inst) chain.push({ provider, modelName, instance: inst });
  }

  // 2) Backward compat: nếu CHAT_PROVIDERS rỗng hoặc không có entry nào valid
  if (chain.length === 0) {
    if (cfg.provider === 'openai' && cfg.openaiKey) {
      chain.push({ provider: 'openai', modelName: 'gpt-4o-mini', instance: instantiate('openai', 'gpt-4o-mini') });
    } else if (cfg.provider === 'groq' && cfg.groqKey) {
      chain.push({ provider: 'groq', modelName: 'llama-3.3-70b-versatile', instance: instantiate('groq', 'llama-3.3-70b-versatile') });
    } else if (cfg.provider === 'gemini' && cfg.geminiKey) {
      chain.push({ provider: 'gemini', modelName: 'gemini-2.0-flash', instance: instantiate('gemini', 'gemini-2.0-flash') });
    }
    if (cfg.groqKey && !chain.find((e) => e.provider === 'groq')) {
      chain.push({ provider: 'groq', modelName: 'llama-3.3-70b-versatile', instance: instantiate('groq', 'llama-3.3-70b-versatile') });
    }
    if (cfg.geminiKey && !chain.find((e) => e.provider === 'gemini')) {
      chain.push({ provider: 'gemini', modelName: 'gemini-2.0-flash', instance: instantiate('gemini', 'gemini-2.0-flash') });
    }
    if (cfg.openaiKey && !chain.find((e) => e.provider === 'openai')) {
      chain.push({ provider: 'openai', modelName: 'gpt-4o-mini', instance: instantiate('openai', 'gpt-4o-mini') });
    }
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
