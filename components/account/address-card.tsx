'use client';

import { useState } from 'react';
import { Loader2, MapPin, Pencil, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Address } from '@/lib/types/account';

export interface AddressCardProps {
  address: Address;
  onEdit?: (address: Address) => void;
  onDelete?: (address: Address) => void;
  onSetDefault?: (address: Address) => void;
  isLoading?: boolean;
}

const cardClass = cn(
  'rounded-md border border-gold/20 bg-surface-emerald p-4',
  'flex flex-col gap-4'
);

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

  return (
    <div className={cardClass} aria-busy={isLoading}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-lg font-bold text-text-base">
            {address.label || 'Địa chỉ'}
          </span>
          {address.is_default ? (
            <Badge variant="gold">
              <Star className="mr-1 h-3 w-3 fill-current" />
              Mặc định
            </Badge>
          ) : null}
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
        ) : null}
      </div>

      <div className="flex items-start gap-2 text-sm text-text-base">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <div className="flex flex-col">
          <span>
            <span className="font-medium">{address.recipient_name}</span>
            <span className="mx-2 text-text-muted">·</span>
            <span className="text-text-muted">{address.recipient_phone}</span>
          </span>
          <span className="mt-1 text-text-muted">
            {address.address_line}
            {address.ward ? `, ${address.ward}` : ''}, {address.district},{' '}
            {address.province}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gold/10 pt-3">
        {!address.is_default && onSetDefault ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSetDefault(address)}
            disabled={isLoading}
          >
            <Star className="h-4 w-4" />
            Đặt làm mặc định
          </Button>
        ) : null}
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(address)}
            disabled={isLoading}
          >
            <Pencil className="h-4 w-4" />
            Sửa
          </Button>
        ) : null}
        {onDelete ? (
          confirmingDelete ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isLoading}
                className="bg-error text-white hover:bg-error/90"
              >
                <Trash2 className="h-4 w-4" />
                Xác nhận xoá?
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={isLoading}
              >
                Huỷ
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isLoading}
              className="text-error hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="h-4 w-4" />
              Xoá
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
