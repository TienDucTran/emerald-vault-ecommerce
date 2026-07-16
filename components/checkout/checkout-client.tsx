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

export function CheckoutClient({ item }: CheckoutClientProps) {
  const [payment, setPayment] = useState<PaymentOption>('MOMO');
  const analytics = useJewelryAnalytics();
  // Fire begin_checkout đúng 1 lần khi displayItem sẵn sàng.
  const beginFiredRef = useRef(false);

  const activeCartItem = useCartStore((s) =>
    s.items.find((i) => Date.now() < i.expiresAt)
  );

  const displayItem = activeCartItem
    ? toCheckoutItem(activeCartItem)
    : item;

  // GA4: begin_checkout — fire 1 lần khi user vào trang thanh toán.
  useEffect(() => {
    if (beginFiredRef.current) return;
    beginFiredRef.current = true;
    analytics.beginCheckout({
      product: {
        id: displayItem.id,
        title: displayItem.title,
        category: displayItem.category,
        material: displayItem.material,
        quality_tier: displayItem.tier,
        price: displayItem.price,
      },
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
      <CheckoutForm payment={payment} onPaymentChange={setPayment} />
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CheckoutSummary item={displayItem} payment={payment} />
      </div>
    </>
  );
}
