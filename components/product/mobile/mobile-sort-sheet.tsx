'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X, Check } from 'lucide-react';

interface MobileSortSheetProps {
  open: boolean;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
  { value: 'featured', label: 'Nổi bật' },
];

export function MobileSortSheet({ open, onClose }: MobileSortSheetProps) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('sort') || 'newest';

  if (!open) return null;

  function onSelect(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === 'newest') next.delete('sort');
    else next.set('sort', value);
    const qs = next.toString();
    router.push(qs ? `/san-pham?${qs}` : '/san-pham', { scroll: false });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm motion-safe:animate-fadeIn"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 inset-x-0 rounded-t-3xl border-t border-gold/20 bg-surface/95 backdrop-blur-md motion-safe:animate-fadeInUp"
        style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold/10 px-5 py-4">
          <h3 className="font-heading text-base font-semibold text-text-base">Sắp Xếp Sản Phẩm</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-text-muted transition-all duration-200 hover:scale-110 hover:text-gold active:scale-90"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col py-2">
          {SORT_OPTIONS.map((opt, i) => {
            const isActive = current === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelect(opt.value)}
                className={`flex items-center justify-between px-5 py-3.5 text-sm transition-colors duration-200 motion-safe:animate-fadeInUp ${
                  isActive ? 'text-gold' : 'text-text-base hover:text-gold'
                }`}
                style={{ animationDelay: `${(i + 1) * 50}ms`, animationFillMode: 'backwards' }}
              >
                <span className={isActive ? 'font-medium' : ''}>{opt.label}</span>
                {isActive && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}