'use client';

/**
 * ProductGallery — Pro gallery với thumbnail switch + lightbox zoom.
 *
 * Features:
 *   - Main image clickable → mở lightbox fullscreen
 *   - Lightbox: scroll wheel zoom in/out, drag pan, ESC close, prev/next arrows
 *   - Thumbnail row: click đổi main image, active state gold glow
 *   - Counter "1 / 5" góc dưới main image
 *   - Unavailable overlay (SOLD_OUT/RESERVED) dùng vintage stamp style
 *   - Touch-friendly: swipe prev/next trên mobile (lightbox)
 *
 * Sizes:
 *   - Main image: aspect-[4/5] (portrait — phù hợp jewelry), max-w-md (448px)
 *   - Thumbnails: grid-cols-5 mobile / flex-wrap desktop, mỗi thumb ~88px
 *   - Lightbox: full viewport, image max 90vw × 90vh
 *
 * Không dùng external lib → tự build modal + zoom + pan bằng CSS transforms.
 * Bundle impact: ~0 KB (chỉ là 1 component).
 */

import { useCallback, useEffect, useRef, useState, type WheelEvent, type MouseEvent } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { ProductUnavailableOverlay, isUnavailableStatus } from '@/components/product/product-unavailable-overlay';

interface ProductGalleryProps {
  product: Product;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  // Tổng ảnh = [main] + gallery, hoặc chỉ [main] nếu không có gallery
  const allImages =
    product.gallery && product.gallery.length > 0
      ? [product.image_url, ...product.gallery]
      : [product.image_url];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isUnavailable = isUnavailableStatus(product.status);

