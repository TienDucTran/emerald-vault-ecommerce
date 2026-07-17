import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { ProductGrid } from '@/components/product/product-grid';
import { FilterSidebar } from '@/components/product/filter-sidebar';
import { SortDropdown } from '@/components/product/sort-dropdown';
import { ActiveFilters } from '@/components/product/active-filters';
import { MobileProductsView } from '@/components/product/mobile/mobile-products-view';
import { CATEGORY_LABELS, MATERIAL_LABELS } from '@/lib/utils';
import { getFilterCounts, searchProducts, type FilterCounts } from '@/lib/supabase/queries/products';
import { getPublishedCollections } from '@/lib/supabase/queries/collections';
import { toCollection, toProduct } from '@/lib/adapters/supabase-to-app';
import { safeList, safeSearch } from '@/lib/data/safe-fetch';
import { DataWarning } from '@/components/layout/data-warning';
import type { ProductCategory, Material, QualityTier } from '@/lib/types';

// Trang này gọi createClient() (cookies) → bắt buộc dynamic.
// (xem https://nextjs.org/docs/messages/dynamic-server-error)
export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY'] as const;
const VALID_MATERIALS = ['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG'] as const;
const VALID_TIERS = ['SSS', 'SS', 'S'] as const;
const VALID_SORTS = ['newest', 'price-asc', 'price-desc', 'featured'] as const;
type ValidSort = 'newest' | 'price-asc' | 'price-desc' | 'featured';

interface Props {
  searchParams: {
    keyword?: string;
    category?: string;
    material?: string;
    tier?: string;
    sort?: string;
    min?: string;
    max?: string;
    available?: string;
  };
}

