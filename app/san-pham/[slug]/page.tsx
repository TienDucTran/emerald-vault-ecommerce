import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Clock, Truck, ArrowRight, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getProductBySlug, MOCK_PRODUCTS } from '@/lib/mock-data';
import { formatVND, MATERIAL_LABELS, TIER_DESCRIPTIONS, CATEGORY_LABELS } from '@/lib/utils';
import { ProductGrid } from '@/components/product/product-grid';

interface Props {
  params: { slug: string };
}

export default function ProductDetailPage({ params }: Props) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  const related = MOCK_PRODUCTS
    .filter((p) => p.id !== product.id && p.status === 'AVAILABLE' && p.category === product.category)
    .slice(0, 4);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-text-muted">
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

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
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
            <div className="grid grid-cols-4 gap-3">
              {product.gallery.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-md border border-gold/20"
                >
                  <Image src={img} alt="" fill sizes="120px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 flex items-center gap-2">
            <Badge tier={product.quality_tier}>Tier {product.quality_tier}</Badge>
            {product.is_featured && <Badge variant="gold">Nổi bật</Badge>}
          </div>

          <h1 className="mb-2 font-heading text-3xl font-bold leading-tight sm:text-4xl">
            {product.title}
          </h1>

          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-text-muted">
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

          <p className="mb-6 font-heading text-4xl font-bold text-gradient-gold">
            {formatVND(product.price)}
          </p>

          {product.description && (
            <p className="mb-6 leading-relaxed text-text-base">{product.description}</p>
          )}

          {/* Tier description */}
          <div className="mb-6 rounded-md border border-gold/20 bg-surface-emerald p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              Về tier {product.quality_tier}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {TIER_DESCRIPTIONS[product.quality_tier]}
            </p>
          </div>

          {/* CTA */}
          {product.status === 'AVAILABLE' ? (
            <Button size="lg" className="w-full text-base" variant="primary">
              <Clock className="h-4 w-4" />
              Giữ hàng 10 phút
            </Button>
          ) : (
            <Button size="lg" className="w-full" variant="dark" disabled>
              Đã được sưu tầm
            </Button>
          )}

          {/* Trust micro-icons */}
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-gold/10 pt-6 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="h-5 w-5 text-gold" />
              <span className="text-xs text-text-muted">Đã thẩm định</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Truck className="h-5 w-5 text-gold" />
              <span className="text-xs text-text-muted">Freeship 2tr+</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Clock className="h-5 w-5 text-gold" />
              <span className="text-xs text-text-muted">Đổi trả 7 ngày</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-6 font-heading text-2xl font-bold">
            <span className="text-text-base">Có thể bạn </span>
            <span className="text-gradient-gold">cũng thích</span>
          </h2>
          <ProductGrid products={related} columns={4} />
        </section>
      )}
    </div>
  );
}
