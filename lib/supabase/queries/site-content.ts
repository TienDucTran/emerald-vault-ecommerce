// Server-only queries + adapters for site content.
// Client Components must import from site-content-defaults.ts instead.

import { createClient } from '@/lib/supabase/server';
import type { HomeBannerRow } from '@/lib/supabase/types';
import type { HomeBanner, SiteSettings, BannerSlotKey } from '@/lib/types';

// Re-export defaults + bannersBySlot for server-side callers (single import path)
export {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_BANNERS,
  bannersBySlot,
} from './site-content-defaults';

/**
 * Get all site settings as a key-value map.
 * Returns empty object on error (caller uses fallback defaults).
 */
export async function getSiteSettings(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value');
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }
  return map;
}

/**
 * Get all active home banners, filtered by current time (valid_from/valid_until).
 * Ordered by display_order ASC.
 */
export async function getActiveHomeBanners(): Promise<HomeBannerRow[]> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('home_banners')
    .select('*')
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomeBannerRow[];
}

/**
 * Get ALL home banners (including inactive) — admin only.
 */
export async function getAllHomeBanners(): Promise<HomeBannerRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('home_banners')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomeBannerRow[];
}

// ─── Adapters ───────────────────────────────────────────────────────────────

export function toHomeBanner(r: HomeBannerRow): HomeBanner {
  return {
    id: r.id,
    slot_key: r.slot_key as BannerSlotKey,
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    image_url: r.image_url,
    link_url: r.link_url,
    display_order: r.display_order,
    is_active: r.is_active,
    valid_from: r.valid_from ?? undefined,
    valid_until: r.valid_until ?? undefined,
  };
}

/**
 * Parse raw key-value settings into typed SiteSettings object.
 * `announcement_messages` is stored as JSON array string.
 */
export function toSiteSettings(map: Record<string, string>): SiteSettings {
  let announcementMessages: string[] | undefined;
  if (map['announcement_messages']) {
    try {
      const parsed = JSON.parse(map['announcement_messages']);
      if (Array.isArray(parsed)) {
        announcementMessages = parsed.filter((s) => typeof s === 'string');
      }
    } catch {
      // ignore parse error — fallback to default
    }
  }
  return {
    site_name: map['site_name'],
    contact_email: map['contact_email'],
    contact_phone: map['contact_phone'],
    contact_zalo: map['contact_zalo'],
    address: map['address'],
    footer_tagline: map['footer_tagline'],
    social_instagram: map['social_instagram'],
    social_facebook: map['social_facebook'],
    social_tiktok: map['social_tiktok'],
    announcement_messages: announcementMessages,
    live_stream_url: map['live_stream_url'],
    map_embed_url: map['map_embed_url'],
    map_link_url: map['map_link_url'],
  };
}