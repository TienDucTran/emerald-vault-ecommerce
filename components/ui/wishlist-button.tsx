'use client';

import * as React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlistStore } from '@/lib/store/wishlist';
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
    const isActive = useWishlistStore((s) => s.hasItem(product.id));

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Ngăn trigger parent Link navigation
      e.stopPropagation();
      e.preventDefault();

      useWishlistStore.getState().toggleItem(product);

      // Dispatch custom event cho toast / listener khác
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('wishlist:toggle', {
            detail: {
              product,
              added: !isActive, // sau khi toggle, state mới
            },
          })
        );
      }

      onClick?.(e);
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
            className={cn(iconSizes[size], isActive && 'fill-red-500')}
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
          'grid place-items-center rounded-full backdrop-blur-sm',
          'transition-all duration-200',
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
          className={cn(iconSizes[size], isActive && 'fill-red-500')}
          aria-hidden
        />
      </button>
    );
  }
);

WishlistButton.displayName = 'WishlistButton';
