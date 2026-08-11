import * as React from 'react';
import { cn } from '@/lib/utils';

type Tier = 'SSS' | 'SS' | 'S';

const tierStyles: Record<Tier, string> = {
  SSS: 'bg-gradient-to-r from-gold to-gold-champagne text-background font-bold shadow-[0_0_10px_rgba(242,202,80,0.4)]',
  SS: 'bg-surface text-gold border border-gold/40',
  S: 'bg-surface/80 text-gold/70 border border-dotted border-gold/30',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tier?: Tier;
  variant?: 'default' | 'outline' | 'gold' | 'success' | 'sold-out' | 'reserved';
}

export function Badge({ className, tier, variant = 'default', ...props }: BadgeProps) {
  if (tier) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-semibold tracking-wider uppercase',
          tierStyles[tier],
          className
        )}
        {...props}
      />
    );
  }

  const variants = {
    default: 'bg-surface-emerald text-text-base border border-surface-emerald',
    outline: 'border border-gold/40 text-gold bg-transparent',
    gold: 'bg-gold/15 text-gold border border-gold/40',
    success: 'bg-success/15 text-success border border-success/40',
    'sold-out': 'bg-error/15 text-error border border-error/40',
    // @deprecated Dùng ProductUnavailableOverlay cho SOLD_OUT / RESERVED.
    // Variant này vẫn export để không break external code, nhưng không khuyến nghị
    // sử dụng trong UI mới. Xem components/product/product-unavailable-overlay.tsx.
    reserved: 'bg-warning/15 text-warning border border-warning/40',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium tracking-wider uppercase',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
