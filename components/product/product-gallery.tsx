'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface ProductGalleryProps {
  product: Product;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const allImages = product.gallery && product.gallery.length > 0
    ? product.gallery
    : [product.image_url];
  const [activeIndex, setActiveIndex] = useState(0);
  const isSoldOut = product.status === 'SOLD_OUT';

  return (
    <div className="flex flex-col gap-4">
      {/* Main image with TIER badge overlay */}
      <div className="relative aspect-square overflow-hidden rounded-sm border border-gold/10 bg-surface-emerald motion-safe:animate-scaleIn">
        <Image
          src={allImages[activeIndex]}
          alt={product.title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={cn(
            'object-cover transition-opacity duration-300',
            isSoldOut && 'opacity-50 grayscale'
          )}
        />

        {/* TIER badge — top-left, blur overlay */}
        <div className="absolute top-6 left-6 z-10">
          <div className="border border-gold/40 bg-background/80 px-4 py-2 backdrop-blur-md">
            <span className="font-heading text-2xl text-gold">
              TIER {product.quality_tier}
            </span>
          </div>
        </div>

        {/* SOLD OUT overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <p className="font-heading text-3xl text-gold">Đã được sưu tầm</p>
          </div>
        )}
      </div>

      {/* Thumbnail row */}
      {allImages.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {allImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-sm border bg-surface-emerald transition-all duration-200 hover:scale-105 active:scale-95',
                activeIndex === i
                  ? 'border-gold/60 shadow-gold-glow'
                  : 'border-gold/15 hover:border-gold/30'
              )}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              <Image
                src={img}
                alt=""
                fill
                sizes="120px"
                className={cn(
                  'object-cover transition-opacity duration-200',
                  activeIndex === i ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}