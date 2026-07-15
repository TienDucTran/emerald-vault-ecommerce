'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlistStore } from '@/lib/store/wishlist';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast/toast-store';
import type { Product } from '@/lib/types';

type Variant = 'icon' | 'full';
type Size = 'sm' | 'md' | 'lg';

export interface WishlistButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  product: Product;
  variant?: Variant;
  size?: Size;
  showLabel?: boolean;
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

const fullSizeStyles: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-13 px-6 text-base',
};

const iconSizes: Record<Size, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const WishlistButton = React.forwardRef<HTMLButtonElement, WishlistButtonProps>(
  (
    {
      product,
      variant = 'icon',
      size = 'md',
      showLabel = false,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const router = useRouter();
    const pathname = usePathname() || '/';
    const isActive = useWishlistStore((s) => s.ids.has(product.id));

    // Bootstrap server wishlist vào cache nếu chưa load (user đã đăng nhập).
    // Đảm bảo heart state đúng ngay từ frame đầu tiên khi user vào page.
    useEffect(() => {
      if (useWishlistStore.getState().loaded) return;
      let cancelled = false;
      (async () => {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || cancelled) return;
          const res = await fetch('/api/account/wishlist', { cache: 'no-store' });
          if (!res.ok || cancelled) return;
          const json = (await res.json()) as { data?: Array<{ product_id: string }> };
          const ids = (json.data ?? []).map((it) => it.product_id);
          if (!cancelled) {
            useWishlistStore.getState().setItems(ids);
          }
        } catch {
          // ignore — heart sẽ tự update khi user click
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          const next =
            pathname + (typeof window !== 'undefined' ? window.location.search : '');
          const nextEncoded = encodeURIComponent(next);
          const productIdEncoded = encodeURIComponent(product.id);
          toast.info('Bạn cần đăng nhập để thêm yêu thích', {
            description: 'Đăng nhập để đồng bộ yêu thích giữa các thiết bị.',
            durationMs: 5000,
            action: {
              label: 'Đăng nhập',
              onClick: () => {
                router.push(
                  `/tai-khoan/dang-nhap?next=${nextEncoded}&wishlist=1&product=${productIdEncoded}`
                );
              },
            },
          });
          return;
        }

        // Optimistic update
        const previous = isActive;
        useWishlistStore.getState().setHas(product.id, !previous);

        try {
          if (!previous) {
            // Đang thêm
            const res = await fetch('/api/account/wishlist', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ product_id: product.id }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
          } else {
            // Đang xoá
            const res = await fetch(
              `/api/account/wishlist/${encodeURIComponent(product.id)}`,
              { method: 'DELETE' }
            );
            if (!res.ok && res.status !== 204) {
              throw new Error(`HTTP ${res.status}`);
            }
          }

          // Thành công → toast + dispatch event cho listener khác.
          if (!previous) {
            toast.success('Đã thêm vào yêu thích', {
              description: product.title,
              durationMs: 2500,
            });
          } else {
            toast.success('Đã xoá khỏi yêu thích', {
              description: product.title,
              durationMs: 2500,
            });
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('wishlist:toggle', {
                detail: {
                  product,
                  added: !previous,
                },
              })
            );
          }
        } catch (apiErr) {
          // Revert optimistic update
          useWishlistStore.getState().setHas(product.id, previous);
          toast.error('Không thể cập nhật yêu thích', {
            description: 'Vui lòng thử lại sau.',
          });
          console.error('[WishlistButton] API error:', apiErr);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('wishlist:error', {
                detail: {
                  product,
                  action: previous ? 'remove' : 'add',
                  error: apiErr instanceof Error ? apiErr.message : 'unknown',
                },
              })
            );
          }
        }
      } finally {
        onClick?.(e);
      }
    };

    const label = isActive ? 'Bỏ yêu thích' : 'Thêm vào yêu thích';

    if (variant === 'full') {
      return (
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          aria-label={label}
          aria-pressed={isActive}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
            'border',
            isActive
              ? 'border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20'
              : 'border-gold/60 text-gold hover:bg-gold/10',
            fullSizeStyles[size],
            className
          )}
          {...props}
        >
          <Heart
            className={cn(
              iconSizes[size],
              isActive && 'fill-red-500',
              'transition-transform duration-200 group-hover:scale-110'
            )}
            aria-hidden
          />
          {showLabel && <span>{isActive ? 'Đã thích' : 'Yêu thích'}</span>}
        </button>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-pressed={isActive}
        className={cn(
          'group grid place-items-center rounded-full backdrop-blur-sm',
          'transition-all duration-200 hover:scale-110 active:scale-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
          isActive
            ? 'bg-background/70 text-red-500 hover:bg-red-500/10'
            : 'bg-background/70 text-gold/70 hover:bg-gold hover:text-background',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        <Heart
          className={cn(
            iconSizes[size],
            isActive && 'fill-red-500',
            'transition-transform duration-200'
          )}
          aria-hidden
        />
      </button>
    );
  }
);

WishlistButton.displayName = 'WishlistButton';
