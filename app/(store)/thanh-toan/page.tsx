import { ShieldCheck, Clock, Truck, Lock, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { CheckoutClient } from '@/components/checkout/checkout-client';
import { getNewestProducts } from '@/lib/supabase/queries/products';
import { toProduct } from '@/lib/adapters/supabase-to-app';
import { safeList } from '@/lib/data/safe-fetch';
import { DataWarning } from '@/components/layout/data-warning';
import { getBankConfig } from '@/lib/bank/config';
import { getCurrentUser } from '@/lib/auth/require-customer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Thanh Toán',
  description: 'Hoàn tất đơn hàng của bạn tại Emerald Vault.',
};

export default async function CheckoutPage() {
  // Auth check: nếu user login là admin → hiện fallback page giải thích
  // (KHÔNG redirect /403 vì UX kém — admin đang có intent mua, cần giải thích rõ)
  const currentUser = await getCurrentUser();
  if (currentUser && currentUser.role === 'admin') {
    return <AdminCheckoutBlocked />;
  }

  const bankCfg = getBankConfig();
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
    category: checkoutProduct.category,
    material: checkoutProduct.material,
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
          <CheckoutClient item={CHECKOUT_ITEM} isBankConfigured={bankCfg.isConfigured} />
        </div>
      </div>

      {/* Trust strip */}
      <CheckoutTrustStrip />
    </div>
  );
}

/**
 * Fallback page khi admin truy cập /thanh-toan.
 * Giải thích rõ lý do + đưa ra action hợp lý (về admin hoặc đăng xuất).
 */
function AdminCheckoutBlocked() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="mx-auto max-w-xl">
          <div className="flex flex-col items-center gap-6 rounded-lg border border-gold/30 bg-surface-emerald/40 p-10 text-center backdrop-blur-sm">
            <div className="grid h-16 w-16 place-items-center rounded-full border border-warning/40 bg-warning/10 text-warning">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-bold tracking-[0.05em] text-gold uppercase">
                Tài khoản quản trị viên
              </h1>
              <p className="text-sm text-text-base/80">
                Tài khoản admin không thể đặt hàng qua kênh khách hàng.
              </p>
            </div>

            <div className="w-full space-y-3 rounded-md border border-gold/15 bg-surface/40 p-5 text-left text-xs text-text-muted/80">
              <p className="font-heading tracking-[0.1em] text-text-base/90 uppercase">
                Lý do
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  Đơn hàng sẽ bị &ldquo;mồ côi&rdquo; — admin không thể xem lại trong{' '}
                  <span className="text-text-base/90">/tai-khoan/don-hang</span> vì
                  khu vực này chỉ dành cho customer.
                </li>
                <li>
                  RLS policy phân quyền giữa admin và customer là khác nhau, đơn
                  tạo từ admin sẽ không hiển thị trong bất kỳ dashboard nào.
                </li>
                <li>
                  Để test đơn hàng, vui lòng dùng tài khoản customer (đăng ký
                  email mới) hoặc đăng xuất admin trước.
                </li>
              </ul>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-md border border-gold/30 bg-gold/10 px-5 py-2.5 text-xs font-heading tracking-[0.1em] uppercase text-gold transition-colors hover:bg-gold/20"
              >
                Về Admin Panel
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-text-muted/20 px-5 py-2.5 text-xs font-heading tracking-[0.1em] uppercase text-text-muted transition-colors hover:bg-surface-emerald/40"
              >
                Về trang chủ
              </Link>
            </div>

            <p className="text-[10px] text-text-muted/50">
              Cần đăng xuất admin?{' '}
              <Link
                href="/tai-khoan/dang-xuat"
                className="text-text-base/70 underline-offset-2 hover:text-gold hover:underline"
              >
                Đăng xuất
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
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