function getPageTitle(searchParams: Props['searchParams']): { eyebrow: string; title: string } {
  const { keyword, category, material, tier } = searchParams;
  const trimmedKeyword = keyword?.trim();
  const validCategory = VALID_CATEGORIES.includes(category as any) ? (category as typeof VALID_CATEGORIES[number]) : undefined;
  const validMaterial = VALID_MATERIALS.includes(material as any) ? (material as typeof VALID_MATERIALS[number]) : undefined;
  const validTier = VALID_TIERS.includes(tier as any) ? (tier as typeof VALID_TIERS[number]) : undefined;
  if (trimmedKeyword) {
    return {
      eyebrow: '✦ TÌM KIẾM',
      title: `Kết quả tìm kiếm cho "${trimmedKeyword}"`,
    };
  }
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
  const { keyword, category, material, tier } = searchParams;
  const trimmedKeyword = keyword?.trim();
  const validCategory = VALID_CATEGORIES.includes(category as any) ? (category as typeof VALID_CATEGORIES[number]) : undefined;
  const validMaterial = VALID_MATERIALS.includes(material as any) ? (material as typeof VALID_MATERIALS[number]) : undefined;
  const validTier = VALID_TIERS.includes(tier as any) ? (tier as typeof VALID_TIERS[number]) : undefined;
  if (trimmedKeyword) {
    return `Các sản phẩm phù hợp với từ khóa "${trimmedKeyword}".`;
  }
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

function mapSort(sort: string | undefined): 'newest' | 'price_asc' | 'price_desc' | 'featured' {
  const v = VALID_SORTS.includes(sort as any) ? (sort as ValidSort) : 'newest';
  if (v === 'price-asc') return 'price_asc';
  if (v === 'price-desc') return 'price_desc';
  if (v === 'featured') return 'featured';
  return 'newest';
}

export default async function ProductsPage({ searchParams }: Props) {
  const category = VALID_CATEGORIES.includes(searchParams.category as any)
    ? (searchParams.category as ProductCategory)
    : undefined;
  const material = VALID_MATERIALS.includes(searchParams.material as any)
    ? (searchParams.material as Material)
    : undefined;
  const tier = VALID_TIERS.includes(searchParams.tier as any)
    ? (searchParams.tier as QualityTier)
    : undefined;

  const minPrice = searchParams.min ? Number(searchParams.min) : undefined;
  const maxPrice = searchParams.max ? Number(searchParams.max) : undefined;
  const trimmedKeyword = searchParams.keyword?.trim() || undefined;

  const sort = mapSort(searchParams.sort);
  const onlyAvailable = searchParams.available !== '0';

  // Lấy products theo filter hiện tại + tổng available (không filter) để tính count
  const [filteredRes, allRes, allRes2, collectionsRes] = await Promise.all([
    safeSearch(() => searchProducts({
      ...(trimmedKeyword ? { keyword: trimmedKeyword } : {}),
      category,
      material,
      tier,
      minPrice: Number.isFinite(minPrice) && (minPrice as number) >= 0 ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) && (maxPrice as number) >= 0 ? maxPrice : undefined,
      sort,
      onlyAvailable,
      page: 1,
      pageSize: 100,
    })),
    safeSearch(() => searchProducts({ onlyAvailable: true, sort: 'newest', page: 1, pageSize: 100 })),
    onlyAvailable
      ? Promise.resolve({ data: { data: [], total: 0 }, error: null })
      : safeSearch(() => searchProducts({ onlyAvailable: false, sort: 'newest', page: 1, pageSize: 100 })),
    safeList(() => getPublishedCollections()),
  ]);

  // Filter counts (badge (N) bên cạnh mỗi option) — chạy song song ở trên là không cần thiết
  // vì nó đã thuộc 1 query riêng. Để đơn giản và an toàn, dùng try/catch trực tiếp.
  let filterCounts: FilterCounts | null = null;
  try {
    filterCounts = await getFilterCounts({ onlyAvailable });
  } catch (e) {
    console.error('[products] getFilterCounts failed:', e);
  }

  const products = filteredRes.data.data.map(toProduct);
  const allProducts = allRes.data.data.map(toProduct);
  const filteredTotal = filteredRes.data.total;
  const availableTotal = allRes.data.total;
  const grandTotal = onlyAvailable ? availableTotal : (allRes2.data.total || availableTotal);

  // Featured collections để quick-jump khi không filter
  const publishedCollections = collectionsRes.data.map(toCollection);
  const featuredCollections = publishedCollections.slice(0, 3);
  const errorMsg = filteredRes.error ?? allRes.error ?? collectionsRes.error;

  // Price range (toàn bộ available, để filter sidebar có min/max chuẩn)
  const prices = allProducts.map((p) => p.price);
  const priceRange = {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
  };

  const activeCount = [
    trimmedKeyword,
    category,
    material,
    tier,
    minPrice !== undefined && minPrice > 0 ? minPrice : undefined,
    maxPrice !== undefined && maxPrice > 0 ? maxPrice : undefined,
  ].filter(Boolean).length;

  const pageMeta = getPageTitle(searchParams);
  const heroStory = getHeroStory(searchParams);

  return (
    <>
      <DataWarning message={errorMsg} />
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
            {trimmedKeyword && (
              <div className="mt-3">
                <Link
                  href="/san-pham"
                  scroll={false}
                  className="inline-flex items-center gap-1 text-xs text-text-muted underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  <X className="h-3 w-3" />
                  Xóa tìm kiếm
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Main: sidebar + grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
            {/* Sidebar */}
            <div className="hidden lg:block">
              <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
                <FilterSidebar priceRange={priceRange} activeCount={activeCount} counts={filterCounts} />
              </Suspense>
            </div>

            {/* Main content */}
            <div>
              {/* Toolbar: count + sort */}
              <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-text-muted">
                  Hiển thị{' '}
                  <strong className="text-text-base">
                    {filteredTotal}/{grandTotal}
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
        totalAvailable={grandTotal}
        priceRange={priceRange}
        pageTitle={pageMeta.title}
        pageEyebrow={pageMeta.eyebrow}
        heroStory={heroStory}
      />
    </>
  );
}
