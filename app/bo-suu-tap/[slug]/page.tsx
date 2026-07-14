import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getCollectionBySlug, getPublishedCollections } from '@/lib/supabase/queries/collections';
import { getProductsByCollection } from '@/lib/supabase/queries/products';
import { toCollection, toProduct } from '@/lib/adapters/supabase-to-app';
import { safeList, safeOne } from '@/lib/data/safe-fetch';
import { DataWarning } from '@/components/layout/data-warning';
import { ProductGrid } from '@/components/product/product-grid';

interface Props {
  params: { slug: string };
}

export default async function CollectionDetailPage({ params }: Props) {
  // Ưu tiên lấy full row từ DB; nếu null thì fallback sang published list
  const rowRes = await safeOne(() => getCollectionBySlug(params.slug));
  let row = rowRes.data;
  let collectionError = rowRes.error;

  if (!row) {
    const listRes = await safeList(() => getPublishedCollections());
    collectionError = collectionError ?? listRes.error;
    row = (listRes.data.find((c) => c.slug === params.slug) ?? null) as any;
  }

  if (!row) notFound();

  const collection = toCollection(row);
  const productsRes = await safeList(() => getProductsByCollection(collection.id));
  const products = productsRes.data.map(toProduct);
  const errorMsg = collectionError ?? productsRes.error;

  return (
    <div className="container mx-auto px-4 py-8">
      <DataWarning message={errorMsg} />
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
