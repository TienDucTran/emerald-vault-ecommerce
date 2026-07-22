// lib/chatbot/config.ts
// Chat & Embed config singletons (no cache, called per request) — §15.2.3

export type ChatProvider =
  | 'openrouter'
  | 'cerebras'
  | 'cloudflare'
  | 'groq'
  | 'gemini'
  | 'openai';

export type EmbedProvider = 'openrouter' | 'gemini' | 'openai';

export function getChatConfig() {
  const provider = (process.env.AI_PRIMARY || 'groq') as ChatProvider;
  return {
    provider,
    isConfigured: !!(
      process.env.OPENROUTER_API_KEY ||
      process.env.CEREBRAS_API_KEY ||
      process.env.CLOUDFLARE_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.OPENAI_API_KEY
    ),
    openrouterKey: process.env.OPENROUTER_API_KEY || '',
    cerebrasKey: process.env.CEREBRAS_API_KEY || '',
    cloudflareKey: process.env.CLOUDFLARE_API_KEY || '',
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    geminiKey: process.env.GOOGLE_AI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
  };
}

export function getEmbedConfig() {
  const provider = (process.env.EMBED_PRIMARY || 'gemini') as EmbedProvider;
  return {
    provider,
    isConfigured: !!(
      process.env.OPENROUTER_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.OPENAI_API_KEY
    ),
    openrouterKey: process.env.OPENROUTER_API_KEY || '',
    geminiKey: process.env.GOOGLE_AI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    // Output dim 1536 (compatible với OpenAI text-embedding-3-small; Gemini hỗ trợ outputDimensionality: 1536)
    outputDimensionality: 1536,
  };
}
