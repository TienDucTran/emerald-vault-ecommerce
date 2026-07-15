import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';
import type { Product } from '@/lib/types';

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

const colsMap = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
};

export function ProductGrid({ products, columns = 4, className }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-emerald bg-surface/50 py-20 text-center">
        <p className="text-text-muted">Chưa có sản phẩm nào trong bộ sưu tập này.</p>
        <p className="mt-2 text-sm text-text-disabled">
          Hãy quay lại sau — chúng tôi đang tuyển chọn những món mới.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-5', colsMap[columns], className)}>
      {products.map((product, i) => (
        <div
          key={product.id}
          className="motion-safe:animate-fadeInUp"
          style={{ animationDelay: `${(i % 12) * 60}ms`, animationFillMode: 'backwards' }}
        >
          <ProductCard product={product} priority={i < 4} />
        </div>
      ))}
    </div>
  );
}
