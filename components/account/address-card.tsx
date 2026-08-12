'use client';

import { useState } from 'react';
import { Loader2, MapPin, Pencil, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Address } from '@/lib/types/account';

export interface AddressCardProps {
  address: Address;
  onEdit?: (address: Address) => void;
  onDelete?: (address: Address) => void;
  onSetDefault?: (address: Address) => void;
  isLoading?: boolean;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isLoading,
}: AddressCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      onDelete?.(address);
      setConfirmingDelete(false);
      return;
    }
    setConfirmingDelete(true);
    window.setTimeout(() => setConfirmingDelete(false), 3000);
  };

  const isDefault = address.is_default;

  return (
    <div
      className={cn(
        'group relative rounded-lg border p-8 shadow-lg transition-transform duration-300 hover:-translate-y-1',
        isDefault
          ? 'border-gold/20 bg-surface-emerald'
          : 'border-gold/20 bg-background shadow-md'
      )}
      aria-busy={isLoading}
    >
      {/* Header row: label + default badge */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-4">
          <h3 className="font-heading text-xl font-semibold text-text-base">
            {address.label || 'Địa chỉ'}
          </h3>
          {isDefault ? (
            <span className="rounded-sm border border-gold/30 bg-gold/10 px-2 py-1 font-heading text-[10px] tracking-[0.15em] text-gold">
              MẶC ĐỊNH
            </span>
          ) : null}
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
        ) : null}
      </div>

      {/* Recipient info: name | phone */}
      <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-gold/10 pb-4 sm:border-none sm:pb-0">
        <p className="font-sans text-base font-semibold text-text-base">
          {address.recipient_name}
        </p>
        <span className="text-text-muted/40">|</span>
        <p className="font-mono text-lg text-text-muted">
          {address.recipient_phone}
        </p>
      </div>

      {/* Address line with icon */}
      <div className="mb-8 flex items-start gap-3">
        <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold/60" />
        <p className="font-sans leading-relaxed text-text-muted">
          {address.address_line}
          {address.ward ? <br /> : null}
          {address.ward ? `${address.ward}, ${address.district}, ${address.province}` : `${address.district ? `${address.district}, ` : ''}${address.province}`}
        </p>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-6 border-t border-gold/10 pt-4">
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(address)}
            disabled={isLoading}
            className="flex items-center gap-2 font-heading text-[10px] tracking-[0.15em] text-text-muted transition-colors hover:text-gold disabled:opacity-50"
          >
            <Pencil className="h-4 w-4 transition-transform group-hover:scale-110" />
            Sửa đổi
          </button>
        ) : null}

        {onDelete ? (
          confirmingDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isLoading}
                className="flex items-center gap-2 font-heading text-[10px] tracking-[0.15em] text-error transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Xác nhận xoá?
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isLoading}
                className="font-heading text-[10px] tracking-[0.15em] text-text-muted hover:text-text-base disabled:opacity-50"
              >
                Huỷ
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isLoading}
              className="flex items-center gap-2 font-heading text-[10px] tracking-[0.15em] text-error/80 transition-colors hover:text-error disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
              Xoá
            </button>
          )
        ) : null}

        {!isDefault && onSetDefault ? (
          <button
            type="button"
            onClick={() => onSetDefault(address)}
            disabled={isLoading}
            className="ml-auto flex items-center gap-2 font-heading text-[10px] tracking-[0.15em] text-text-muted transition-colors hover:text-gold disabled:opacity-50"
          >
            <Star className="h-4 w-4" />
            Thiết lập mặc định
          </button>
        ) : null}
      </div>

      {/* Decorative corners (default only) */}
      {isDefault ? (
        <>
          <div className="pointer-events-none absolute right-0 top-0 m-2 h-8 w-8 rounded-tr-lg border-r border-t border-gold/20" />
          <div className="pointer-events-none absolute bottom-0 left-0 m-2 h-8 w-8 rounded-bl-lg border-b border-l border-gold/20" />
        </>
      ) : null}
    </div>
  );
}