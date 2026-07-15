'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore, type Toast, type ToastVariant } from '@/lib/toast/toast-store';

const variantStyles: Record<
  ToastVariant,
  { border: string; icon: string; iconColor: string }
> = {
  info: {
    border: 'border-gold/30',
    icon: Info,
    iconColor: 'text-gold',
  },
  success: {
    border: 'border-success/40',
    icon: CheckCircle2,
    iconColor: 'text-success',
  },
  error: {
    border: 'border-error/40',
    icon: XCircle,
    iconColor: 'text-error',
  },
  warning: {
    border: 'border-gold/40',
    icon: AlertTriangle,
    iconColor: 'text-gold',
  },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast.durationMs <= 0) return;
    timerRef.current = setTimeout(() => {
      dismiss(toast.id);
    }, toast.durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.durationMs, dismiss]);

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dismiss(toast.id);
  };

  const handleAction = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      toast.action?.onClick();
    } finally {
      dismiss(toast.id);
    }
  };

  const style = variantStyles[toast.variant];
  const Icon = style.icon;

  return (
    <div
      role="status"
      data-variant={toast.variant}
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-md border bg-surface/95 backdrop-blur-md',
        'shadow-lg shadow-black/40 p-3.5 flex items-start gap-3',
        'transition-all duration-200',
        style.border
      )}
    >
      <Icon
        className={cn('h-5 w-5 shrink-0 mt-0.5', style.iconColor)}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-base">{toast.message}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs text-text-muted">{toast.description}</p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={handleAction}
            className="mt-2 inline-flex text-xs font-semibold uppercase tracking-wider text-gold hover:text-gold-champagne transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Đóng thông báo"
        className="shrink-0 text-text-muted/60 hover:text-text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        'fixed top-20 z-[100] flex flex-col gap-2 pointer-events-none',
        'left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm'
      )}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}
