// lib/chatbot/embeddings.ts
// Embed query / batch bằng OpenRouter / Gemini / OpenAI (chung dim 1536) — §15.7
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { getEmbedConfig } from './config';

let _googleModel: any = null;
let _openaiModel: any = null;
let _openrouterModel: any = null;

type ResolvedProvider = 'openrouter' | 'openai' | 'gemini';

function getModel(): { provider: ResolvedProvider; model: any } {
  const cfg = getEmbedConfig();
  const tried = new Set<ResolvedProvider>();
  const order: ResolvedProvider[] =
    cfg.provider === 'openai' || cfg.provider === 'openrouter' || cfg.provider === 'gemini'
      ? [cfg.provider as ResolvedProvider, 'openrouter', 'gemini', 'openai']
      : ['openrouter', 'gemini', 'openai'];

  for (const p of order) {
    if (tried.has(p)) continue;
    tried.add(p);
    if (p === 'openrouter' && cfg.openrouterKey) {
      if (!_openrouterModel) {
        const openrouter = createOpenAI({
          apiKey: cfg.openrouterKey,
          baseURL: 'https://openrouter.ai/api/v1',
          headers: {
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://emerald-vault.local',
            'X-Title': 'Emerald Vault',
          },
        });
        _openrouterModel = openrouter.embedding('text-embedding-3-small');
      }
      return { provider: 'openrouter', model: _openrouterModel };
    }
    if (p === 'openai' && cfg.openaiKey) {
      if (!_openaiModel) {
        const openai = createOpenAI({ apiKey: cfg.openaiKey });
        _openaiModel = openai.embedding('text-embedding-3-small');
      }
      return { provider: 'openai', model: _openaiModel };
    }
    if (p === 'gemini' && cfg.geminiKey) {
      if (!_googleModel) {
        const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
        // gemini-embedding-001 vẫn là model chính cho free tier. Nếu bị retire, fallback:
        // - 'text-embedding-004' (older, cùng 768-dim, vẫn dùng outputDimensionality)
        // - 'embedding-001' (legacy 768-dim, không cần outputDimensionality)
        _googleModel = google.embedding('gemini-embedding-001');
      }
      return { provider: 'gemini', model: _googleModel };
    }
  }
  throw new Error('No embed provider configured (need OPENROUTER_API_KEY or GOOGLE_AI_API_KEY or OPENAI_API_KEY)');
}

function buildEmbedOpts(provider: ResolvedProvider, cfg: ReturnType<typeof getEmbedConfig>) {
  if (provider === 'gemini') {
    return {
      providerOptions: { google: { outputDimensionality: cfg.outputDimensionality } },
    };
  }
  // openai / openrouter — chỉ truyền dimensions khi khác default 1536
  if (cfg.outputDimensionality && cfg.outputDimensionality !== 1536) {
    return { dimensions: cfg.outputDimensionality };
  }
  return {};
}

export async function embedQuery(query: string): Promise<number[] | null> {
  const cfg = getEmbedConfig();
  if (!cfg.isConfigured) return null;
  const { provider, model } = getModel();
  try {
    const { embeddings } = await embedMany({
      model,
      values: [query],
      ...buildEmbedOpts(provider, cfg),
    });
    return embeddings[0] ?? null;
  } catch (err) {
    console.error('[embedQuery]', err);
    return null;
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const cfg = getEmbedConfig();
  if (!cfg.isConfigured) return [];
  const { provider, model } = getModel();
  const BATCH = 100; // Gemini free: 1500 req/day, 1 req có thể embed nhiều texts
  const opts = buildEmbedOpts(provider, cfg);
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    try {
      const { embeddings } = await embedMany({
        model,
        values: slice,
        ...opts,
      });
      out.push(...embeddings);
    } catch (err) {
      console.error(`[embedBatch] chunk ${i}-${i + BATCH} failed:`, err);
      // Fill with empty arrays to keep alignment
      out.push(...slice.map(() => []));
    }
    // Rate limit
    if (i + BATCH < texts.length) {
      await new Promise((r) => setTimeout(r, 1100)); // ~1s giữa các request
    }
  }
  return out;
}
