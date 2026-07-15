'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
  { value: 'featured', label: 'Nổi bật' },
];

export function SortDropdown() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = params.get('sort') || 'newest';
  const currentLabel = SORT_OPTIONS.find((o) => o.value === current)?.label ?? 'Mới nhất';

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function onSelect(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === 'newest') next.delete('sort');
    else next.set('sort', value);
    const qs = next.toString();
    router.push(qs ? `/san-pham?${qs}` : '/san-pham', { scroll: false });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-md border border-gold/30 bg-surface px-3 text-sm text-text-base',
          'transition-all duration-200 hover:border-gold/60 hover:bg-gold/10 active:scale-95'
        )}
      >
        <span className="text-text-muted">Sắp xếp:</span>
        <span className="font-medium text-gold">{currentLabel}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-gold/70 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-md border border-gold/20 bg-surface py-1 shadow-xl motion-safe:animate-fadeInUp"
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                'block w-full px-3 py-2 text-left text-sm transition-colors duration-200',
                opt.value === current
                  ? 'bg-gold/10 font-medium text-gold'
                  : 'text-text-base hover:bg-gold/10 hover:text-gold'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
