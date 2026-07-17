'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, MATERIAL_LABELS } from '@/lib/utils';
import type { FilterCounts } from '@/lib/supabase/queries/products';

type FilterValue = string | undefined;

interface CheckboxGroupProps {
  title: string;
  paramKey: 'category' | 'material' | 'tier';
  options: { value: string; label: string; count?: number }[];
  selected: FilterValue;
  delay?: number;
}

function CheckboxGroup({ title, paramKey, options, selected, delay = 0 }: CheckboxGroupProps) {
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
    <div
      className="border-b border-gold/10 py-4 last:border-0 motion-safe:animate-fadeInUp"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
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
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
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
                {typeof opt.count === 'number' && (
                  <span className="text-xs tabular-nums text-text-muted">
                    ({opt.count})
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AvailableToggle({ delay = 0 }: { delay?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  // Default: onlyAvailable = true (show only AVAILABLE)
  // ?available=0 means show all (AVAILABLE + RESERVED)
  const showAll = params.get('available') === '0';

  const toggle = () => {
    const next = new URLSearchParams(params.toString());
    if (showAll) {
      next.delete('available');
    } else {
      next.set('available', '0');
    }
    const qs = next.toString();
    router.push(qs ? `/san-pham?${qs}` : '/san-pham', { scroll: false });
  };

  return (
    <div
      className="border-b border-gold/10 py-4 motion-safe:animate-fadeInUp"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-heading text-sm font-semibold uppercase tracking-wider text-gold">
          Chỉ xem hàng còn
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={!showAll}
          onClick={toggle}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
            showAll
              ? 'border-gold/60 bg-gold/20'
              : 'border-gold bg-gold'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-gold transition-transform',
              showAll ? 'translate-x-1' : 'translate-x-6'
            )}
          />
        </button>
      </div>
    </div>
  );
}

interface PriceRangeProps {
  min: number;
  max: number;
  currentMin?: number;
  currentMax?: number;
  delay?: number;
}

function PriceRange({ min, max, currentMin, currentMax, delay = 0 }: PriceRangeProps) {
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
    <div
      className="border-b border-gold/10 py-4 last:border-0 motion-safe:animate-fadeInUp"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between transition-colors hover:text-gold"
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
  counts?: FilterCounts | null;
}

export function FilterSidebar({ priceRange, activeCount, counts }: FilterSidebarProps) {
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

        <AvailableToggle delay={0} />

        <CheckboxGroup
          title="Danh mục"
          paramKey="category"
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
            value,
            label,
            count: counts?.category[value],
          }))}
          selected={params.get('category') ?? undefined}
          delay={0}
        />

        <CheckboxGroup
          title="Chất liệu"
          paramKey="material"
          options={Object.entries(MATERIAL_LABELS).map(([value, label]) => ({
            value,
            label,
            count: counts?.material[value],
          }))}
          selected={params.get('material') ?? undefined}
          delay={80}
        />

        <CheckboxGroup
          title="Tier chất lượng"
          paramKey="tier"
          options={[
            { value: 'SSS', label: 'SSS — Mới nguyên seal', count: counts?.tier['SSS'] },
            { value: 'SS', label: 'SS — Trên 95%', count: counts?.tier['SS'] },
            { value: 'S', label: 'S — Trên 90%', count: counts?.tier['S'] },
          ]}
          selected={params.get('tier') ?? undefined}
          delay={160}
        />

        <PriceRange
          min={priceRange.min}
          max={priceRange.max}
          currentMin={params.get('min') ? Number(params.get('min')) : undefined}
          currentMax={params.get('max') ? Number(params.get('max')) : undefined}
          delay={240}
        />
      </div>
    </aside>
  );
}
