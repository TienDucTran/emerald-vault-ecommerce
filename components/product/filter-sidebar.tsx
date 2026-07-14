'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, MATERIAL_LABELS } from '@/lib/utils';

type FilterValue = string | undefined;

interface CheckboxGroupProps {
  title: string;
  paramKey: 'category' | 'material' | 'tier';
  options: { value: string; label: string }[];
  selected: FilterValue;
}

function CheckboxGroup({ title, paramKey, options, selected }: CheckboxGroupProps) {
  const router = useRouter();
  const params = useSearchParams();

  const onChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      if (selected === value) {
        next.delete(paramKey);
      } else {
        next.set(paramKey, value);
      }
      const queryString = next.toString();
      router.push(queryString ? `/san-pham?${queryString}` : '/san-pham', { scroll: false });
    },
    [selected, paramKey, params, router]
  );

  return (
    <div className="border-b border-gold/10 py-4 last:border-0">
      <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-gold">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-gold/10 font-medium text-gold'
                    : 'text-text-base hover:bg-gold/5 hover:text-gold'
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-3.5 w-3.5 rounded-sm border transition-colors',
                      isActive ? 'border-gold bg-gold' : 'border-gold/40'
                    )}
                  >
                    {isActive && (
                      <svg
                        viewBox="0 0 12 12"
                        className="h-full w-full text-background"
                        fill="none"
                      >
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </span>
                  {opt.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface PriceRangeProps {
  min: number;
  max: number;
  currentMin?: number;
  currentMax?: number;
}

function PriceRange({ min, max, currentMin, currentMax }: PriceRangeProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(true);
  const [minVal, setMinVal] = useState(currentMin ?? min);
  const [maxVal, setMaxVal] = useState(currentMax ?? max);

  const apply = () => {
    const next = new URLSearchParams(params.toString());
    if (minVal > min) next.set('min', minVal.toString());
    else next.delete('min');
    if (maxVal < max) next.set('max', maxVal.toString());
    else next.delete('max');
    const qs = next.toString();
    router.push(qs ? `/san-pham?${qs}` : '/san-pham', { scroll: false });
  };

  return (
    <div className="border-b border-gold/10 py-4 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-gold">
          Khoảng giá
        </h4>
        <ChevronDown
          className={cn('h-4 w-4 text-gold/70 transition-transform', !open && '-rotate-90')}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <input
              type="number"
              value={minVal}
              onChange={(e) => setMinVal(Number(e.target.value) || 0)}
              className="h-9 w-full rounded-md border border-gold/30 bg-background px-2 text-text-base focus:border-gold focus:outline-none"
              placeholder="Từ"
            />
            <span className="text-text-muted">—</span>
            <input
              type="number"
              value={maxVal}
              onChange={(e) => setMaxVal(Number(e.target.value) || max)}
              className="h-9 w-full rounded-md border border-gold/30 bg-background px-2 text-text-base focus:border-gold focus:outline-none"
              placeholder="Đến"
            />
          </div>
          <button
            type="button"
            onClick={apply}
            className="h-9 w-full rounded-md border border-gold/40 text-sm text-gold transition-colors hover:bg-gold/10"
          >
            Áp dụng
          </button>
          <p className="text-xs text-text-muted">
            {(min / 1_000_000).toFixed(1)}tr — {(max / 1_000_000).toFixed(1)}tr
          </p>
        </div>
      )}
    </div>
  );
}

interface FilterSidebarProps {
  priceRange: { min: number; max: number };
  activeCount: number;
}

export function FilterSidebar({ priceRange, activeCount }: FilterSidebarProps) {
  const router = useRouter();
  const params = useSearchParams();

  const clearAll = () => router.push('/san-pham', { scroll: false });

  return (
    <aside className="sticky top-24 self-start">
      <div className="rounded-lg border border-gold/15 bg-surface p-5">
        <div className="mb-3 flex items-center justify-between border-b border-gold/10 pb-3">
          <h3 className="font-heading text-base font-semibold text-text-base">
            Bộ lọc{' '}
            {activeCount > 0 && (
              <span className="ml-1 text-xs text-gold">({activeCount})</span>
            )}
          </h3>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-gold"
            >
              <X className="h-3 w-3" />
              Xóa hết
            </button>
          )}
        </div>

        <CheckboxGroup
          title="Danh mục"
          paramKey="category"
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          selected={params.get('category') ?? undefined}
        />

        <CheckboxGroup
          title="Chất liệu"
          paramKey="material"
          options={Object.entries(MATERIAL_LABELS).map(([value, label]) => ({ value, label }))}
          selected={params.get('material') ?? undefined}
        />

        <CheckboxGroup
          title="Tier chất lượng"
          paramKey="tier"
          options={[
            { value: 'SSS', label: 'SSS — Mới nguyên seal' },
            { value: 'SS', label: 'SS — Trên 95%' },
            { value: 'S', label: 'S — Trên 90%' },
          ]}
          selected={params.get('tier') ?? undefined}
        />

        <PriceRange
          min={priceRange.min}
          max={priceRange.max}
          currentMin={params.get('min') ? Number(params.get('min')) : undefined}
          currentMax={params.get('max') ? Number(params.get('max')) : undefined}
        />
      </div>
    </aside>
  );
}
