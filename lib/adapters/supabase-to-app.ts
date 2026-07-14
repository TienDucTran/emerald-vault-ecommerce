// Adapter: Supabase rows -> app domain types
// Mục tiêu: cho phép các component hiện tại (đang expect lib/types.ts Product/Collection)
// dùng data từ Supabase queries mà không cần đổi component.

import type { Product, Collection, ProductStatus, Material, ProductCategory, QualityTier } from '@/lib/types';
import type { ProductRow, CollectionRow } from '@/lib/supabase/types';
import type { ProductBasic } from '@/lib/supabase/queries/products';
import type { CollectionBasic } from '@/lib/supabase/queries/collections';

export function toProduct(p: ProductBasic | ProductRow): Product {
  return {
    id: p.id,
    collection_id: p.collection_id ?? undefined,
    title: p.title,
    slug: p.slug,
    description: 'description' in p ? (p.description ?? undefined) : undefined,
    material: p.material as Material,
    category: p.category as ProductCategory,
    image_url: p.image_url,
    gallery: p.gallery ?? [],
    price: p.price,
    original_price: 'original_price' in p ? (p.original_price ?? undefined) : undefined,
    era: 'era' in p ? (p.era ?? undefined) : undefined,
    code: p.code ?? undefined,
    color: p.color ?? undefined,
    status: p.status as ProductStatus,
    is_featured: p.is_featured,
    quality_tier: p.quality_tier as QualityTier,
    season_tags: p.season_tags ?? [],
    created_at: p.created_at,
    updated_at: 'updated_at' in p ? p.updated_at : undefined,
    story_quote: 'story_quote' in p ? (p.story_quote ?? undefined) : undefined,
    story_body: 'story_body' in p ? (p.story_body ?? undefined) : undefined,
    highlight_title: 'highlight_title' in p ? (p.highlight_title ?? undefined) : undefined,
    highlight_body: 'highlight_body' in p ? (p.highlight_body ?? undefined) : undefined,
    highlight_image: 'highlight_image' in p ? (p.highlight_image ?? undefined) : undefined,
    specs: 'product_specs' in p
      ? ((p as ProductRow & { product_specs?: { id: string; label: string; value: string; display_order: number }[] }).product_specs
          ?.map((s) => ({ label: s.label, value: s.value })) ?? undefined)
      : undefined,
  };
}

export function toCollection(c: CollectionBasic | CollectionRow): Collection {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? undefined,
    cover_image_url: c.cover_image_url ?? undefined,
    is_published: c.is_published,
    display_order: c.display_order,
    created_at: c.created_at,
    launch_at: c.launch_at ?? undefined,
    story_text: 'story_text' in c ? (c.story_text ?? undefined) : undefined,
    hero_gallery: 'hero_gallery' in c ? (c.hero_gallery ?? undefined) : undefined,
    meta_title: 'meta_title' in c ? (c.meta_title ?? undefined) : undefined,
    meta_description: 'meta_description' in c ? (c.meta_description ?? undefined) : undefined,
  };
}
