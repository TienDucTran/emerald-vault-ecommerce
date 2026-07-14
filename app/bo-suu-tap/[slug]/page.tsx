import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MOCK_COLLECTIONS, MOCK_PRODUCTS } from '@/lib/mock-data';
import { ProductGrid } from '@/components/product/product-grid';

interface Props {
  params: { slug: string };
}

export default function CollectionDetailPage({ params }: Props) {
  const collection = MOCK_COLLECTIONS.find((c) => c.slug === params.slug);
  if (!collection) notFound();

  const products = MOCK_PRODUCTS.filter(
    (p) => p.collection_id === collection.id && p.status === 'AVAILABLE'
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <section className="relative mb-12 grid grid-cols-1 items-center gap-8 overflow-hidden rounded-lg border border-gold/20 bg-surface p-8 lg:grid-cols-2 lg:p-12">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
            ✦ BỘ SƯU TẬP
          </p>
          <h1 className="mb-4 font-heading text-4xl font-bold sm:text-5xl">
            <span className="text-gradient-gold">{collection.name}</span>
          </h1>
          {collection.description && (
            <p className="text-base leading-relaxed text-text-muted">{collection.description}</p>
          )}
          <p className="mt-6 text-sm text-text-muted">
            <strong className="text-text-base">{products.length}</strong> sản phẩm đang có
          </p>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gold/20">
          {collection.cover_image_url && (
            <Image
              src={collection.cover_image_url}
              alt={collection.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          )}
        </div>
      </section>

      <ProductGrid products={products} columns={4} />
    </div>
  );
}
