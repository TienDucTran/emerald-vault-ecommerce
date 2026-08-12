'use client';

/**
 * VietnamAddressFields — Tổ hợp 3 cascading LocationSelect (Tỉnh → Quận → Phường)
 * dùng cho form nhập địa chỉ. Tự động load districts/wards khi chọn cấp cha.
 *
 * Backward-compat:
 *  - Nếu initialProvinceCode/districtCode/wardCode = null, dùng name để tìm code.
 *  - DB chỉ lưu tên (string), không cần migration.
 *  - detectShippingZone() vẫn hoạt động vì dựa trên tên normalized.
 *
 * Props: value { province, district, ward } + onChange.
 * Parent (AddressForm) chỉ cần lưu provinceName/districtName/wardName string.
 */

import { useCallback } from 'react';
import { useVietnamLocations } from '@/hooks/use-vietnam-locations';
import { LocationSelect } from './location-select';

export interface VietnamAddressValue {
  /** Tên tỉnh/thành (lưu DB) */
  province: string;
  /** Tên quận/huyện (lưu DB) */
  district: string;
  /** Tên phường/xã (lưu DB) */
  ward: string;
}

export interface VietnamAddressFieldsProps {
  value: VietnamAddressValue;
  onChange: (value: VietnamAddressValue) => void;
  /** Province code ban đầu (nếu biết, vd: từ API) */
  initialProvinceCode?: number | null;
  /** District code ban đầu */
  initialDistrictCode?: number | null;
  /** Ward code ban đầu */
  initialWardCode?: number | null;
  /** Label class cho các field labels */
  labelClass?: string;
  /** Grid layout: false = stack 1 col, true = 3-col grid (default false) */
  grid?: boolean;
}

export function VietnamAddressFields({
  value,
  onChange,
  initialProvinceCode = null,
  initialDistrictCode = null,
  initialWardCode = null,
  labelClass = 'font-heading text-[10px] font-normal uppercase tracking-[0.05em] text-text-muted',
  grid = false,
}: VietnamAddressFieldsProps) {
  const loc = useVietnamLocations({
    initialProvinceCode,
    initialDistrictCode,
    initialWardCode,
    initialProvinceName: value.province,
    initialDistrictName: value.district,
    initialWardName: value.ward,
  });

  const handleProvinceChange = useCallback(
    (code: number | null) => {
      loc.selectProvince(code);
      const name = code
        ? loc.provinces.find((p) => p.code === code)?.name ?? ''
        : '';
      onChange({
        ...value,
        province: name,
        district: '',
        ward: '',
      });
    },
    [loc, value, onChange]
  );

  const handleDistrictChange = useCallback(
    (code: number | null) => {
      loc.selectDistrict(code);
      const name = code
        ? loc.districts.find((d) => d.code === code)?.name ?? ''
        : '';
      onChange({
        ...value,
        district: name,
        ward: '',
      });
    },
    [loc, value, onChange]
  );

  const handleWardChange = useCallback(
    (code: number | null) => {
      loc.selectWard(code);
      const name = code
        ? loc.wards.find((w) => w.code === code)?.name ?? ''
        : '';
      onChange({
        ...value,
        ward: name,
      });
    },
    [loc, value, onChange]
  );

  const containerClass = grid
    ? 'grid grid-cols-1 gap-4 md:grid-cols-3'
    : 'flex flex-col gap-4';

  return (
    <div className={containerClass}>
      {/* Tỉnh / Thành */}
      <div className="flex flex-col gap-2">
        <label htmlFor="province-select" className={labelClass}>
          TỈNH / THÀNH *
        </label>
        <LocationSelect
          id="province-select"
          items={loc.provinces}
          value={loc.provinceCode}
          onChange={handleProvinceChange}
          placeholder="Chọn tỉnh/thành"
          ariaLabel="Tỉnh thành"
          loading={loc.loadingProvinces}
          required
        />
      </div>

      {/* Quận / Huyện */}
      <div className="flex flex-col gap-2">
        <label htmlFor="district-select" className={labelClass}>
          QUẬN / HUYỆN *
        </label>
        <LocationSelect
          id="district-select"
          items={loc.districts}
          value={loc.districtCode}
          onChange={handleDistrictChange}
          placeholder="Chọn quận/huyện"
          ariaLabel="Quận huyện"
          loading={loc.loadingDistricts}
          disabled={!loc.provinceCode}
          required
        />
      </div>

      {/* Phường / Xã */}
      <div className="flex flex-col gap-2">
        <label htmlFor="ward-select" className={labelClass}>
          PHƯỜNG / XÃ
        </label>
        <LocationSelect
          id="ward-select"
          items={loc.wards}
          value={loc.wardCode}
          onChange={handleWardChange}
          placeholder="Chọn phường/xã"
          ariaLabel="Phường xã"
          loading={loc.loadingWards}
          disabled={!loc.districtCode}
        />
      </div>
    </div>
  );
}