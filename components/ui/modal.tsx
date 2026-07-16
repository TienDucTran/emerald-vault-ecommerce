'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg';
export type ModalVariant = 'default' | 'danger';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  variant?: ModalVariant;
  className?: string;
}

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

const FOCUSABLE =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal(props: ModalProps): React.JSX.Element | null {
  const {
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEsc = true,
    showCloseButton = true,
    variant = 'default',
    className,
  } = props;

  // Giữ DOM một khoảng ngắn sau khi `open` về false để chạy exit animation
  const [mounted, setMounted] = useState<boolean>(open);
  const [visible, setVisible] = useState<boolean>(open);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Đồng bộ trạng thái mount/visible với prop `open` để animate
  useEffect(() => {
    if (open) {
      setMounted(true);
      // next-frame để transition opacity/scale chạy đúng
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  // Khóa scroll nền + lưu focus trước đó để trả lại khi đóng
  useEffect(() => {
    if (!mounted) return;
    if (typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    return () => {
      document.body.style.overflow = prevOverflow;
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [mounted]);

  // Focus close button khi mở
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [visible]);

  // ESC + focus trap đơn giản (Tab/Shift+Tab quay vòng trong panel)
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !panelRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, closeOnEsc, onClose]);

  if (!mounted) return null;
  if (typeof document === 'undefined') return null;

  const titleId = 'modal-title';
  const descId = 'modal-desc';
  const isDanger = variant === 'danger';

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/70 backdrop-blur-sm',
        'transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      onMouseDown={(e) => {
        if (!closeOnOverlayClick) return;
        // chỉ đóng khi click trực tiếp lên overlay, không phải panel
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        data-variant={variant}
        className={cn(
          'relative w-full rounded-md flex flex-col',
          'max-h-[90vh]',
          // glass style: tối + blur + viền vàng nhạt
          'shadow-2xl shadow-black/60',
          'transition-all duration-200',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          sizeClass[size],
          isDanger
            ? 'border border-error/40'
            : 'border border-gold/30',
          className
        )}
        style={{
          background: 'rgba(13, 17, 23, 0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: isDanger
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : '1px solid rgba(241, 229, 172, 0.1)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title || showCloseButton ? (
          <div
            className={cn(
              'flex items-start justify-between gap-3 px-5 py-4',
              'border-b border-gold/15'
            )}
          >
            <div className="min-w-0 flex-1">
              {title ? (
                <h2
                  id={titleId}
                  className={cn(
                    'font-heading tracking-wider uppercase text-base',
                    isDanger ? 'text-error' : 'text-gold'
                  )}
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <div
                  id={descId}
                  className="mt-1 text-sm text-text-muted"
                >
                  {description}
                </div>
              ) : null}
            </div>
            {showCloseButton ? (
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className={cn(
                  'shrink-0 -mr-1 -mt-1 p-1.5 rounded',
                  'text-text-muted/70 hover:text-text-base',
                  'transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60'
                )}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        {children ? (
          <div className="px-5 py-4 overflow-y-auto text-sm text-text-base">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div
            className={cn(
              'flex items-center justify-end gap-2 px-5 py-3',
              'border-t border-gold/15'
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
