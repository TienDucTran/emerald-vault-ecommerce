'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: ReactNode;
  gradient?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  gradient,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 p-6 rounded-sm overflow-hidden',
        'bg-[rgba(18,36,28,0.6)] backdrop-blur-[6px]',
        className
      )}
    >
      {/* Optional decorative gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          background: gradient
            ? `linear-gradient(90deg, transparent 0%, rgba(241, 229, 172, 0.1) 50%, transparent 100%)`
            : undefined,
        }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs font-heading tracking-[0.08em] uppercase text-[#D0C5AF]/70">
          {title}
        </span>
        {icon && <span className="text-lg text-gold/60">{icon}</span>}
      </div>

      {/* Value */}
      <div className="relative z-10 min-w-0">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="text-2xl sm:text-3xl font-heading font-bold text-[#EAE1D4] tracking-tight break-all">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                'text-xs font-medium mb-1',
                trend.isPositive ? 'text-success' : 'text-error'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[#D0C5AF]/50 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}