'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { WishlistButton } from '@/components/ui/wishlist-button';
import { ProductUnavailableOverlay, isUnavailableStatus } from '@/components/product/product-unavailable-overlay';
import { formatVND, MATERIAL_LABELS } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  className?: string;
}

export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const unavailable = isUnavailableStatus(product.status);
  const hasGallery = product.gallery && product.gallery.length > 0;
  const hoverImage = hasGallery ? product.gallery![0] : product.image_url;

  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-lg',
        'border border-surface-emerald bg-surface shadow-card',
        'transition-all duration-300',
        'hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg hover:shadow-card-hover',
        className
      )}
    >
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-background">
        <Image
          src={product.image_url}
          alt={product.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={cn(
            'object-cover transition-transform duration-500',
            'group-hover:scale-110',
            unavailable ? 'grayscale' : ''
          )}
        />

        {/* Hover swap image */}
        {hasGallery && (
          <Image
            src={hoverImage}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={cn(
              'object-cover transition-opacity duration-500',
              'opacity-0 group-hover:opacity-100',
              unavailable && 'opacity-0'
            )}
            aria-hidden
          />
        )}

        {/* Shine sweep on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
        />

        {/* Unavailable overlay (SOLD_OUT hoặc RESERVED) */}
        {unavailable && (
          <ProductUnavailableOverlay status={product.status as 'SOLD_OUT' | 'RESERVED'} />
        )}

        {/* Featured badge — chỉ hiện khi còn AVAILABLE (vì overlay đã chiếm chỗ) */}
        {product.is_featured && !unavailable && (
          <div className="absolute top-3 left-3">
            <Badge variant="gold">Nổi bật</Badge>
          </div>
        )}

        {/* Wishlist button */}
        <WishlistButton
          product={product}
          className={cn(
            'absolute top-3 right-3',
            unavailable
              ? 'opacity-0 group-hover:opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Badge tier={product.quality_tier}>Tier {product.quality_tier}</Badge>
          <span className="text-xs text-text-muted">{MATERIAL_LABELS[product.material]}</span>
        </div>
        <h3 className="mb-2 line-clamp-2 font-heading text-base leading-snug text-text-base transition-colors group-hover:text-gold">
          {product.title}
        </h3>
        <p
          className={cn(
            'font-heading text-lg font-semibold',
            unavailable ? 'text-text-muted line-through' : 'text-gradient-gold'
          )}
        >
          {formatVND(product.price)}
        </p>
      </div>
    </Link>
  );
}
