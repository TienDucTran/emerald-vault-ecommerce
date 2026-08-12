/**
 * Vietnam administrative locations — utility để fetch dữ liệu hành chính VN
 * từ API provinces.open-api.vn (open-source, miễn phí, không cần API key).
 *
 * Kiến trúc: client (browser) → /api/locations/* (Next.js route) → provinces.open-api.vn
 * API route cache in-memory + fallback nếu API ngoài lỗi.
 *
 * @see https://provinces.open-api.vn/
 */

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface Province {
  code: number;
  name: string;
  division_type: string;
  codename: string;
  phone_code?: number;
}

export interface District {
  code: number;
  name: string;
  division_type: string;
  codename: string;
  province_code: number;
}

export interface Ward {
  code: number;
  name: string;
  division_type: string;
  codename: string;
  district_code: number;
}

// ────────────────────────────────────────────────────────────────────────────
// In-memory cache (server-side only)
// ────────────────────────────────────────────────────────────────────────────

const provincesCache = new Map<string, Province[]>();
const districtsCache = new Map<number, District[]>();
const wardsCache = new Map<number, Ward[]>();

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const provincesCacheEntry = new Map<string, CacheEntry<Province[]>>();
const districtsCacheEntry = new Map<number, CacheEntry<District[]>>();
const wardsCacheEntry = new Map<number, CacheEntry<Ward[]>>();

// ────────────────────────────────────────────────────────────────────────────
// Fetch helpers (server-side)
// ────────────────────────────────────────────────────────────────────────────

const API_BASE = 'https://provinces.open-api.vn/api';
const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 }, // Next.js cache 24h
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch all 63 provinces.
 */
export async function fetchProvinces(): Promise<Province[]> {
  const cached = provincesCacheEntry.get('all');
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const res = await fetchWithTimeout(`${API_BASE}/p/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Province[];
    provincesCacheEntry.set('all', {
      data,
      expiresAt: Date.now() + CACHE_TTL,
    });
    return data;
  } catch (err) {
    // Return cached even if expired
    if (cached) return cached.data;
    console.error('[vietnam-locations] fetchProvinces failed:', err);
    throw err;
  }
}

/**
 * Fetch districts for a given province code.
 */
export async function fetchDistricts(provinceCode: number): Promise<District[]> {
  const cached = districtsCacheEntry.get(provinceCode);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const res = await fetchWithTimeout(`${API_BASE}/p/${provinceCode}?depth=2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { districts: District[] };
    const districts = data.districts ?? [];
    districtsCacheEntry.set(provinceCode, {
      data: districts,
      expiresAt: Date.now() + CACHE_TTL,
    });
    return districts;
  } catch (err) {
    if (cached) return cached.data;
    console.error('[vietnam-locations] fetchDistricts failed:', err);
    throw err;
  }
}

/**
 * Fetch wards for a given district code.
 */
export async function fetchWards(districtCode: number): Promise<Ward[]> {
  const cached = wardsCacheEntry.get(districtCode);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const res = await fetchWithTimeout(`${API_BASE}/d/${districtCode}?depth=2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { wards: Ward[] };
    const wards = data.wards ?? [];
    wardsCacheEntry.set(districtCode, {
      data: wards,
      expiresAt: Date.now() + CACHE_TTL,
    });
    return wards;
  } catch (err) {
    if (cached) return cached.data;
    console.error('[vietnam-locations] fetchWards failed:', err);
    throw err;
  }
}

/**
 * Fetch full province tree (province → districts → wards) in one request.
 * Dùng cho initial load khi edit address đã có province/district/ward name.
 */
export async function fetchProvinceTree(
  provinceCode: number
): Promise<{ province: Province; districts: District[]; wardsByDistrict: Map<number, Ward[]> }> {
  const res = await fetchWithTimeout(`${API_BASE}/p/${provinceCode}?depth=3`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as Province & { districts: (District & { wards: Ward[] })[] };
  const wardsByDistrict = new Map<number, Ward[]>();
  for (const d of data.districts ?? []) {
    wardsByDistrict.set(d.code, d.wards ?? []);
  }
  const { districts: rawDistricts, ...provinceFields } = data;
  const districts: District[] = (rawDistricts ?? []).map(({ wards: _w, ...d }) => d);
  return {
    province: provinceFields as Province,
    districts,
    wardsByDistrict,
  };
}

/**
 * Normalize province name — strip prefix "Thành phố " / "Tỉnh " for display.
 * API trả về "Thành phố Hà Nội", "Tỉnh Bình Dương" — hiển thị chỉ cần "Hà Nội", "Bình Dương".
 */
export function stripDivisionPrefix(name: string): string {
  return name.replace(/^(Thành phố|Tỉnh|TP\.)\s+/i, '').trim();
}

/**
 * Normalize district name — strip prefix "Quận " / "Huyện " / "Thành phố " / "Thị xã ".
 */
export function stripDistrictPrefix(name: string): string {
  return name
    .replace(/^(Quận|Huyện|Thành phố|Thị xã|TP\.)\s+/i, '')
    .trim();
}

/**
 * Normalize ward name — strip prefix "Phường " / "Xã " / "Thị trấn ".
 */
export function stripWardPrefix(name: string): string {
  return name
    .replace(/^(Phường|Xã|Thị trấn)\s+/i, '')
    .trim();
}