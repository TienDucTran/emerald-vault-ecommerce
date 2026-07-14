'use client';

import { useState } from 'react';
import { MobileFilterBar } from './mobile-filter-bar';
import { MobileFilterDrawer } from './mobile-filter-drawer';
import { MobileSortSheet } from './mobile-sort-sheet';
import { MobileProductGrid } from './mobile-product-grid';
import type { Product } from '@/lib/types';

interface MobileProductsViewProps {
  products: Product[];
  totalAvailable: number;
  priceRange: { min: number; max: number };
  pageTitle: string;
  pageEyebrow: string;
  heroStory: string;
}

export function MobileProductsView({
  products,
  totalAvailable,
  priceRange,
  pageTitle,
  pageEyebrow,
  heroStory,
}: MobileProductsViewProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Section Header — theo Figma */}
      <section className="px-4 pt-6 pb-2">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          {pageEyebrow}
        </p>
        <h1 className="font-heading text-2xl font-semibold leading-tight text-gradient-gold">
          {pageTitle}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{heroStory}</p>
      </section>

      {/* Sticky filter bar */}
      <MobileFilterBar
        onOpenFilter={() => setFilterOpen(true)}
        onOpenSort={() => setSortOpen(true)}
        totalProducts={totalAvailable}
        displayedProducts={products.length}
      />

      {/* Product grid */}
      <MobileProductGrid products={products} />

      {/* Filter drawer */}
      <MobileFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        priceRange={priceRange}
      />

      {/* Sort sheet */}
      <MobileSortSheet open={sortOpen} onClose={() => setSortOpen(false)} />
    </div>
  );
}