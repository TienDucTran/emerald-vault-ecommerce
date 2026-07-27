'use client';

/**
 * AddressPicker — dùng trong checkout để cho user chọn địa chỉ giao hàng
 * từ sổ địa chỉ đã lưu (Account → Sổ địa chỉ) thay vì phải gõ tay.
 *
 * 3 modes:
 *  - 'select'  (mặc định): danh sách radio + nút "Dùng địa chỉ khác" mở inline form
 *  - 'manual': user không có address / chọn manual → render form inline
 *  - 'compact': hiển thị dropdown <select> gọn cho mobile + auto-fill
 *
 * Khi user pick 1 address (saved) hoặc submit form mới → onChange callback
 * đẩy các field (name, phone, address, province, district, ward) lên parent.
 *
 * Sau khi user gõ tay trong inline form có thể tick "Lưu vào sổ địa chỉ" để
 * POST /api/account/addresses (tái sử dụng cho lần sau).
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, MapPin, ChevronDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressForm, type AddressFormValues } from '@/components/account/address-form';
import { cn } from '@/lib/utils';
import type { Address } from '@/lib/types/account';

export interface PickedAddress {
  recipient_name: string;
  recipient_phone: string;
  address_line: string;
  province: string;
  district: string;
  ward: string;
  /** ID của row addresses trong DB; null nếu user nhập tay không lưu. */
  addressId: string | null;
}

export interface AddressPickerProps {
  /** Default value cho form (thường là tên/email từ profile). */
  defaultName?: string;
  defaultPhone?: string;
  /** Callback khi user pick address (saved) hoặc type manual. */
  onChange: (picked: PickedAddress) => void;
}

type Mode = 'select' | 'manual';

interface State {
  mode: Mode;
  status: 'loading' | 'ready' | 'error';
  addresses: Address[];
  selectedId: string | null;
  /** Khi mode='manual', lưu value form để giữ qua re-render. */
  manualDraft: AddressFormValues | null;
  savingNew: boolean;
  saveError: string | null;
}

const EMPTY_FORM: AddressFormValues = {
  label: '',
  recipient_name: '',
  recipient_phone: '',
  address_line: '',
  province: '',
  district: '',
  ward: '',
  is_default: false,
};

