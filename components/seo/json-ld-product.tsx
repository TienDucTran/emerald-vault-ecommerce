import { CATEGORY_LABELS, MATERIAL_LABELS, TIER_LABELS } from '@/lib/utils';
import type { ProductStatus } from '@/lib/supabase/types';

export interface ProductJsonLdProps {
  product: {
    title: string;
    description?: string | null;
    slug: string;
    image_url: string;
    gallery?: string[] | null;
    price: number;
    status?: ProductStatus | string;
    material?: string;
    quality_tier?: string;
    category?: string;
    code?: string | null;
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function toAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

export function JsonLdProduct({ product }: ProductJsonLdProps) {
  const images = [product.image_url, ...(product.gallery ?? [])]
    .filter(Boolean)
    .map(toAbsoluteUrl);

  const availability =
    product.status === 'SOLD_OUT' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';

  const productUrl = `${SITE_URL}/san-pham/${product.slug}`;
  const categoryLabel = product.category ? CATEGORY_LABELS[product.category] ?? product.category : undefined;
  const materialLabel = product.material ? MATERIAL_LABELS[product.material] ?? product.material : undefined;
  const tierLabel = product.quality_tier ? TIER_LABELS[product.quality_tier] ?? product.quality_tier : undefined;

  const keywords = [categoryLabel, materialLabel, tierLabel].filter(Boolean) as string[];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? product.title,
    image: images,
    sku: product.code ?? product.slug,
    mpn: product.slug,
    brand: {
      '@type': 'Brand',
      name: 'Emerald Vault',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      price: product.price,
      priceCurrency: 'VND',
      availability,
      seller: {
        '@type': 'Organization',
        name: 'Emerald Vault',
      },
    },
    ...(keywords.length > 0 ? { keywords } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
