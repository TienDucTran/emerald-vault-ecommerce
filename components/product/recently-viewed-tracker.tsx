'use client';

import { useEffect } from 'react';
import { useRecentlyViewed, type RecentlyViewedItemInput } from '@/hooks/use-recently-viewed';

interface RecentlyViewedTrackerProps {
  product: RecentlyViewedItemInput;
}

/**
 * Mount component này (vô hình) trên PDP để ghi nhận lượt xem vào localStorage.
 * Không render UI, chỉ side-effect.
 */
export function RecentlyViewedTracker({ product }: RecentlyViewedTrackerProps) {
  const { addView } = useRecentlyViewed();

  useEffect(() => {
    addView(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
