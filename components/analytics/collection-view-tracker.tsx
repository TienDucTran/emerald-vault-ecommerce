'use client';

/**
 * CollectionViewTracker — invisible client component fire GA4
 * `view_collection` khi user mount trang /bo-suu-tap/[slug].
 *
 * Tương tự `RecentlyViewedTracker`: return null, chỉ side-effect.
 * Mount ngay trong server component của page collection.
 */

import { useEffect } from 'react';
import { useJewelryAnalytics } from '@/hooks/use-jewelry-analytics';

export interface CollectionViewTrackerProps {
  collection: { id: string; name: string; slug: string };
  productCount: number;
}

export function CollectionViewTracker({
  collection,
  productCount,
}: CollectionViewTrackerProps) {
  const analytics = useJewelryAnalytics();

  useEffect(() => {
    analytics.viewCollection({ collection, productCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.id, productCount]);

  return null;
}
