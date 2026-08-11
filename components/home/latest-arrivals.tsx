import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductGrid } from '@/components/product/product-grid';
import type { Product } from '@/lib/types';

interface LatestArrivalsProps {
  products: Product[];
}

export function LatestArrivals({ products }: LatestArrivalsProps) {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8 xl:px-10">
        <div
          className="mb-10 flex flex-col items-start justify-between gap-3 motion-safe:animate-fadeInUp md:flex-row md:items-end"
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.3em] text-gold sm:text-xs">
              ✦ SI MỚI VỀ
            </p>
            <h2 className="font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
              <span className="text-text-base">Món mới nhất </span>
              <span className="text-gradient-gold">trong tuần</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-text-muted">
              Mỗi tuần chúng tôi tuyển chọn những món đồ mới. Số lượng giới hạn, không bao giờ quay lại.
            </p>
          </div>
          <Link
            href="/san-pham?sort=newest"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-gold transition-colors hover:text-gold-champagne motion-safe:animate-fadeInUp"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            Xem tất cả
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <ProductGrid products={products} columns={4} />
      </div>
    </section>
  );
}
