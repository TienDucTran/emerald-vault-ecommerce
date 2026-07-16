import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Canonical currency code cho toàn bộ app (GA4 events, hiển thị, …). */
export const CURRENCY = 'VND' as const;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format VND currency */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format price (shorter: 1.2tr, 850k) */
export function formatVNDShort(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}tr`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return `${amount}đ`;
}

/** Slugify string (Vietnamese-safe) */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Generate order code: EV-YYYYMMDD-XXXX */
export function generateOrderCode(seq: number): string {
  const date = new Date();
  const dateStr =
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  return `EV-${dateStr}-${seq.toString().padStart(4, '0')}`;
}

/** Generate UUID v4 (simple version) */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Material display name (Vietnamese) */
export const MATERIAL_LABELS: Record<string, string> = {
  BAC_925: 'Bạc 925',
  MA_VANG_18K: 'Mạ vàng 18K',
  MA_VANG_24K: 'Mạ vàng 24K',
  VANG_18K: 'Vàng 18K',
  KIM_CUONG: 'Kim cương',
};

/** Category display name */
export const CATEGORY_LABELS: Record<string, string> = {
  NHAN: 'Nhẫn',
  DAY_CHUYEN: 'Dây chuyền',
  BONG_TAI: 'Bông tai',
  VONG_TAY: 'Vòng tay',
  MAT_DAY: 'Mặt dây',
};

/** Tier display name */
export const TIER_LABELS: Record<string, string> = {
  SSS: 'Mới nguyên seal',
  SS: 'Trên 95%',
  S: 'Trên 90%',
};

export const TIER_DESCRIPTIONS: Record<string, string> = {
  SSS: 'Hiếm có, còn nguyên tag và hộp. Sưu tầm cao cấp.',
  SS: 'Phổ biến nhất, tình trạng gần như hoàn hảo.',
  S: 'Phù hợp đeo hằng ngày hoặc làm quà tặng.',
};
