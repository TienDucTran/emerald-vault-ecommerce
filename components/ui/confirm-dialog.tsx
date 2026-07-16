'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Modal } from './modal';
import {
  useConfirmDialogStore,
  type ConfirmOptions,
  type ConfirmIcon,
  type ConfirmVariant,
} from '@/lib/modal/confirm-store';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  Info as InfoIcon,
  Loader2,
  X,
} from 'lucide-react';

type IconComp = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

const ICONS: Record<ConfirmIcon, IconComp> = {
  warning: AlertTriangle,
  danger: AlertCircle,
  info: InfoIcon,
  none: null as unknown as IconComp,
};

export function ConfirmDialog(): React.JSX.Element | null {
  const open = useConfirmDialogStore((s) => s.open);
  const options = useConfirmDialogStore((s) => s.options);
  const close = useConfirmDialogStore((s) => s.close);

  // Khoá nút khi đang xử lý để tránh double-click gọi close() hai lần
  const [resolving, setResolving] = useState<boolean>(false);

  useEffect(() => {
    if (!open) setResolving(false);
  }, [open]);

  if (!options) return null;

  const variant: ConfirmVariant = options.variant ?? 'default';
  const confirmText = options.confirmText ?? 'Xác nhận';
  const cancelText = options.cancelText ?? 'Huỷ';
  const icon: ConfirmIcon = options.icon ?? 'warning';
  const isDanger = variant === 'danger';
  const Icon = ICONS[icon];

  const handleCancel = () => {
    if (resolving) return;
    setResolving(true);
    close(false);
  };
  const handleConfirm = () => {
    if (resolving) return;
    setResolving(true);
    close(true);
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={options.title}
      description={options.description}
      size="md"
      variant={variant}
      showCloseButton={!resolving}
      closeOnOverlayClick={!resolving}
      closeOnEsc={!resolving}
      footer={
        <>
          <button
            type="button"
            onClick={handleCancel}
            disabled={resolving}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded',
              'text-sm font-medium uppercase tracking-wider',
              'border border-gold/30 text-text-base bg-transparent',
              'hover:border-gold/60 hover:text-gold',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <X className="h-4 w-4" aria-hidden />
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={resolving}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded',
              'text-sm font-medium uppercase tracking-wider',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2',
              'disabled:opacity-70 disabled:cursor-not-allowed',
              isDanger
                ? 'bg-error/90 hover:bg-error text-white focus-visible:ring-error/60'
                : 'bg-gold/90 hover:bg-gold text-[#0D1117] focus-visible:ring-gold/60'
            )}
          >
            {resolving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : icon !== 'none' ? (
              <Icon className="h-4 w-4" aria-hidden />
            ) : null}
            {confirmText}
          </button>
        </>
      }
    >
      {icon !== 'none' ? (
        <div className="mb-3 flex items-center gap-2">
          <Icon
            className={cn(
              'h-5 w-5 shrink-0',
              isDanger ? 'text-error' : 'text-gold'
            )}
            aria-hidden
          />
        </div>
      ) : null}
      {options.description != null ? (
        typeof options.description === 'string' ? (
          <p className="text-sm text-text-muted leading-relaxed">
            {options.description}
          </p>
        ) : (
          options.description
        )
      ) : null}
    </Modal>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  return (options: ConfirmOptions) =>
    useConfirmDialogStore.getState().show(options);
}
