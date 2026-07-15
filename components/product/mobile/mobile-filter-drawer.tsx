'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/utils';

interface MobileFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  priceRange: { min: number; max: number };
}

const TIER_OPTIONS = [
  { value: 'SSS', label: 'Tier SSS (Bảo Vật Quốc Gia)' },
  { value: 'SS', label: 'Tier SS (Sưu Tầm Cao Cấp)' },
  { value: 'S', label: 'Tier S (Tuyển Chọn)' },
];

export function MobileFilterDrawer({ open, onClose, priceRange }: MobileFilterDrawerProps) {
  const router = useRouter();
  const params = useSearchParams();

  const [category, setCategory] = useState<string | null>(params.get('category'));
  const [tier, setTier] = useState<string | null>(params.get('tier'));
  const [minVal, setMinVal] = useState<number>(params.get('min') ? Number(params.get('min')) : priceRange.min);
  const [maxVal, setMaxVal] = useState<number>(params.get('max') ? Number(params.get('max')) : priceRange.max);

  useEffect(() => {
    setCategory(params.get('category'));
    setTier(params.get('tier'));
    setMinVal(params.get('min') ? Number(params.get('min')) : priceRange.min);
    setMaxVal(params.get('max') ? Number(params.get('max')) : priceRange.max);
  }, [params, priceRange.min, priceRange.max, open]);

  if (!open) return null;

  const categories = Object.entries(CATEGORY_LABELS);

  function apply() {
    const next = new URLSearchParams(params.toString());
    if (category) next.set('category', category);
    else next.delete('category');
    if (tier) next.set('tier', tier);
    else next.delete('tier');
    if (minVal > priceRange.min) next.set('min', minVal.toString());
    else next.delete('min');
    if (maxVal < priceRange.max) next.set('max', maxVal.toString());
    else next.delete('max');
    const qs = next.toString();
    router.push(qs ? `/san-pham?${qs}` : '/san-pham', { scroll: false });
    onClose();
  }

  function clearAll() {
    setCategory(null);
    setTier(null);
    setMinVal(priceRange.min);
    setMaxVal(priceRange.max);
  }

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm motion-safe:animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-gold/20 bg-surface/95 backdrop-blur-md motion-safe:animate-fadeInUp"
        style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold/10 px-5 py-4">
          <h3 className="font-heading text-base font-semibold text-text-base">Bộ Lọc Sưu Tập</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-text-muted transition-all duration-200 hover:scale-110 hover:text-gold active:scale-90"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 px-5 py-5">
          {/* Category section */}
          <div
            className="motion-safe:animate-fadeInUp"
            style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}
          >
            <p className="mb-3 font-heading text-xs uppercase tracking-wider text-gold/70">Phân Loại</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={`rounded-sm border px-4 py-2.5 text-sm transition-colors ${
                  !category
                    ? 'border-gold bg-gold text-background font-medium'
                    : 'border-gold/20 bg-surface text-text-base hover:border-gold/40'
                }`}
              >
                Tất Cả
              </button>
              {categories.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(category === value ? null : value)}
                  className={`rounded-sm border px-4 py-2.5 text-sm transition-colors ${
                    category === value
                      ? 'border-gold bg-gold text-background font-medium'
                      : 'border-gold/20 bg-surface text-text-base hover:border-gold/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier section */}
          <div
            className="motion-safe:animate-fadeInUp"
            style={{ animationDelay: '160ms', animationFillMode: 'backwards' }}
          >
            <p className="mb-3 font-heading text-xs uppercase tracking-wider text-gold/70">Phẩm Cấp (Tier)</p>
            <div className="flex flex-col gap-2">
              {TIER_OPTIONS.map((opt) => {
                const isActive = tier === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTier(isActive ? null : opt.value)}
                    className={`flex items-center justify-between rounded-sm border px-3 py-3 text-sm transition-colors ${
                      isActive
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-gold/10 bg-surface text-text-base hover:border-gold/30'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-sm border ${
                        isActive ? 'border-gold bg-gold text-background' : 'border-gold/40'
                      }`}
                    >
                      {isActive && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price range section */}
          <div
            className="motion-safe:animate-fadeInUp"
            style={{ animationDelay: '240ms', animationFillMode: 'backwards' }}
          >
            <p className="mb-3 font-heading text-xs uppercase tracking-wider text-gold/70">Khoảng Giá</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minVal}
                onChange={(e) => setMinVal(Number(e.target.value) || 0)}
                className="h-10 w-full rounded-sm border border-gold/20 bg-surface px-3 text-sm text-text-base focus:border-gold/50 focus:outline-none"
                placeholder="Từ"
              />
              <span className="text-text-muted">—</span>
              <input
                type="number"
                value={maxVal}
                onChange={(e) => setMaxVal(Number(e.target.value) || priceRange.max)}
                className="h-10 w-full rounded-sm border border-gold/20 bg-surface px-3 text-sm text-text-base focus:border-gold/50 focus:outline-none"
                placeholder="Đến"
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-text-muted">
              <span>{(priceRange.min / 1_000_000).toFixed(0)}M</span>
              <span>{(priceRange.max / 1_000_000).toFixed(0)}M+</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-gold/10 px-5 py-4">
          <button
            type="button"
            onClick={clearAll}
            className="rounded-sm border border-gold/30 px-5 py-3 text-sm text-text-muted transition-colors hover:border-gold/50 hover:text-gold"
          >
            Xóa tất cả
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-sm bg-gold px-5 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-background transition-colors hover:bg-gold-champagne"
          >
            Áp Dụng Bộ Lọc
          </button>
        </div>
      </div>
    </div>
  );
}