'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { CATEGORY_LABELS, MATERIAL_LABELS } from '@/lib/utils';

interface ActiveFilter {
  key: string;
  paramKey: 'keyword' | 'category' | 'material' | 'tier' | 'min' | 'max';
  value: string;
  label: string;
}

export function ActiveFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const filters: ActiveFilter[] = [];

  const keyword = params.get('keyword')?.trim();
  if (keyword) {
    filters.push({
      key: 'keyword',
      paramKey: 'keyword',
      value: keyword,
      label: `Từ khóa: "${keyword}"`,
    });
  }

  const cat = params.get('category');
  if (cat) {
    filters.push({
      key: `category-${cat}`,
      paramKey: 'category',
      value: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
    });
  }

  const mat = params.get('material');
  if (mat) {
    filters.push({
      key: `material-${mat}`,
      paramKey: 'material',
      value: mat,
      label: MATERIAL_LABELS[mat] ?? mat,
    });
  }

  const tier = params.get('tier');
  if (tier) {
    filters.push({
      key: `tier-${tier}`,
      paramKey: 'tier',
      value: tier,
      label: `Tier ${tier}`,
    });
  }

  const min = params.get('min');
  const max = params.get('max');
  // FIX: Separate chips for min and max so each removes only its own param (Bug 6)
  const fmt = (v: string) => `${(Number(v) / 1_000_000).toFixed(1)}tr`;
  if (min) {
    filters.push({
      key: 'price-min',
      paramKey: 'min',
      value: min,
      label: `Từ ${fmt(min)}`,
    });
  }
  if (max) {
    filters.push({
      key: 'price-max',
      paramKey: 'max',
      value: max,
      label: `Đến ${fmt(max)}`,
    });
  }

  if (filters.length === 0) return null;

  function remove(paramKey: string) {
    const next = new URLSearchParams(params.toString());
    next.delete(paramKey);
    const qs = next.toString();
    router.push(qs ? `/san-pham?${qs}` : '/san-pham', { scroll: false });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-text-muted">Đang lọc:</span>
      {filters.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => remove(f.paramKey)}
          className="group motion-safe:animate-scaleIn inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-surface-emerald px-2.5 py-1 text-xs text-gold transition-colors duration-200 hover:border-error/50 hover:bg-error/10 hover:text-error"
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
          {f.label}
          <X className="h-3 w-3 opacity-60 transition-all duration-200 group-hover:scale-110 group-hover:opacity-100 active:scale-90" />
        </button>
      ))}
    </div>
  );
}
