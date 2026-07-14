'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/store/cart';
import { CheckoutForm, type PaymentOption } from './checkout-form';
import { CheckoutSummary } from './checkout-summary';

export interface CheckoutItem {
  id: string;
  title: string;
  code?: string;
  tier: 'SSS' | 'SS' | 'S';
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
    quality_tier: 'SSS' | 'SS' | 'S';
    price: number;
    image_url: string;
  };
}): CheckoutItem {
  return {
    id: cartItem.product.id,
    title: cartItem.product.title,
    code: cartItem.product.code,
    tier: cartItem.product.quality_tier,
    price: cartItem.product.price,
    image: cartItem.product.image_url,
  };
}

export function CheckoutClient({ item }: CheckoutClientProps) {
  const [payment, setPayment] = useState<PaymentOption>('MOMO');

  const activeCartItem = useCartStore((s) =>
    s.items.find((i) => Date.now() < i.expiresAt)
  );

  const displayItem = activeCartItem
    ? toCheckoutItem(activeCartItem)
    : item;

  return (
    <>
      <CheckoutForm payment={payment} onPaymentChange={setPayment} />
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CheckoutSummary item={displayItem} payment={payment} />
      </div>
    </>
  );
}
