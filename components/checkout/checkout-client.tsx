'use client';

import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/lib/store/cart';
import { useJewelryAnalytics } from '@/hooks/use-jewelry-analytics';
import type {
  ProductCategory,
  Material,
  QualityTier,
} from '@/lib/supabase/types';
import { CheckoutForm, type PaymentOption } from './checkout-form';
import { CheckoutSummary } from './checkout-summary';

export interface CheckoutItem {
  id: string;
  title: string;
  code?: string;
  tier: QualityTier;
  /** Cần cho GA4 begin_checkout / add_payment_info items[]. */
  category: ProductCategory;
  material: Material;
  price: number;
  image: string;
}

interface CheckoutClientProps {
  item: CheckoutItem;
  isBankConfigured: boolean;
}

function toCheckoutItem(cartItem: {
  product: {
    id: string;
    title: string;
    code?: string;
    quality_tier: QualityTier;
    category: ProductCategory;
    material: Material;
    price: number;
    image_url: string;
  };
}): CheckoutItem {
  return {
    id: cartItem.product.id,
    title: cartItem.product.title,
    code: cartItem.product.code,
    tier: cartItem.product.quality_tier,
    category: cartItem.product.category,
    material: cartItem.product.material,
    price: cartItem.product.price,
    image: cartItem.product.image_url,
  };
}

export function CheckoutClient({ item, isBankConfigured }: CheckoutClientProps) {
  const [payment, setPayment] = useState<PaymentOption>('MOMO');
  const analytics = useJewelryAnalytics();
  // Fire begin_checkout đúng 1 lần khi displayItem sẵn sàng.
  const beginFiredRef = useRef(false);

  // Tick mỗi giây để `minExpiresAt` + `itemCount` được recompute theo thời gian thực
  // (cart store chỉ emit khi items[] thay đổi, không tick theo đồng hồ).
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeItems = useCartStore((s) =>
    s.items.filter((i) => Date.now() < i.expiresAt)
  );
  const itemCount = activeItems.length;
  const minExpiresAt =
    activeItems.length > 0
      ? Math.min(...activeItems.map((i) => i.expiresAt))
      : null;

  const allCheckoutItems: CheckoutItem[] =
    activeItems.length > 0
      ? activeItems.map(toCheckoutItem)
      : [item];
  const displayItem = allCheckoutItems[0];

  // GA4: begin_checkout — fire 1 lần khi user vào trang thanh toán.
  useEffect(() => {
    if (beginFiredRef.current) return;
    beginFiredRef.current = true;
    analytics.beginCheckout({
      products: allCheckoutItems.map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        material: i.material,
        quality_tier: i.tier,
        price: i.price,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GA4: add_payment_info — fire mỗi khi user đổi payment method.
  useEffect(() => {
    analytics.addPaymentInfo({
      product: {
        id: displayItem.id,
        title: displayItem.title,
        category: displayItem.category,
        material: displayItem.material,
        quality_tier: displayItem.tier,
        price: displayItem.price,
      },
      paymentMethod: payment,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment]);

  return (
    <>
      <CheckoutForm
        payment={payment}
        onPaymentChange={setPayment}
        isBankConfigured={isBankConfigured}
      />
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CheckoutSummary
          item={displayItem}
          items={allCheckoutItems}
          payment={payment}
          minExpiresAt={minExpiresAt}
          itemCount={itemCount}
        />
      </div>
    </>
  );
}
