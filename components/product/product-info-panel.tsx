import { Clock, Heart, ShieldCheck, Truck } from 'lucide-react';
import { formatVND, MATERIAL_LABELS } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { LockButton } from './lock-button';

interface ProductInfoPanelProps {
  product: Product;
}

export function ProductInfoPanel({ product }: ProductInfoPanelProps) {
  const isAvailable = product.status === 'AVAILABLE';

  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
      {/* Title + subtitle */}
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-text-base sm:text-5xl">
          {product.title}
        </h1>
        {product.era && (
          <p className="font-heading text-base font-semibold text-text-muted">
            {product.era}
          </p>
        )}
        {!product.era && (
          <p className="text-sm text-text-muted">
            {MATERIAL_LABELS[product.material]}
          </p>
        )}
      </div>

      {/* Price block — with top/bottom border */}
      <div className="flex items-end gap-4 border-y border-gold/10 py-6">
        <span className="font-sans text-4xl text-gold">
          {formatVND(product.price)}
        </span>
        {product.original_price && (
          <span className="pb-2 text-base text-text-muted line-through">
            {formatVND(product.original_price)}
          </span>
        )}
      </div>

      {/* Description quote */}
      {product.description && (
        <p className="text-base leading-relaxed text-text-base/80">
          {product.description}
        </p>
      )}

      {/* CTA buttons */}
      <div className="flex flex-col gap-4">
        {isAvailable ? (
          <LockButton product={product} />
        ) : (
          <button
            type="button"
            disabled
            className="w-full bg-surface-emerald px-6 py-4 font-heading text-lg text-text-muted"
          >
            Đã được sưu tầm
          </button>
        )}

        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 border border-gold px-6 py-4 font-heading text-base text-gold transition-all hover:bg-gold/10"
        >
          <Heart className="h-5 w-5" />
          Thêm vào Wishlist
        </button>
      </div>

      {/* Trust strip — 3 icons */}
      <div className="grid grid-cols-3 gap-4 border-t border-gold/10 pt-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-5 w-5 text-gold" />
          <span className="text-xs font-medium uppercase tracking-wider text-text-base/70">
            AUTHENTIC
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <Clock className="h-5 w-5 text-gold" />
          <span className="text-xs font-medium uppercase tracking-wider text-text-base/70">
            10-MIN HOLD
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <Truck className="h-5 w-5 text-gold" />
          <span className="text-xs font-medium uppercase tracking-wider text-text-base/70">
            FREE SHIPPING
          </span>
        </div>
      </div>
    </div>
  );
}