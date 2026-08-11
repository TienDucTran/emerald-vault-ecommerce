// Default fallbacks for site content — safe to import from Client Components.
// This file does NOT import any server-only code (no createClient, no next/headers).

import type { HomeBanner, SiteSettings, BannerSlotKey } from '@/lib/types';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: 'Emerald Vault',
  contact_email: 'hello@emerald-vault.vn',
  contact_phone: '0901 234 567',
  contact_zalo: '0901234567',
  address: '12 Nguyen Hue, District 1, HCMC',
  footer_tagline:
    'Trang sức si Nhật vintage — tuyển chọn thủ công, đã qua thẩm định chất lượng.',
  social_instagram: 'https://instagram.com',
  social_facebook: 'https://facebook.com',
  social_tiktok: 'https://tiktok.com',
  announcement_messages: [
    'Miễn phí vận chuyển cho đơn từ 500k',
    'Giữ hàng 10 phút — không ai cướp được món đồ bạn thích',
    'Đồ si đã qua thẩm định bởi chuyên gia',
  ],
};

export const DEFAULT_BANNERS: HomeBanner[] = [
  {
    id: 'default-main',
    slot_key: 'main',
    title: 'Dây Chuyền & Pendants',
    subtitle: 'Di sản từ các triều đại cổ',
    image_url: '/images/home/collection-main-465cec.png',
    link_url: '/san-pham?category=DAY_CHUYEN',
    display_order: 1,
    is_active: true,
  },
  {
    id: 'default-top',
    slot_key: 'top',
    title: 'Nhẫn Siêu Cấp',
    subtitle: 'TIER SSS ONLY',
    image_url: '/images/home/collection-rings-5298d6.png',
    link_url: '/san-pham?tier=SSS',
    display_order: 2,
    is_active: true,
  },
  {
    id: 'default-bottom-left',
    slot_key: 'bottom_left',
    title: 'Bông Tai',
    image_url: '/images/home/collection-bong-tai-759e1e.png',
    link_url: '/san-pham?category=BONG_TAI',
    display_order: 3,
    is_active: true,
  },
  {
    id: 'default-bottom-right',
    slot_key: 'bottom_right',
    title: 'Vòng Tay',
    image_url: '/images/home/collection-vong-tay-318ebe.png',
    link_url: '/san-pham?category=VONG_TAY',
    display_order: 4,
    is_active: true,
  },
];

/**
 * Get banners as a map keyed by slot_key, with fallback to defaults.
 * Safe for client-side use.
 */
export function bannersBySlot(
  banners: HomeBanner[]
): Record<BannerSlotKey, HomeBanner | undefined> {
  const map = {} as Record<BannerSlotKey, HomeBanner | undefined>;
  for (const b of banners) {
    map[b.slot_key] = b;
  }
  // Fill missing slots with defaults
  for (const def of DEFAULT_BANNERS) {
    if (!map[def.slot_key]) {
      map[def.slot_key] = def;
    }
  }
  return map;
}