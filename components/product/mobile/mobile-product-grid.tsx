'use client';

import { ProductCardMobile } from '@/components/home/mobile/mobile-product-card';
import type { Product } from '@/lib/types';

interface MobileProductGridProps {
  products: Product[];
}

export function MobileProductGrid({ products }: MobileProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gold/20 bg-surface/50 py-16 text-center">
        <p className="text-text-muted">Chưa có sản phẩm nào phù hợp.</p>
        <p className="mt-2 text-sm text-text-disabled">
          Hãy thử bỏ bớt bộ lọc hoặc quay lại sau.
        </p>
      </div>
    );
  }

  return (
    <section className="px-4 py-5">
      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <ProductCardMobile
            key={product.id}
            product={{
              id: product.id,
              title: product.title,
              slug: product.slug,
              image_url: product.image_url,
              price: product.price,
              status: product.status,
              quality_tier: product.quality_tier,
              era: product.era,
              material: product.material,
            }}
          />
        ))}
      </div>

      {/* Load More / Infinite Scroll Signal — theo Figma */}
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="h-8 w-8 rounded-full border-2 border-t-gold border-gold/20 animate-spin" />
        <p className="font-heading text-xs uppercase tracking-[0.15em] text-text-muted">
          Khám phá thêm di sản...
        </p>
      </div>
    </section>
  );
}