import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronRight } from 'lucide-react';
import { ProductGrid } from '@/components/product/product-grid';
import { FilterSidebar } from '@/components/product/filter-sidebar';
import { SortDropdown } from '@/components/product/sort-dropdown';
import { ActiveFilters } from '@/components/product/active-filters';
import { MobileProductsView } from '@/components/product/mobile/mobile-products-view';
import { MOCK_PRODUCTS, MOCK_COLLECTIONS } from '@/lib/mock-data';
import { CATEGORY_LABELS, MATERIAL_LABELS } from '@/lib/utils';
import type { Product } from '@/lib/types';

// FIX: Whitelists for enum validation (Bug 1)
const VALID_CATEGORIES = ['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY'] as const;
const VALID_MATERIALS = ['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG'] as const;
const VALID_TIERS = ['SSS', 'SS', 'S'] as const;
const VALID_SORTS = ['newest', 'price-asc', 'price-desc', 'featured'] as const;

interface Props {
  searchParams: {
    category?: string;
    material?: string;
    tier?: string;
    sort?: string;
    min?: string;
    max?: string;
  };
}

function getPageTitle(searchParams: Props['searchParams']): { eyebrow: string; title: string } {
  const { category, material, tier } = searchParams;
  // FIX: Validate enum (Bug 1) + narrow tier type (Bug 5)
  const validCategory = VALID_CATEGORIES.includes(category as any) ? (category as typeof VALID_CATEGORIES[number]) : undefined;
  const validMaterial = VALID_MATERIALS.includes(material as any) ? (material as typeof VALID_MATERIALS[number]) : undefined;
  const validTier = VALID_TIERS.includes(tier as any) ? (tier as typeof VALID_TIERS[number]) : undefined;
  if (validCategory) {
    return {
      eyebrow: `DANH MỤC · ${validCategory}`,
      title: `${CATEGORY_LABELS[validCategory] ?? validCategory} si Nhật vintage`,
    };
  }
  if (validMaterial) {
    return {
      eyebrow: `CHẤT LIỆU · ${validMaterial}`,
      title: `Trang sức ${MATERIAL_LABELS[validMaterial] ?? validMaterial}`,
    };
  }
  if (validTier) {
    return {
      eyebrow: `TIER · ${validTier}`,
      title:
        validTier === 'SSS'
          ? 'Si Nhật mới nguyên seal'
          : validTier === 'SS'
            ? 'Si Nhật trên 95%'
            : 'Si Nhật trên 90%',
    };
  }
  return {
    eyebrow: '✦ TẤT CẢ SẢN PHẨM',
    title: 'Bộ sưu tập trang sức si Nhật',
  };
}

function getHeroStory(searchParams: Props['searchParams']) {
  const { category, material, tier } = searchParams;
  // FIX: Use validated enums (Bug 1, Bug 5)
  const validCategory = VALID_CATEGORIES.includes(category as any) ? (category as typeof VALID_CATEGORIES[number]) : undefined;
  const validMaterial = VALID_MATERIALS.includes(material as any) ? (material as typeof VALID_MATERIALS[number]) : undefined;
  const validTier = VALID_TIERS.includes(tier as any) ? (tier as typeof VALID_TIERS[number]) : undefined;
  if (validCategory) {
    return `Khám phá bộ sưu tập ${CATEGORY_LABELS[validCategory]?.toLowerCase() ?? validCategory} tuyển chọn từ các tiệm kim hoàn cổ điển Nhật Bản.`;
  }
  if (validMaterial) {
    return `Trang sức ${MATERIAL_LABELS[validMaterial] ?? validMaterial} — bền bỉ, tinh tế, đã qua thẩm định.`;
  }
  if (validTier === 'SSS') {
    return 'Những món hiếm có, còn nguyên seal và hộp. Dành cho nhà sưu tầm khó tính nhất.';
  }
  if (validTier === 'SS') {
    return 'Tình trạng trên 95%, gần như hoàn hảo — lựa chọn phổ biến nhất của chúng tôi.';
  }
  if (validTier === 'S') {
    return 'Trên 90% tình trạng — hoàn hảo để đeo hằng ngày hoặc làm quà tặng.';
  }
  return 'Tuyển chọn thủ công, mỗi món là một bản duy nhất, không bao giờ quay lại.';
}

function sortProducts(products: Product[], sort: string | undefined): Product[] {
  // FIX: Validate sort enum (Bug 1)
  const validSort = VALID_SORTS.includes(sort as any) ? (sort as typeof VALID_SORTS[number]) : 'newest';
  const arr = [...products];
  switch (validSort) {
    case 'price-asc':
      return arr.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return arr.sort((a, b) => b.price - a.price);
    case 'featured':
      return arr.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    case 'newest':
    default:
      return arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }
}

