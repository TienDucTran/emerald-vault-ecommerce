import { ShieldCheck, Clock, Truck, Lock } from 'lucide-react';
import { CheckoutClient } from '@/components/checkout/checkout-client';
import { MOCK_PRODUCTS } from '@/lib/mock-data';

export const metadata = {
  title: 'Thanh Toán',
  description: 'Hoàn tất đơn hàng của bạn tại Emerald Vault.',
};

// FIX: C5 — lấy data thật từ mock thay vì hard-code
const checkoutProduct =
  MOCK_PRODUCTS.find((p) => p.id === 'p11') ?? MOCK_PRODUCTS[0];

const CHECKOUT_ITEM = {
  id: checkoutProduct.id,
  title: checkoutProduct.title,
  // FIX: C5 — code là optional, fallback undefined nếu product không có
  code: checkoutProduct.code,
  tier: checkoutProduct.quality_tier,
  price: checkoutProduct.price,
  image: checkoutProduct.image_url,
};

export default function CheckoutPage() {
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
          {/* FIX: B-3.6 — dùng CheckoutClient wrapper để Form + Summary share state */}
          <CheckoutClient item={CHECKOUT_ITEM} />
        </div>
      </div>

      {/* Trust strip */}
      <CheckoutTrustStrip />
    </div>
  );
}

/* — Trust strip (inline, styled per Figma) — */
const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'AUTHENTIC PIECES' },
  // FIX: L2 — đánh dấu mock mode cho user biết
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