export function AddressPicker({
  defaultName = '',
  defaultPhone = '',
  onChange,
}: AddressPickerProps) {
  const [state, setState] = useState<State>({
    mode: 'select',
    status: 'loading',
    addresses: [],
    selectedId: null,
    manualDraft: null,
    savingNew: false,
    saveError: null,
  });

  // ---- load saved addresses ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/addresses', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data: Address[] };
        if (cancelled) return;
        const list = json.data ?? [];
        const def = list.find((a) => a.is_default) ?? list[0] ?? null;
        setState((s) => ({
          ...s,
          status: 'ready',
          addresses: list,
          selectedId: def?.id ?? null,
        }));
        // Auto-emit default address
        if (def) {
          onChange(addressToPick(def));
        }
      } catch (err) {
        console.error('[AddressPicker] load failed:', err);
        if (!cancelled) {
          setState((s) => ({ ...s, status: 'error' }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- handle select saved ----
  const handleSelectSaved = useCallback(
    (addr: Address) => {
      setState((s) => ({ ...s, selectedId: addr.id, mode: 'select' }));
      onChange(addressToPick(addr));
    },
    [onChange]
  );

  // ---- enter manual mode ----
  const enterManual = useCallback(() => {
    const seed: AddressFormValues = {
      ...EMPTY_FORM,
      recipient_name: defaultName,
      recipient_phone: defaultPhone,
      // Nếu có 1 address mặc định, copy address fields làm gợi ý
      address_line: '',
      province: '',
      district: '',
      ward: '',
    };
    setState((s) => ({
      ...s,
      mode: 'manual',
      selectedId: null,
      manualDraft: seed,
      saveError: null,
    }));
    // Emit empty pick để parent biết user đang nhập tay
    onChange({
      recipient_name: defaultName,
      recipient_phone: defaultPhone,
      address_line: '',
      province: '',
      district: '',
      ward: '',
      addressId: null,
    });
  }, [defaultName, defaultPhone, onChange]);

  // ---- save new + select ----
  const handleSaveNew = useCallback(
    async (values: AddressFormValues) => {
      setState((s) => ({ ...s, savingNew: true, saveError: null }));
      try {
        const res = await fetch('/api/account/addresses', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(j?.message ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { data: Address };
        const created = json.data;
        setState((s) => ({
          ...s,
          mode: 'select',
          addresses: [...s.addresses, created],
          selectedId: created.id,
          savingNew: false,
          manualDraft: null,
        }));
        onChange(addressToPick(created));
      } catch (err) {
        setState((s) => ({
          ...s,
          savingNew: false,
          saveError: err instanceof Error ? err.message : 'Không thể lưu địa chỉ.',
        }));
      }
    },
    [onChange]
  );

  // ---- cancel manual: revert to default ----
  const handleCancelManual = useCallback(() => {
    setState((s) => {
      // Quay lại select mode; nếu có address thì chọn default
      const def = s.addresses.find((a) => a.is_default) ?? s.addresses[0] ?? null;
      if (def) {
        onChange(addressToPick(def));
        return { ...s, mode: 'select', selectedId: def.id, manualDraft: null };
      }
      return { ...s, mode: 'select', manualDraft: null };
    });
  }, [onChange]);

  // ---- manual form field change (emit live) ----
  const updateManual = useCallback(
    (next: AddressFormValues) => {
      setState((s) => ({ ...s, manualDraft: next }));
      onChange({
        recipient_name: next.recipient_name,
        recipient_phone: next.recipient_phone,
        address_line: next.address_line,
        province: next.province,
        district: next.district,
        ward: next.ward,
        addressId: null,
      });
    },
    [onChange]
  );

  // ---- render ----
  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-gold/20 bg-surface-emerald/40 p-4 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-gold" />
        Đang tải sổ địa chỉ…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
        <span>Không thể tải sổ địa chỉ.</span>
        <button
          type="button"
          onClick={enterManual}
          className="text-left text-xs text-gold underline-offset-2 hover:underline"
        >
          Nhập địa chỉ thủ công →
        </button>
      </div>
    );
  }

  // No saved addresses → straight to manual
  if (state.addresses.length === 0 && state.mode === 'select') {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-gold/20 bg-surface-emerald/40 p-5">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-text-base">
              Bạn chưa có địa chỉ nào trong sổ.
            </p>
            <p className="text-xs text-text-muted">
              Nhập địa chỉ bên dưới hoặc{' '}
              <a
                href="/tai-khoan/dia-chi"
                className="text-gold underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                tạo sổ địa chỉ
              </a>{' '}
              để thanh toán nhanh hơn lần sau.
            </p>
          </div>
        </div>
        <AddressForm
          initial={{
            ...EMPTY_FORM,
            recipient_name: defaultName,
            recipient_phone: defaultPhone,
          }}
          onSubmit={handleSaveNew}
          onCancel={() => {
            /* empty list → không có gì để cancel */
          }}
          onChange={updateManual}
          isLoading={state.savingNew}
        />
        {state.saveError ? (
          <p
            role="alert"
            className="rounded-md border border-error/30 bg-error/10 px-4 py-2 text-sm text-error"
          >
            {state.saveError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Saved addresses list (radio cards) */}
      {state.mode === 'select' ? (
        <div className="flex flex-col gap-2">
          <SavedAddressList
            addresses={state.addresses}
            selectedId={state.selectedId}
            onSelect={handleSelectSaved}
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enterManual}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Dùng địa chỉ khác
            </Button>
            <a
              href="/tai-khoan/dia-chi"
              className="text-xs text-text-muted underline-offset-2 hover:text-gold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Quản lý sổ địa chỉ →
            </a>
          </div>
        </div>
      ) : null}

      {/* Manual entry (inline form) */}
      {state.mode === 'manual' ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-xs text-text-muted">
            <ChevronDown className="h-3.5 w-3.5" />
            Nhập địa chỉ mới — sẽ được lưu vào sổ để dùng lại lần sau.
          </p>
          <AddressForm
            initial={state.manualDraft ?? EMPTY_FORM}
            onSubmit={handleSaveNew}
            onCancel={handleCancelManual}
            onChange={updateManual}
            isLoading={state.savingNew}
            submitLabel="Lưu & dùng địa chỉ này"
          />
          {state.saveError ? (
            <p
              role="alert"
              className="rounded-md border border-error/30 bg-error/10 px-4 py-2 text-sm text-error"
            >
              {state.saveError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function addressToPick(a: Address): PickedAddress {
  return {
    recipient_name: a.recipient_name,
    recipient_phone: a.recipient_phone,
    address_line: a.address_line,
    province: a.province,
    district: a.district,
    ward: a.ward ?? '',
    addressId: a.id,
  };
}

function SavedAddressList({
  addresses,
  selectedId,
  onSelect,
}: {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (a: Address) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Địa chỉ giao hàng đã lưu" className="flex flex-col gap-2">
      {addresses.map((a) => {
        const selected = a.id === selectedId;
        const summary = [
          a.address_line,
          a.district,
          a.province,
          a.ward,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(a)}
            className={cn(
              'flex items-start gap-3 rounded-md border p-3 text-left transition-all',
              selected
                ? 'border-gold/60 bg-gold/10 ring-1 ring-gold/40'
                : 'border-gold/20 bg-background/20 hover:border-gold/40 hover:bg-gold/5'
            )}
          >
            <div
              className={cn(
                'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                selected ? 'border-gold' : 'border-gold/40'
              )}
              aria-hidden
            >
              {selected ? <span className="h-2 w-2 rounded-full bg-gold" /> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-text-base">
                  {a.recipient_name}
                </span>
                {a.label ? (
                  <span className="rounded-sm border border-gold/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gold/80">
                    {a.label}
                  </span>
                ) : null}
                {a.is_default ? (
                  <span className="flex items-center gap-1 rounded-sm bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Mặc định
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-text-muted">
                {a.recipient_phone} · {summary || '(chưa có địa chỉ chi tiết)'}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}