// lib/chatbot/config.ts
// Chat & Embed config singletons (no cache, called per request) — §15.2.3
import type {} from 'node:process';

type ChatProvider = 'gemini' | 'openai' | 'groq';
type EmbedProvider = 'gemini' | 'openai';

export function getChatConfig() {
  const provider = (process.env.AI_PRIMARY || 'gemini') as ChatProvider;
  return {
    provider,
    isConfigured: !!(process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY),
    geminiKey: process.env.GOOGLE_AI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
  };
}

export function getEmbedConfig() {
  const provider = (process.env.EMBED_PRIMARY || 'gemini') as EmbedProvider;
  return {
    provider,
    isConfigured: !!(process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY),
    geminiKey: process.env.GOOGLE_AI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    // Output dim 1536 (compatible với OpenAI text-embedding-3-small; Gemini hỗ trợ outputDimensionality: 1536)
    outputDimensionality: 1536,
  };
}