  // Keyboard nav (chỉ khi lightbox mở)
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') setActiveIndex((i) => (i - 1 + allImages.length) % allImages.length);
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i + 1) % allImages.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, allImages.length]);

  // Lock body scroll khi lightbox mở
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [lightboxOpen]);

  return (
    <div className="flex flex-col gap-3">
      {/* Main image — aspect 4:5 (portrait, phù hợp jewelry) + max-w-md */}
      <div
        className={cn(
          'group relative mx-auto w-full',
          'max-w-md', // 448px — đủ to, chuyên nghiệp
          'overflow-hidden rounded-sm border border-gold/15 bg-surface',
          'motion-safe:animate-scaleIn',
          !isUnavailable && 'cursor-zoom-in'
        )}
        onClick={() => !isUnavailable && setLightboxOpen(true)}
        role="button"
        tabIndex={isUnavailable ? -1 : 0}
        aria-label={isUnavailable ? 'Sản phẩm không khả dụng' : 'Click để phóng to'}
        onKeyDown={(e) => {
          if (!isUnavailable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setLightboxOpen(true);
          }
        }}
      >
        <div className="relative aspect-[4/5]">
          <Image
            src={allImages[activeIndex]}
            alt={`${product.title} - ảnh ${activeIndex + 1}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 448px"
            className={cn(
              'object-cover transition-opacity duration-500',
              isUnavailable && 'grayscale'
            )}
          />

          {/* TIER badge — top-left, giống ProductCard (vintage stamp mini) */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <div className="border border-gold/40 bg-background/80 px-3 py-1.5 backdrop-blur-md">
              <span className="font-heading text-base font-semibold tracking-wider text-gold uppercase sm:text-lg">
                Tier {product.quality_tier}
              </span>
            </div>
          </div>

          {/* Zoom hint — góc dưới phải, ẩn khi unavailable */}
          {!isUnavailable && (
            <div
              className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-sm border border-gold/30 bg-background/80 px-2.5 py-1 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-0"
              aria-hidden
            >
              <ZoomIn className="h-3 w-3 text-gold" />
              <span className="text-[10px] font-heading tracking-[0.1em] text-gold uppercase">
                Phóng to
              </span>
            </div>
          )}

          {/* Counter — góc dưới trái */}
          {allImages.length > 1 && (
            <div
              className="absolute bottom-3 left-3 z-10 rounded-sm border border-gold/30 bg-background/80 px-2 py-0.5 backdrop-blur-md pointer-events-none"
              aria-live="polite"
            >
              <span className="text-[10px] font-mono tracking-wider text-gold tabular-nums">
                {activeIndex + 1} / {allImages.length}
              </span>
            </div>
          )}

          {/* Unavailable overlay — vintage stamp style */}
          {isUnavailable && (
            <ProductUnavailableOverlay status={product.status} />
          )}
        </div>
      </div>

      {/* Thumbnail row */}
      {allImages.length > 1 && (
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-wrap gap-2">
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'relative aspect-square w-[72px] flex-shrink-0 overflow-hidden rounded-sm border bg-surface-emerald transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  activeIndex === i
                    ? 'border-gold/60 shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                    : 'border-gold/15 opacity-75 hover:opacity-100'
                )}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={activeIndex === i ? 'true' : undefined}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  sizes="72px"
                  className={cn(
                    'object-cover',
                    isUnavailable && 'grayscale'
                  )}
                />
                {/* Active indicator ring */}
                {activeIndex === i && (
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-gold/50" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={allImages}
          initialIndex={activeIndex}
          title={product.title}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setActiveIndex}
        />
      )}
    </div>
  );
}

// ============================================================
// Lightbox — modal fullscreen với zoom + pan + prev/next
// ============================================================

interface LightboxProps {
  images: string[];
  initialIndex: number;
  title: string;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

function Lightbox({ images, initialIndex, title, onClose, onIndexChange }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const goPrev = useCallback(() => {
    setIndex((i) => {
      const next = (i - 1 + images.length) % images.length;
      onIndexChange(next);
      return next;
    });
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length, onIndexChange]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      const next = (i + 1) % images.length;
      onIndexChange(next);
      return next;
    });
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length, onIndexChange]);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom((z) => Math.max(1, Math.min(4, z + delta)));
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    setPosition({
      x: dragStartRef.current.posX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.posY + (e.clientY - dragStartRef.current.y),
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Phóng to: ${title}`}
    >
      {/* Close button — top-right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-gold/40 bg-background/80 text-gold backdrop-blur-md transition-colors hover:bg-gold/20"
        aria-label="Đóng"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev arrow — left */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute top-1/2 left-4 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-gold/40 bg-background/80 text-gold backdrop-blur-md transition-colors hover:bg-gold/20"
          aria-label="Ảnh trước"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next arrow — right */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute top-1/2 right-4 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-gold/40 bg-background/80 text-gold backdrop-blur-md transition-colors hover:bg-gold/20"
          aria-label="Ảnh sau"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative flex h-[90vh] w-[90vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'relative h-full w-full',
            zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
          )}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            e.stopPropagation();
            if (zoom === 1) setZoom(2);
            else resetZoom();
          }}
        >
          <div
            className="relative h-full w-full transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            }}
          >
            <Image
              src={images[index]}
              alt={`${title} - ảnh ${index + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
              quality={95}
              priority
            />
          </div>
        </div>
      </div>

      {/* Bottom toolbar: zoom controls + counter */}
      <div
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/40 bg-background/80 px-3 py-1.5 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          disabled={zoom <= 1}
          className="grid h-8 w-8 place-items-center rounded-full text-gold transition-colors hover:bg-gold/20 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Thu nhỏ"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[3.5rem] text-center font-mono text-xs text-gold tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          disabled={zoom >= 4}
          className="grid h-8 w-8 place-items-center rounded-full text-gold transition-colors hover:bg-gold/20 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Phóng to"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        {zoom !== 1 && (
          <button
            type="button"
            onClick={resetZoom}
            className="grid h-8 w-8 place-items-center rounded-full text-gold transition-colors hover:bg-gold/20"
            aria-label="Đặt lại"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <div className="mx-1 h-5 w-px bg-gold/20" />
        <span className="text-xs font-mono text-gold tabular-nums">
          {index + 1} / {images.length}
        </span>
      </div>
    </div>
  );
}
