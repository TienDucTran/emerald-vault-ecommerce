'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';

interface MobileFilterBarProps {
  onOpenFilter: () => void;
  onOpenSort: () => void;
  totalProducts: number;
  displayedProducts: number;
}

const QUICK_TAGS = [
  { label: 'Tất Cả', value: '' },
  { label: 'Nhẫn', value: 'NHAN' },
  { label: 'Dây Chuyền', value: 'DAY_CHUYEN' },
  { label: 'Đồng Hồ', value: 'VONG_TAY' },
  { label: 'Tier SSS', value: 'SSS' },
];

export function MobileFilterBar({ onOpenFilter, onOpenSort, totalProducts, displayedProducts }: MobileFilterBarProps) {
  const router = useRouter();
  const params = useSearchParams();

  const activeCategory = params.get('category') ?? '';
  const activeTier = params.get('tier') ?? '';

  function quickTagNavigate(value: string) {
    const next = new URLSearchParams(params.toString());
    // If it's a tier value
    if (value === 'SSS' || value === 'SS' || value === 'S') {
      if (activeTier === value) {
        next.delete('tier');
      } else {
        next.set('tier', value);
      }
    } else if (value === '') {
      next.delete('category');
      next.delete('tier');
    } else {
      if (activeCategory === value) {
        next.delete('category');
      } else {
        next.set('category', value);
      }
    }
    const qs = next.toString();
    router.push(qs ? `/san-pham?${qs}` : '/san-pham', { scroll: false });
  }

  function getTagActive(tagValue: string): boolean {
    if (tagValue === '') return !activeCategory && !activeTier;
    if (tagValue === 'SSS' || tagValue === 'SS' || tagValue === 'S') return activeTier === tagValue;
    return activeCategory === tagValue;
  }

  return (
    <div className="sticky top-[60px] z-30 border-b border-gold/10 bg-background/95 backdrop-blur-md">
      {/* Search + Filter button */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Tìm kiếm bảo vật..."
            className="w-full rounded-sm border border-gold/20 bg-surface-emerald/50 py-2.5 pl-10 pr-4 text-sm text-text-base placeholder:text-text-muted/60 focus:border-gold/50 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onOpenFilter}
          className="flex shrink-0 items-center gap-2 rounded-sm border border-gold/20 bg-surface px-4 py-2.5 text-sm text-gold transition-colors hover:border-gold/50"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="font-heading text-xs uppercase tracking-wider">Lọc</span>
        </button>
      </div>

      {/* Quick tags */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {QUICK_TAGS.map((tag) => {
          const isActive = getTagActive(tag.value);
          return (
            <button
              key={tag.label}
              type="button"
              onClick={() => quickTagNavigate(tag.value)}
              className={`shrink-0 rounded-lg px-4 py-1.5 font-heading text-xs uppercase tracking-wider transition-colors ${
                isActive
                  ? 'bg-gold/10 text-gold border border-gold'
                  : 'border border-gold/20 text-text-muted hover:border-gold/40 hover:text-gold'
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* Count + Sort */}
      <div className="flex items-center justify-between px-4 pb-2 text-[11px] tracking-wider text-text-muted">
        <span>
          HIỂN THỊ <span className="text-gold">{displayedProducts}</span> / {totalProducts} SẢN PHẨM
        </span>
        <button
          type="button"
          onClick={onOpenSort}
          className="flex items-center gap-1 text-gold transition-colors hover:text-gold-champagne"
        >
          SẮP XẾP
        </button>
      </div>
    </div>
  );
}