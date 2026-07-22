// Helpers gọi từ admin route handlers khi CRUD data liên quan đến chatbot.
// Best-effort: nếu fail phải silent (không block CRUD).

import { invalidateTool, invalidateCachePattern } from './tool-cache';

const PRODUCT_TOOLS = [
  'searchProducts',
  'semanticSearch',
  'getProductDetail',
  'getRelatedProducts',
  'getFeaturedProducts',
] as const;

const COLLECTION_TOOLS = ['getCurrentCollections', 'getUpcomingCollections'] as const;
const KNOWLEDGE_TOOLS = ['getKnowledge', 'getFaq'] as const;
const PROMOTION_TOOLS = ['getActivePromotions'] as const;
const UPCOMING_PRODUCT_TOOLS = ['getUpcomingProducts'] as const;

function safeInvalidate(fn: () => number | void, label: string): void {
  try {
    const result = fn();
    const cleared = typeof result === 'number' ? result : 0;
    if (cleared > 0) {
      console.log(`[cache-invalidation] ${label}: cleared ${cleared} entries`);
    }
  } catch (e) {
    // Silent — cache invalidation không được block CRUD
    console.error(`[cache-invalidation] ${label} failed:`, e instanceof Error ? e.message : e);
  }
}

/** Gọi sau khi admin create/update/delete product. */
export function invalidateProductCache(): void {
  for (const tool of PRODUCT_TOOLS) {
    safeInvalidate(() => invalidateTool(tool), `product → ${tool}`);
  }
}

/** Gọi sau khi admin CRUD collection. */
export function invalidateCollectionCache(): void {
  for (const tool of COLLECTION_TOOLS) {
    safeInvalidate(() => invalidateTool(tool), `collection → ${tool}`);
  }
}

/** Gọi sau khi admin CRUD knowledge/FAQ. */
export function invalidateKnowledgeCache(): void {
  for (const tool of KNOWLEDGE_TOOLS) {
    safeInvalidate(() => invalidateTool(tool), `knowledge → ${tool}`);
  }
}

/** Gọi sau khi admin CRUD promotion. */
export function invalidatePromotionCache(): void {
  for (const tool of PROMOTION_TOOLS) {
    safeInvalidate(() => invalidateTool(tool), `promotion → ${tool}`);
  }
}

/** Gọi sau khi admin CRUD upcoming product. */
export function invalidateUpcomingProductCache(): void {
  for (const tool of UPCOMING_PRODUCT_TOOLS) {
    safeInvalidate(() => invalidateTool(tool), `upcoming → ${tool}`);
  }
}

/** Nuke toàn bộ cache (dùng khi cần reset, vd test hoặc data corruption). */
export function invalidateAllChatbotCache(): void {
  safeInvalidate(() => invalidateCachePattern(':'), 'all');
}
