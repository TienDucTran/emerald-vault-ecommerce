// lib/chatbot/embeddings.ts
// Embed query / batch bằng Gemini hoặc OpenAI (chung dim 1536) — §15.7
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { embedMany } from 'ai';
import { getEmbedConfig } from './config';

let _googleModel: any = null;
let _openaiModel: any = null;

function getModel() {
  const cfg = getEmbedConfig();
  if (cfg.provider === 'openai' && cfg.openaiKey) {
    if (!_openaiModel) {
      const openai = createOpenAI({ apiKey: cfg.openaiKey });
      _openaiModel = openai.embedding('text-embedding-3-small');
    }
    return { provider: 'openai' as const, model: _openaiModel };
  }
  if (!_googleModel) {
    const google = createGoogleGenerativeAI({ apiKey: cfg.geminiKey });
    // gemini-embedding-001 vẫn là model chính cho free tier. Nếu bị retire, fallback:
    // - 'text-embedding-004' (older, cùng 768-dim, vẫn dùng outputDimensionality)
    // - 'embedding-001' (legacy 768-dim, không cần outputDimensionality)
    _googleModel = google.embedding('gemini-embedding-001');
  }
  return { provider: 'gemini' as const, model: _googleModel };
}

export async function embedQuery(query: string): Promise<number[] | null> {
  const cfg = getEmbedConfig();
  if (!cfg.isConfigured) return null;
  const { provider, model } = getModel();
  try {
    const { embeddings } = await embedMany({
      model,
      values: [query],
      ...(provider === 'gemini' ? { providerOptions: { google: { outputDimensionality: cfg.outputDimensionality } } } : {}),
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
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    try {
      const { embeddings } = await embedMany({
        model,
        values: slice,
        ...(provider === 'gemini' ? { providerOptions: { google: { outputDimensionality: cfg.outputDimensionality } } } : {}),
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
