import { ShieldCheck, Clock, Truck, Lock } from 'lucide-react';
import { CheckoutClient } from '@/components/checkout/checkout-client';
import { getNewestProducts } from '@/lib/supabase/queries/products';
import { toProduct } from '@/lib/adapters/supabase-to-app';
import { safeList } from '@/lib/data/safe-fetch';
import { DataWarning } from '@/components/layout/data-warning';

export const metadata = {
  title: 'Thanh Toán',
  description: 'Hoàn tất đơn hàng của bạn tại Emerald Vault.',
};

export default async function CheckoutPage() {
  const res = await safeList(() => getNewestProducts(1));
  const products = res.data.map(toProduct);
  const checkoutProduct = products[0];

  if (!checkoutProduct) {
    return (
      <div className="container mx-auto px-4 py-20">
        <DataWarning message={res.error} />
        <p className="text-center font-heading text-2xl text-gold">
          Chưa có sản phẩm khả dụng để thanh toán.
        </p>
      </div>
    );
  }

  const CHECKOUT_ITEM = {
    id: checkoutProduct.id,
    title: checkoutProduct.title,
    code: checkoutProduct.code,
    tier: checkoutProduct.quality_tier,
    price: checkoutProduct.price,
    image: checkoutProduct.image_url,
  };

  return (
    <div className="relative min-h-screen">
      {/* Page heading */}
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-5xl font-bold tracking-tight text-gold">
            Thanh Toán
          </h1>
          {/* Gold divider — 96px underline */}
          <div className="h-px w-24 bg-gold/30" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="container mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_480px]">
          <CheckoutClient item={CHECKOUT_ITEM} />
        </div>
      </div>

      {/* Trust strip */}
      <CheckoutTrustStrip />
    </div>
  );
}

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'AUTHENTIC PIECES' },
  { icon: Clock, label: '10-MIN HOLD PRIVILEGE — DEMO MODE' },
  { icon: Truck, label: 'INSURED GLOBAL SHIPPING' },
  { icon: Lock, label: 'SECURE VAULT STORAGE' },
];

function CheckoutTrustStrip() {
  return (
    <section className="border-y border-gold/10 bg-surface-emerald/40 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-8">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-gold/30 bg-surface text-gold">
                <item.icon className="h-5 w-5" />
              </div>
              <span className="font-heading text-xs font-medium tracking-wider text-text-muted">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
