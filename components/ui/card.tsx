import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  shine?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = true, shine = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-surface-emerald bg-surface shadow-card overflow-hidden',
        hoverable && 'transition-all duration-300 hover:border-gold/30 hover:shadow-card-hover',
        shine && 'shine-on-hover',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}
