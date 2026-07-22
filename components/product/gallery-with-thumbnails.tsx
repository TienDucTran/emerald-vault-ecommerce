'use client';

/**
 * GalleryWithThumbnails — Gallery inline với logic click thumbnail đổi main.
 *
 * UI giữ nguyên PDP cũ (aspect-square, grid-cols-5, border-gold/20, gap-2).
 * CHỈ thêm logic: click thumbnail → đổi ảnh chính + active state.
 *
 * Props:
 *   - product: Product — dùng image_url + gallery + status
 *
 * Không có lightbox/zoom (đó là feature riêng của ProductGallery pro).
 * Nếu sau này cần lightbox → dùng <ProductGallery product={product} />.
 */

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ProductUnavailableOverlay, isUnavailableStatus } from '@/components/product/product-unavailable-overlay';
import type { Product } from '@/lib/types';

interface GalleryWithThumbnailsProps {
  product: Product;
}

export function GalleryWithThumbnails({ product }: GalleryWithThumbnailsProps) {
  // Build danh sách ảnh: [image_url, ...gallery] nhưng loại bỏ duplicate.
  //
  // Lý do: nhiều sản phẩm admin upload có ảnh chính (image_url) cũng nằm
  // trong gallery[0] (vì họ muốn gallery là "tất cả ảnh của SP" bao gồm ảnh chính).
  // Nếu cộng thẳng [image_url, ...gallery] sẽ bị duplicate thumbnail.
  //
  // So sánh exact string match (URL tuyệt đối, đã được Next/Image optimize).
  const gallery = (product.gallery ?? []).filter(
    (img) => img !== product.image_url
  );
  const allImages =
    gallery.length > 0
      ? [product.image_url, ...gallery]
      : [product.image_url];

  const [activeIndex, setActiveIndex] = useState(0);
  const isUnavailable = isUnavailableStatus(product.status);

  return (
    <div className="space-y-2">
      {/* Main image — UI cũ: aspect-square, border-gold/20 */}
      <div className="relative aspect-square overflow-hidden rounded-lg border border-gold/20 bg-surface">
        <Image
          src={allImages[activeIndex]}
          alt={`${product.title} - ảnh ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={cn('object-cover', isUnavailable && 'grayscale')}
        />
        {/* Overlay vintage stamp cho SOLD_OUT / RESERVED */}
        {isUnavailable && <ProductUnavailableOverlay status={product.status as 'SOLD_OUT' | 'RESERVED'} />}
      </div>

      {/* Thumbnails — UI cũ: grid-cols-5, gap-2, border-gold/20 */}
      {allImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {allImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-md border transition-all duration-200',
                'hover:scale-105 active:scale-95',
                activeIndex === i
                  ? 'border-gold/60 shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                  : 'border-gold/20 opacity-75 hover:opacity-100'
              )}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-current={activeIndex === i ? 'true' : undefined}
            >
              <Image
                src={img}
                alt=""
                fill
                sizes="80px"
                className={cn('object-cover', isUnavailable && 'grayscale')}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
