'use client';

/**
 * useVietnamLocations — React hook quản lý cascading select cho địa chỉ hành chính VN.
 *
 * Fetch provinces → districts (theo provinceCode) → wards (theo districtCode).
 * Tự load districts/wards khi provinceCode/districtCode thay đổi.
 * Hỗ trợ backward-compat: nếu initial value là tên (không có code),
 * hook tự tìm code tương ứng trong danh sách.
 */

import { useCallback, useEffect, useState } from 'react';

export interface LocationItem {
  code: number;
  name: string;
  displayName: string;
  division_type: string;
}

interface UseVietnamLocationsOptions {
  /** Province code ban đầu (khi edit address) */
  initialProvinceCode?: number | null;
  /** District code ban đầu */
  initialDistrictCode?: number | null;
  /** Ward code ban đầu */
  initialWardCode?: number | null;
  /** Province name (fallback cho backward-compat) */
  initialProvinceName?: string;
  /** District name (fallback cho backward-compat) */
  initialDistrictName?: string;
  /** Ward name (fallback cho backward-compat) */
  initialWardName?: string;
}

interface UseVietnamLocationsReturn {
  provinces: LocationItem[];
  districts: LocationItem[];
  wards: LocationItem[];

  provinceCode: number | null;
  districtCode: number | null;
  wardCode: number | null;

  provinceName: string;
  districtName: string;
  wardName: string;

  loadingProvinces: boolean;
  loadingDistricts: boolean;
  loadingWards: boolean;

  /** Chọn tỉnh → reset district + ward */
  selectProvince: (code: number | null) => void;
  /** Chọn quận → reset ward */
  selectDistrict: (code: number | null) => void;
  /** Chọn phường */
  selectWard: (code: number | null) => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Fetch helpers (client-side, gọi internal API route)
// ────────────────────────────────────────────────────────────────────────────

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// In-memory cache cho provinces (load 1 lần / session)
let provincesPromise: Promise<LocationItem[]> | null = null;

function fetchProvinces(): Promise<LocationItem[]> {
  if (provincesPromise) return provincesPromise;
  provincesPromise = fetchJSON('/api/locations/provinces')
    .then((json: { data: LocationItem[] }) => json.data)
    .catch((err) => {
      console.error('[useVietnamLocations] fetchProvinces failed:', err);
      provincesPromise = null; // allow retry
      throw err;
    });
  return provincesPromise;
}

const districtsCache = new Map<number, Promise<LocationItem[]>>();

function fetchDistricts(provinceCode: number): Promise<LocationItem[]> {
  const cached = districtsCache.get(provinceCode);
  if (cached) return cached;
  const promise = fetchJSON(`/api/locations/districts?provinceCode=${provinceCode}`)
    .then((json: { data: LocationItem[] }) => json.data)
    .catch((err) => {
      districtsCache.delete(provinceCode);
      throw err;
    });
  districtsCache.set(provinceCode, promise);
  return promise;
}

const wardsCache = new Map<number, Promise<LocationItem[]>>();

function fetchWards(districtCode: number): Promise<LocationItem[]> {
  const cached = wardsCache.get(districtCode);
  if (cached) return cached;
  const promise = fetchJSON(`/api/locations/wards?districtCode=${districtCode}`)
    .then((json: { data: LocationItem[] }) => json.data)
    .catch((err) => {
      wardsCache.delete(districtCode);
      throw err;
    });
  wardsCache.set(districtCode, promise);
  return promise;
}

// ────────────────────────────────────────────────────────────────────────────
// Normalization helpers
// ────────────────────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(thành phố|tỉnh|tp\.?)\s+/i, '')
    .replace(/^(quận|huyện|thị xã|thành phố|tp\.?)\s+/i, '')
    .replace(/^(phường|xã|thị trấn)\s+/i, '')
    .replace(/[\s.]/g, '')
    .trim();
}

/**
 * Tìm item trong list khớp với tên (fuzzy: strip prefix + non-alphanumeric).
 */
function findByName(list: LocationItem[], name: string): LocationItem | null {
  if (!name) return null;
  const target = normalizeName(name);
  if (!target) return null;
  return (
    list.find((item) => normalizeName(item.name) === target) ??
    list.find((item) => normalizeName(item.displayName) === target) ?? null
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

export function useVietnamLocations(
  options: UseVietnamLocationsOptions = {}
): UseVietnamLocationsReturn {
  const {
    initialProvinceCode = null,
    initialDistrictCode = null,
    initialWardCode = null,
    initialProvinceName = '',
    initialDistrictName = '',
    initialWardName = '',
  } = options;

  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);

  const [provinceCode, setProvinceCode] = useState<number | null>(initialProvinceCode);
  const [districtCode, setDistrictCode] = useState<number | null>(initialDistrictCode);
  const [wardCode, setWardCode] = useState<number | null>(initialWardCode);

  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // ---- Load provinces on mount ----
  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    fetchProvinces()
      .then((data) => {
        if (cancelled) return;
        setProvinces(data);
        // Backward-compat: nếu chỉ có name không có code, tìm code
        if (!provinceCode && initialProvinceName) {
          const found = findByName(data, initialProvinceName);
          if (found) setProvinceCode(found.code);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Silent fail — form vẫn dùng text input fallback
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Load districts when provinceCode changes ----
  useEffect(() => {
    if (!provinceCode) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    fetchDistricts(provinceCode)
      .then((data) => {
        if (cancelled) return;
        setDistricts(data);
        // Backward-compat: nếu chỉ có name không có code
        if (!districtCode && initialDistrictName) {
          const found = findByName(data, initialDistrictName);
          if (found) setDistrictCode(found.code);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDistricts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceCode]);

  // ---- Load wards when districtCode changes ----
  useEffect(() => {
    if (!districtCode) {
      setWards([]);
      return;
    }
    let cancelled = false;
    setLoadingWards(true);
    fetchWards(districtCode)
      .then((data) => {
        if (cancelled) return;
        setWards(data);
        // Backward-compat: nếu chỉ có name không có code
        if (!wardCode && initialWardName) {
          const found = findByName(data, initialWardName);
          if (found) setWardCode(found.code);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setWards([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWards(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtCode]);

  // ---- Actions ----
  const selectProvince = useCallback((code: number | null) => {
    setProvinceCode(code);
    // Reset cascade
    setDistrictCode(null);
    setDistricts([]);
    setWardCode(null);
    setWards([]);
  }, []);

  const selectDistrict = useCallback((code: number | null) => {
    setDistrictCode(code);
    // Reset ward
    setWardCode(null);
    setWards([]);
  }, []);

  const selectWard = useCallback((code: number | null) => {
    setWardCode(code);
  }, []);

  // ---- Derived names (lấy từ item đã chọn) ----
  const provinceName =
    provinces.find((p) => p.code === provinceCode)?.name ?? initialProvinceName;
  const districtName =
    districts.find((d) => d.code === districtCode)?.name ?? initialDistrictName;
  const wardName = wards.find((w) => w.code === wardCode)?.name ?? initialWardName;

  return {
    provinces,
    districts,
    wards,
    provinceCode,
    districtCode,
    wardCode,
    provinceName,
    districtName,
    wardName,
    loadingProvinces,
    loadingDistricts,
    loadingWards,
    selectProvince,
    selectDistrict,
    selectWard,
  };
}