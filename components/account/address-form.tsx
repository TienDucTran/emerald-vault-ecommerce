'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Address, AddressInsert, AddressUpdate } from '@/lib/types/account';

export type AddressFormValues = {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address_line: string;
  province: string;
  district: string;
  ward: string;
  is_default: boolean;
};

export interface AddressFormProps {
  initial?: Partial<Address>;
  onSubmit: (data: AddressFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

const inputClass = cn(
  'w-full rounded-md border bg-background px-4 py-3 text-base text-text-base',
  'border-gold/30 placeholder:text-text-disabled/50',
  'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/10',
  'transition-colors'
);

const labelClass =
  'font-heading text-[10px] font-normal uppercase tracking-[0.05em] text-[#99907C]';

const PHONE_PATTERN = '^[0-9+\\s-]{8,20}$';

const EMPTY: AddressFormValues = {
  label: '',
  recipient_name: '',
  recipient_phone: '',
  address_line: '',
  province: '',
  district: '',
  ward: '',
  is_default: false,
};

function fromInitial(initial?: Partial<Address>): AddressFormValues {
  if (!initial) return { ...EMPTY };
  return {
    label: initial.label ?? '',
    recipient_name: initial.recipient_name ?? '',
    recipient_phone: initial.recipient_phone ?? '',
    address_line: initial.address_line ?? '',
    province: initial.province ?? '',
    district: initial.district ?? '',
    ward: initial.ward ?? '',
    is_default: initial.is_default ?? false,
  };
}

export type AddressFormSubmit =
  | AddressInsert
  | AddressUpdate;

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  isLoading,
}: AddressFormProps) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState<AddressFormValues>(() => fromInitial(initial));
  const [error, setError] = useState<string | null>(null);

  const handleChange = <K extends keyof AddressFormValues>(
    field: K,
    value: AddressFormValues[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại.'
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-gold/20 bg-surface-emerald p-6"
      aria-busy={isLoading}
    >
      <h3 className="font-heading text-lg font-bold text-text-base">
        {isEdit ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
      </h3>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="label" className={labelClass}>
            NHÃN (tuỳ chọn)
          </label>
          <input
            id="label"
            type="text"
            value={form.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Nhà riêng"
            maxLength={40}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="recipient_name" className={labelClass}>
            NGƯỜI NHẬN *
          </label>
          <input
            id="recipient_name"
            type="text"
            required
            value={form.recipient_name}
            onChange={(e) => handleChange('recipient_name', e.target.value)}
            placeholder="Nguyễn Văn A"
            maxLength={120}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="recipient_phone" className={labelClass}>
            SỐ ĐIỆN THOẠI *
          </label>
          <input
            id="recipient_phone"
            type="tel"
            required
            pattern={PHONE_PATTERN}
            value={form.recipient_phone}
            onChange={(e) => handleChange('recipient_phone', e.target.value)}
            placeholder="0901 234 567"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor="address_line" className={labelClass}>
            ĐỊA CHỈ *
          </label>
          <input
            id="address_line"
            type="text"
            required
            value={form.address_line}
            onChange={(e) => handleChange('address_line', e.target.value)}
            placeholder="Số nhà, ngõ, đường..."
            maxLength={500}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="province" className={labelClass}>
            TỈNH / THÀNH *
          </label>
          <input
            id="province"
            type="text"
            required
            value={form.province}
            onChange={(e) => handleChange('province', e.target.value)}
            placeholder="Hà Nội"
            maxLength={80}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="district" className={labelClass}>
            QUẬN / HUYỆN *
          </label>
          <input
            id="district"
            type="text"
            required
            value={form.district}
            onChange={(e) => handleChange('district', e.target.value)}
            placeholder="Quận 1"
            maxLength={80}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ward" className={labelClass}>
            PHƯỜNG / XÃ
          </label>
          <input
            id="ward"
            type="text"
            value={form.ward}
            onChange={(e) => handleChange('ward', e.target.value)}
            placeholder="Phường Bến Nghé"
            maxLength={80}
            className={inputClass}
          />
        </div>
      </div>

      {!isEdit ? (
        <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-md border border-gold/10 bg-background px-4 py-3">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => handleChange('is_default', e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-gold"
          />
          <span className="text-sm text-text-base">
            Đặt làm địa chỉ mặc định
          </span>
        </label>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-error/30 bg-error/10 px-4 py-2 text-sm text-error"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onCancel}
          disabled={isLoading}
        >
          Huỷ
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {submitLabel ?? (isEdit ? 'Lưu thay đổi' : 'Thêm địa chỉ')}
        </Button>
      </div>
    </form>
  );
}
