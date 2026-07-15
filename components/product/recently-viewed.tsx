import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';

interface RecentlyViewedProps {
  products: Product[];
  currentId: string;
}

export function RecentlyViewed({ products, currentId }: RecentlyViewedProps) {
  // Exclude current product, limit to 6
  const items = products.filter((p) => p.id !== currentId).slice(0, 6);

  if (items.length === 0) return null;

  return (
    <section className="pt-12 opacity-60">
      <h2
        className="mb-6 font-heading text-xl uppercase tracking-widest text-text-base motion-safe:animate-fadeInUp"
        style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
      >
        SẢN PHẨM VỪA XEM
      </h2>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {items.map((product, i) => (
          <Link
            key={product.id}
            href={`/san-pham/${product.slug}`}
            className="group relative aspect-square w-32 shrink-0 overflow-hidden rounded-sm border border-gold/15 bg-surface-emerald transition-all duration-300 motion-safe:animate-fadeInUp hover:-translate-y-1 hover:border-gold/40 hover:shadow-card-hover sm:w-40"
            style={{ animationDelay: `${(i % 8) * 60}ms`, animationFillMode: 'backwards' }}
          >
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="160px"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}