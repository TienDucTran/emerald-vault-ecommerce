import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, Clock, Truck, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatVND, MATERIAL_LABELS, TIER_DESCRIPTIONS, CATEGORY_LABELS } from '@/lib/utils';
import { ProductGrid } from '@/components/product/product-grid';
import { HoldButton } from '@/components/product/hold-button';
import { RecentlyViewedTracker } from '@/components/product/recently-viewed-tracker';
import { RecentlyViewedLocal } from '@/components/product/recently-viewed-local';
import { JsonLdProduct } from '@/components/seo/json-ld-product';
import { JsonLdBreadcrumb } from '@/components/seo/json-ld-breadcrumb';
import { getProductBySlug, getRelatedProducts } from '@/lib/supabase/queries/products';
import { toProduct } from '@/lib/adapters/supabase-to-app';
import { safeList, safeOne } from '@/lib/data/safe-fetch';
import { DataWarning } from '@/components/layout/data-warning';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await safeOne(() => getProductBySlug(params.slug));
  const product = result.data;
  if (!product) {
    return {
      title: 'Sản phẩm không tồn tại',
      description: 'Sản phẩm này đã được sưu tầm hoặc không tồn tại.',
    };
  }
  const title = product.meta_title || `${product.title} — ${MATERIAL_LABELS[product.material] ?? product.material}`;
  const description =
    product.meta_description || product.description || `${product.title} — trang sức si Nhật vintage tại Emerald Vault.`;
  const image = product.image_url?.startsWith('http')
    ? product.image_url
    : `${SITE_URL}${product.image_url}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/san-pham/${product.slug}`,
      siteName: 'Emerald Vault',
      locale: 'vi_VN',
      type: 'website',
      images: [{ url: image, alt: product.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const productRes = await safeOne(() => getProductBySlug(params.slug));

  if (productRes.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DataWarning message={productRes.error} />
        <div className="py-20 text-center">
          <p className="font-heading text-2xl text-gold">Không thể tải sản phẩm.</p>
          <p className="mt-2 text-sm text-text-muted">Vui lòng thử lại sau.</p>
        </div>
      </div>
    );
  }

  if (!productRes.data) notFound();

  const product = toProduct(productRes.data);
  const relatedRes = await safeList(() => getRelatedProducts(product.id, 4));
  const related = relatedRes.data.map(toProduct);
  const errorMsg = relatedRes.error;

  return (
    <div className="container mx-auto px-4 py-6">
      <DataWarning message={errorMsg} />
      <RecentlyViewedTracker
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          image_url: product.image_url,
          price: product.price,
          material: product.material,
          quality_tier: product.quality_tier,
          category: product.category,
        }}
      />
      <JsonLdProduct product={product} />
      <JsonLdBreadcrumb
        items={[
          { name: 'Trang chủ', href: '/' },
          { name: 'Sản phẩm', href: '/san-pham' },
          { name: product.title, href: `/san-pham/${product.slug}` },
        ]}
      />
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-text-muted">
        <Link href="/" className="hover:text-gold">Trang chủ</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/san-pham" className="hover:text-gold">Sản phẩm</Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href={`/san-pham?category=${product.category}`}
          className="hover:text-gold"
        >
          {CATEGORY_LABELS[product.category]}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-base">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-2">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-gold/20 bg-surface">
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            {product.status === 'SOLD_OUT' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <p className="font-heading text-3xl text-gold">Đã được sưu tầm</p>
              </div>
            )}
          </div>
          {product.gallery && product.gallery.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {product.gallery.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-md border border-gold/20"
                >
                  <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 flex items-center gap-2">
            <Badge tier={product.quality_tier}>Tier {product.quality_tier}</Badge>
            {product.is_featured && <Badge variant="gold">Nổi bật</Badge>}
          </div>

          <h1 className="mb-2 font-heading text-2xl font-bold leading-tight sm:text-3xl">
            {product.title}
          </h1>

          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span>{MATERIAL_LABELS[product.material]}</span>
            <span>·</span>
            <span>{CATEGORY_LABELS[product.category]}</span>
            {product.season_tags.length > 0 && (
              <>
                <span>·</span>
                <span className="text-gold">{product.season_tags.join(', ')}</span>
              </>
            )}
          </div>

          <p className="mb-4 font-heading text-2xl font-bold text-gradient-gold">
            {formatVND(product.price)}
          </p>

          {product.description && (
            <p className="mb-4 text-sm leading-relaxed text-text-base">{product.description}</p>
          )}

          {/* Tier description */}
          <div className="mb-4 rounded-md border border-gold/20 bg-surface-emerald p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              Về tier {product.quality_tier}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {TIER_DESCRIPTIONS[product.quality_tier]}
            </p>
          </div>

          {/* CTA */}
          {product.status === 'AVAILABLE' ? (
            <HoldButton product={product} size="md" className="w-full" />
          ) : (
            <Button size="md" className="w-full" variant="dark" disabled>
              Đã được sưu tầm
            </Button>
          )}

          {/* Trust micro-icons */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gold/10 pt-4 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-gold" />
              <span className="text-xs text-text-muted">Đã thẩm định</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Truck className="h-4 w-4 text-gold" />
              <span className="text-xs text-text-muted">Freeship 2tr+</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Clock className="h-4 w-4 text-gold" />
              <span className="text-xs text-text-muted">Đổi trả 7 ngày</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-heading text-xl font-bold">
            <span className="text-text-base">Có thể bạn </span>
            <span className="text-gradient-gold">cũng thích</span>
          </h2>
          <ProductGrid products={related} columns={4} />
        </section>
      )}

      {/* Recently viewed (localStorage) */}
      <RecentlyViewedLocal excludeId={product.id} />
    </div>
  );
}
