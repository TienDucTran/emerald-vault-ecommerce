'use client';

import { useEffect } from 'react';
import {
  useRecentlyViewed,
  type RecentlyViewedItemInput,
} from '@/hooks/use-recently-viewed';
import { useJewelryAnalytics } from '@/hooks/use-jewelry-analytics';
import type { ProductCategory, Material, QualityTier } from '@/lib/supabase/types';

interface RecentlyViewedTrackerProps {
  product: RecentlyViewedItemInput & {
    /** Cần cho GA4 view_item payload. */
    category: ProductCategory;
    material: Material;
    quality_tier: QualityTier;
  };
}

/**
 * Mount component này (vô hình) trên PDP để:
 *  1. Ghi nhận lượt xem vào localStorage (recently viewed).
 *  2. Fire GA4 `view_item` event.
 *
 * Không render UI, chỉ side-effect.
 */
export function RecentlyViewedTracker({ product }: RecentlyViewedTrackerProps) {
  const { addView } = useRecentlyViewed();
  const analytics = useJewelryAnalytics();

  useEffect(() => {
    addView(product);
    analytics.viewItem({
      product: {
        id: product.id,
        title: product.title,
        category: product.category,
        material: product.material,
        quality_tier: product.quality_tier,
        price: product.price,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
