import { createClient } from '@/lib/supabase/server';
import type { CollectionRow } from '@/lib/supabase/types';

const COLLECTION_BASIC = 'id, name, slug, description, cover_image_url, is_published, display_order, launch_at' as const;
const COLLECTION_FULL = `${COLLECTION_BASIC}, story_text, hero_gallery, meta_title, meta_description, created_at` as const;

export type CollectionBasic = Pick<CollectionRow,
  'id' | 'name' | 'slug' | 'description' | 'cover_image_url' | 'is_published' | 'display_order' | 'launch_at'
>;

export async function getPublishedCollections(): Promise<CollectionBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('collections')
    .select(COLLECTION_BASIC)
    .eq('is_published', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CollectionBasic[];
}

export async function getAllCollections(): Promise<CollectionBasic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('collections')
    .select(COLLECTION_BASIC)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CollectionBasic[];
}

export async function getCollectionBySlug(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('collections')
    .select(COLLECTION_FULL)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as (CollectionRow) | null;
}