export default function ProductsPage({ searchParams }: Props) {
  let products = MOCK_PRODUCTS.filter((p) => p.status === 'AVAILABLE');
  const allAvailable = MOCK_PRODUCTS.filter((p) => p.status === 'AVAILABLE');

  // FIX: Validate enum inputs (Bug 1)
  const category = VALID_CATEGORIES.includes(searchParams.category as any)
    ? (searchParams.category as typeof VALID_CATEGORIES[number])
    : undefined;
  const material = VALID_MATERIALS.includes(searchParams.material as any)
    ? (searchParams.material as typeof VALID_MATERIALS[number])
    : undefined;
  const tier = VALID_TIERS.includes(searchParams.tier as any)
    ? (searchParams.tier as typeof VALID_TIERS[number])
    : undefined;

  // FIX: Safe number parsing for min/max (Bug 2)
  const minPrice = searchParams.min ? Number(searchParams.min) : undefined;
  const maxPrice = searchParams.max ? Number(searchParams.max) : undefined;

  // Filter
  if (category) products = products.filter((p) => p.category === category);
  if (material) products = products.filter((p) => p.material === material);
  if (tier) products = products.filter((p) => p.quality_tier === tier);
  if (minPrice !== undefined && Number.isFinite(minPrice) && minPrice >= 0) {
    products = products.filter((p) => p.price >= minPrice);
  }
  if (maxPrice !== undefined && Number.isFinite(maxPrice) && maxPrice >= 0) {
    products = products.filter((p) => p.price <= maxPrice);
  }

  // Sort
  products = sortProducts(products, searchParams.sort);

  // FIX: Active filter count — exclude "0" values (Bug 4)
  const activeCount = [
    category,
    material,
    tier,
    minPrice !== undefined && minPrice > 0 ? minPrice : undefined,
    maxPrice !== undefined && maxPrice > 0 ? maxPrice : undefined,
  ].filter(Boolean).length;

  const pageMeta = getPageTitle(searchParams);
  const heroStory = getHeroStory(searchParams);
  const priceRange = {
    min: Math.min(...allAvailable.map((p) => p.price)),
    max: Math.max(...allAvailable.map((p) => p.price)),
  };

  // Featured collections to surface when no filter active
  const featuredCollections = MOCK_COLLECTIONS.filter((c) => c.is_published).slice(0, 3);

  return (
    <>
      {/* ───────── Desktop (lg+) ───────── */}
      <div className="hidden lg:block">
        {/* Hero / Page header */}
        <section className="relative border-b border-gold/10 bg-gradient-to-b from-surface-emerald/40 to-background py-12">
          <div className="absolute inset-0 bg-noise opacity-30" />
          <div className="container relative mx-auto px-4">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-1.5 text-xs text-text-muted">
              <Link href="/" className="hover:text-gold">
                Trang chủ
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-text-base">Sản phẩm</span>
              {category && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-gold">{CATEGORY_LABELS[category]}</span>
                </>
              )}
            </nav>

            <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
              {pageMeta.eyebrow}
            </p>
            <h1 className="max-w-3xl font-heading text-3xl font-bold sm:text-4xl">
              <span className="text-gradient-gold">{pageMeta.title}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">{heroStory}</p>
          </div>
        </section>

        {/* Main: sidebar + grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
            {/* Sidebar */}
            <div className="hidden lg:block">
              <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
                <FilterSidebar priceRange={priceRange} activeCount={activeCount} />
              </Suspense>
            </div>

            {/* Main content */}
            <div>
              {/* Toolbar: count + sort */}
              <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-text-muted">
                  Hiển thị{' '}
                  <strong className="text-text-base">
                    {products.length}/{allAvailable.length}
                  </strong>{' '}
                  sản phẩm
                </p>
                <Suspense fallback={<div className="h-10 w-40 animate-pulse rounded-md bg-surface" />}>
                  <SortDropdown />
                </Suspense>
              </div>

              {/* Active filter chips */}
              <Suspense fallback={null}>
                <ActiveFilters />
              </Suspense>

              {/* Collection quick-jump (only when no filter) */}
              {!activeCount && (
                <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {featuredCollections.map((c) => (
                    <Link
                      key={c.id}
                      href={`/bo-suu-tap/${c.slug}`}
                      className="group rounded-md border border-gold/20 bg-surface p-3 transition-all hover:border-gold/50"
                    >
                      <p className="text-xs font-medium uppercase tracking-wider text-gold">
                        Bộ sưu tập
                      </p>
                      <p className="mt-1 font-heading text-sm text-text-base group-hover:text-gold">
                        {c.name}
                      </p>
                    </Link>
                  ))}
                </div>
              )}

              {/* Product grid */}
              <ProductGrid products={products} columns={4} />
            </div>
          </div>
        </div>
      </div>

      {/* ───────── Mobile (<lg) ───────── */}
      <MobileProductsView
        products={products}
        totalAvailable={allAvailable.length}
        priceRange={priceRange}
        pageTitle={pageMeta.title}
        pageEyebrow={pageMeta.eyebrow}
        heroStory={heroStory}
      />
    </>
  );
}
