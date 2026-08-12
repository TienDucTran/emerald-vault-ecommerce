/**
 * Freeship zone detection — dựa trên province + district
 * 3 zones: INNER_HCMC, OUTER_HCMC, OTHER_PROVINCE
 */

import type { ShippingZone, FreeshipConfig } from './types';

/** Danh sách quận nội thành HCMC (default, có thể override qua site_settings) */
export const DEFAULT_INNER_DISTRICTS = [
  'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6',
  'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12',
  'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú',
  'Bình Tân', 'Thủ Đức',
];

/**
 * Strip Vietnamese diacritics — "Hồ Chí Minh" → "Ho Chi Minh",
 * "Thành phố Hồ Chí Minh" → "Thanh pho Ho Chi Minh".
 * Dùng cho so sánh province/district tên không phân biệt dấu.
 */
function stripDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritical marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Normalize province/district name: lowercase + strip diacritics + remove
 * spaces/dots → "Thành phố Hồ Chí Minh" → "thanhphohochiminh"
 */
function normalizeForCompare(str: string): string {
  return stripDiacritics(str).toLowerCase().replace(/[\s.]/g, '');
}

/**
 * Detect shipping zone từ province + district
 * @param province - tên tỉnh/thành (vd: "Hồ Chí Minh", "TP. Hồ Chí Minh", "HCMC")
 * @param district - tên quận (vd: "Quận 1", "Củ Chi")
 * @param innerDistricts - optional override từ site_settings
 */
export function detectShippingZone(
  province: string | null | undefined,
  district: string | null | undefined,
  innerDistricts: string[] = DEFAULT_INNER_DISTRICTS
): ShippingZone {
  if (!province) return 'OTHER_PROVINCE';

  const normalizedProvince = normalizeForCompare(province);

  // Check HCMC — match nhiều biến thể:
  //   "Hồ Chí Minh" → "hochiminh"
  //   "Thành phố Hồ Chí Minh" → "thanhphohochiminh"
  //   "TP. Hồ Chí Minh" → "tphochiminh"
  //   "HCM", "HCMC", "Saigon" — viết tắt tiếng Anh
  const isHCMC =
    normalizedProvince.includes('hochiminh') ||
    normalizedProvince.includes('hcm') ||
    normalizedProvince === 'saigon';

  if (!isHCMC) return 'OTHER_PROVINCE';

  // HCMC → check inner vs outer
  if (!district) return 'OUTER_HCMC';

  // Normalize district: strip diacritics + lowercase + remove prefix
  const normalizedDistrict = stripDiacritics(district)
    .toLowerCase()
    .replace(/^(quan|huyen|thanh pho|tp\.?)\s*/i, '')
    .trim();

  // Check if district is in inner list
  const isInInnerList = innerDistricts.some((d) => {
    const normalized = stripDiacritics(d)
      .toLowerCase()
      .replace(/^(quan|huyen|thanh pho|tp\.?)\s*/i, '')
      .trim();
    return normalized === normalizedDistrict;
  });

  return isInInnerList ? 'INNER_HCMC' : 'OUTER_HCMC';
}

/**
 * Default freeship config.
 * Value thresholds = 0 (disabled) — freeship chỉ dựa trên item count.
 * Lý do: sản phẩm jewelry có giá từ 980k+ VND, nếu default value threshold
 * thấp (350k-700k) thì 1 món bất kỳ đã pass → luôn freeship.
 * Admin có thể override qua site_settings (set value > 0 để bật điều kiện giá).
 */
export const DEFAULT_FREESHIP_CONFIG: FreeshipConfig = {
  inner_hcm_count: 4,
  inner_hcm_value: 0,
  outer_hcm_count: 6,
  outer_hcm_value: 0,
  province_count: 8,
  province_value: 0,
  ship_fee_inner_hcm: 30000,
  ship_fee_outer_hcm: 40000,
  ship_fee_province: 50000,
};

/** Parse freeship config từ site_settings map */
export function parseFreeshipConfig(settings: Record<string, string>): FreeshipConfig {
  return {
    inner_hcm_count: parseInt(settings['freeship_inner_hcm_count'] ?? '4', 10),
    inner_hcm_value: parseInt(settings['freeship_inner_hcm_value'] ?? '0', 10),
    outer_hcm_count: parseInt(settings['freeship_outer_hcm_count'] ?? '6', 10),
    outer_hcm_value: parseInt(settings['freeship_outer_hcm_value'] ?? '0', 10),
    province_count: parseInt(settings['freeship_province_count'] ?? '8', 10),
    province_value: parseInt(settings['freeship_province_value'] ?? '0', 10),
    ship_fee_inner_hcm: parseInt(settings['ship_fee_inner_hcm'] ?? '30000', 10),
    ship_fee_outer_hcm: parseInt(settings['ship_fee_outer_hcm'] ?? '40000', 10),
    ship_fee_province: parseInt(settings['ship_fee_province'] ?? '50000', 10),
  };
}

/** Parse inner districts từ site_settings (JSON array string) */
export function parseInnerDistricts(settings: Record<string, string>): string[] {
  const raw = settings['hcmc_inner_districts'];
  if (!raw) return DEFAULT_INNER_DISTRICTS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_INNER_DISTRICTS;
}

/** Get zone label */
export function getZoneLabel(zone: ShippingZone): string {
  switch (zone) {
    case 'INNER_HCMC':
      return 'Nội thành HCMC';
    case 'OUTER_HCMC':
      return 'Ngoại thành HCMC';
    case 'OTHER_PROVINCE':
      return 'Tỉnh khác';
  }
}

/**
 * Check freeship eligibility
 * @returns is_free + ship_fee + remaining
 */
export function checkFreeship(
  zone: ShippingZone,
  itemCount: number,
  orderValue: number,
  config: FreeshipConfig = DEFAULT_FREESHIP_CONFIG
): {
  is_free: boolean;
  ship_fee: number;
  item_count_required: number;
  value_required: number;
  remaining_items: number;
  remaining_value: number;
} {
  let countRequired: number;
  let valueRequired: number;
  let shipFee: number;

  switch (zone) {
    case 'INNER_HCMC':
      countRequired = config.inner_hcm_count;
      valueRequired = config.inner_hcm_value;
      shipFee = config.ship_fee_inner_hcm;
      break;
    case 'OUTER_HCMC':
      countRequired = config.outer_hcm_count;
      valueRequired = config.outer_hcm_value;
      shipFee = config.ship_fee_outer_hcm;
      break;
    case 'OTHER_PROVINCE':
      countRequired = config.province_count;
      valueRequired = config.province_value;
      shipFee = config.ship_fee_province;
      break;
  }

  // Freeship khi đạt item count HOẶC order value.
  // Nhưng nếu admin set threshold = 0 → coi như "disabled" (không dùng điều kiện đó).
  // Tránh trường hợp sản phẩm giá cao (vd 1M+ VND) luôn pass value threshold thấp
  // (vd 350k) → luôn freeship dù chỉ mua 1 món.
  const countMet = countRequired > 0 && itemCount >= countRequired;
  const valueMet = valueRequired > 0 && orderValue >= valueRequired;
  const isFree = countMet || valueMet;

  return {
    is_free: isFree,
    ship_fee: isFree ? 0 : shipFee,
    item_count_required: countRequired,
    value_required: valueRequired,
    remaining_items: Math.max(0, countRequired - itemCount),
    remaining_value: Math.max(0, valueRequired - orderValue),
  };
}