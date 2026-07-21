'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { formatVND } from '@/lib/utils';

interface ChatProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number | string;
    image_url?: string | null;
    material?: string;
    quality_tier?: 'SSS' | 'SS' | 'S';
  };
}

export function ChatProductCard({ product }: ChatProductCardProps) {
  const rawPrice = product.price;
  const parsedPrice =
    typeof rawPrice === 'number'
      ? rawPrice
      : typeof rawPrice === 'string' && rawPrice.trim() !== '' && !Number.isNaN(Number(rawPrice))
      ? Number(rawPrice)
      : null;
  const title = product.title?.trim() || 'Sản phẩm';
  return (
    <a
      href={`/san-pham/${product.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-2.5 rounded-lg border border-gold/20 bg-surface/60 p-2 transition-all hover:border-gold/50 hover:bg-surface-emerald"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-background">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={title}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted/40 text-xs">
            ?
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-xs font-medium text-text-base group-hover:text-gold">
          {title}
        </h4>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
          {product.material && <span>{product.material}</span>}
          {product.quality_tier && (
            <span className="rounded border border-gold/30 px-1 text-gold">
              {product.quality_tier}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="font-heading text-sm font-semibold text-gold">
            {parsedPrice !== null ? formatVND(parsedPrice) : 'Liên hệ'}
          </span>
          <ExternalLink className="h-3 w-3 text-text-muted/60 group-hover:text-gold" />
        </div>
      </div>
    </a>
  );
}
