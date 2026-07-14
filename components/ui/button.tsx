import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'outline' | 'ghost' | 'gold' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-gold text-background hover:bg-gold-champagne shadow-md hover:shadow-gold-glow font-semibold',
  gold: 'bg-gradient-gold text-background hover:shadow-gold-glow-lg font-semibold',
  outline:
    'border border-gold/60 text-gold hover:bg-gold/10 hover:border-gold',
  ghost: 'text-gold hover:bg-gold/10',
  dark: 'bg-surface-emerald text-text-base border border-surface-emerald hover:border-gold/40',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md transition-all duration-200',
        'disabled:opacity-50 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
