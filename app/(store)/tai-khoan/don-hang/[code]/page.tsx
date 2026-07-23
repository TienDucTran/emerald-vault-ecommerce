// Trang chi tiết đơn hàng cho customer đã login.
// Server component — auth qua session, không cần nhập SĐT.
//
// UI: redesign theo Stitch (Emerald Vault Design System v2).
//   Breadcrumb → Header + status badges → Product cards → Info grid → Summary.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  BadgeCheck,
  CreditCard,
  Truck,
  Lock,
  MapPin,
  Phone,
  Mail,
  Package,
} from 'lucide-react';
import { requireCustomer } from '@/lib/auth/require-customer';
import { getOrderByCode } from '@/lib/supabase/queries/orders';
import { formatVND } from '@/lib/utils';
import {
  getOrderStatusMeta,
  getPaymentStatusMeta,
  getPaymentMethodLabel,
  ORDER_STATUS_TONE_BADGE,
  toneToDotBg,
} from '@/lib/order/status';
import { CustomerActionButtons } from './customer-action-buttons';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { code: string };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Đơn hàng ${decodeURIComponent(params.code)} - Emerald Vault`,
  };
}

export default async function CustomerOrderDetailPage({ params }: PageProps) {
  const code = decodeURIComponent(params.code);
  const { user } = await requireCustomer();

  let order;
  try {
    order = await getOrderByCode(code);
  } catch (err) {
    console.error('[customer-order-detail] fetch error:', err);
    return (
      <div className="py-20 text-center text-error">
        Không tải được đơn hàng. Vui lòng thử lại.
      </div>
    );
  }

  if (!order || order.customer_id !== user.id) {
    notFound();
  }

  const statusMeta = getOrderStatusMeta(order.status);
  const paymentMeta = getPaymentStatusMeta(order.payment_status);
  const methodLabel = getPaymentMethodLabel(order.payment_method);
  const createdDate = new Date(order.created_at);
  const dateLabel = createdDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-heading text-[10px] tracking-[0.2em] text-text-muted">
        <Link href="/tai-khoan/don-hang" className="uppercase hover:text-gold">
          Đơn hàng
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gold">{order.code}</span>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-4xl font-bold text-gradient-gold md:text-5xl">
            Chi tiết đơn hàng
          </h1>
          <p className="mt-2 font-sans text-sm text-text-muted">
            Ngày đặt: {dateLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-heading text-[10px] tracking-[0.15em] ${ORDER_STATUS_TONE_BADGE[statusMeta.tone]}`}
          >
            {statusMeta.label}
          </span>
          {order.status === 'WAITING_PAYMENT' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-surface-emerald px-3 py-1 font-heading text-[10px] tracking-[0.15em] text-gold">
              <Lock className="h-3 w-3" />
              10-MIN HOLD ACTIVE
            </span>
          )}
        </div>
      </header>

      {/* Product cards */}
      <section className="flex flex-col gap-4">
        {order.order_items.map((it) => (
          <article
            key={it.id}
            className="flex flex-col overflow-hidden border border-gold/10 bg-surface transition-all hover:border-gold/20 hover:shadow-card sm:flex-row"
          >
            <div className="relative h-48 w-full shrink-0 overflow-hidden bg-background sm:h-auto sm:w-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.snapshot_image}
                alt={it.snapshot_title}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-heading text-lg text-gold-champagne">
                    {it.snapshot_title}
                  </h3>
                  {it.snapshot_material && (
                    <p className="mt-1 font-sans text-sm italic text-text-muted">
                      Chất liệu: {it.snapshot_material.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                <p className="whitespace-nowrap font-sans text-[22px] tracking-[0.05em] font-semibold text-gold">
                  {formatVND(it.price)}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1 text-success">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Kiểm định chất lượng
                </span>
                <span className="inline-flex items-center gap-1 text-text-muted">
                  <Package className="h-3.5 w-3.5" />
                  Số lượng: 01
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Info grid: Payment + Shipping */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* THANH TOÁN */}
        <div className="border border-gold/10 bg-surface-emerald p-6">
          <div className="mb-6 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-gold" />
            <h2 className="font-heading text-xs tracking-[0.15em] text-gold-champagne">
              THANH TOÁN
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 font-heading text-[10px] tracking-[0.15em] text-text-muted">
                PHƯƠNG THỨC
              </p>
              <p className="font-sans text-text-base">{methodLabel}</p>
            </div>
            <div>
              <p className="mb-1 font-heading text-[10px] tracking-[0.15em] text-text-muted">
                TRẠNG THÁI
              </p>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${toneToDotBg(paymentMeta.tone)}`} />
                <p className={`font-sans ${paymentMeta.textColor}`}>{paymentMeta.label}</p>
              </div>
            </div>
          </div>
        </div>

        {/* THÔNG TIN GIAO NHẬN */}
        <div className="border border-gold/10 bg-surface-emerald p-6 md:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <Truck className="h-5 w-5 text-gold" />
            <h2 className="font-heading text-xs tracking-[0.15em] text-gold-champagne">
              THÔNG TIN GIAO NHẬN
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-y-6 gap-x-8 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-heading text-[10px] tracking-[0.15em] text-text-muted">
                NGƯỜI NHẬN
              </p>
              <p className="font-sans text-text-base">{order.customer_name}</p>
              {order.customer_phone && (
                <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-sm text-text-muted">
                  <Phone className="h-3.5 w-3.5" />
                  {order.customer_phone}
                </p>
              )}
              {order.customer_email && (
                <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-sm text-text-muted">
                  <Mail className="h-3.5 w-3.5" />
                  {order.customer_email}
                </p>
              )}
            </div>
            <div>
              <p className="mb-2 font-heading text-[10px] tracking-[0.15em] text-text-muted">
                ĐỊA CHỈ CHI TIẾT
              </p>
              {order.customer_address && (
                <p className="inline-flex items-start gap-1.5 font-sans leading-relaxed text-text-base">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span>
                    {order.customer_address}
                    {order.district && `, ${order.district}`}
                    {order.province && `, ${order.province}`}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bank-transfer banner — only show for WAITING_PAYMENT */}
      {order.payment_method === 'BANK_TRANSFER' && order.status === 'WAITING_PAYMENT' && (
        <div className="flex flex-col items-start justify-between gap-3 border border-gold/30 bg-gold/5 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-heading text-base font-semibold text-text-base">
              Đơn hàng chờ thanh toán
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Vui lòng quét QR hoặc CK theo thông tin bên dưới.
            </p>
          </div>
          <Link
            href={`/don-hang/${order.code}/thanh-toan`}
            className="inline-flex items-center gap-2 rounded bg-gold px-4 py-2 font-heading text-xs tracking-[0.1em] text-background transition-colors hover:bg-gold-champagne"
          >
            Thanh toán ngay
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Order Summary */}
      <section className="border-t-2 border-gold/30 bg-surface-emerald p-8">
        <div className="ml-auto max-w-md space-y-4">
          <div className="flex items-center justify-between font-sans text-text-muted">
            <span>Tạm tính</span>
            <span>{formatVND(order.total_amount - order.shipping_fee)}</span>
          </div>
          <div className="flex items-center justify-between font-sans text-text-muted">
            <span>Phí vận chuyển (Bảo hiểm 100%)</span>
            <span className="text-success">
              {order.shipping_fee === 0 ? 'Miễn phí' : formatVND(order.shipping_fee)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-gold/30 pt-4">
            <span className="font-heading text-sm tracking-[0.1em] text-gold">
              TỔNG CỘNG
            </span>
            <span className="font-sans text-3xl font-bold tracking-[0.05em] text-gold">
              {formatVND(order.total_amount)}
            </span>
          </div>

          {/* Tất cả action buttons (THEO DÕI / TẢI HÓA ĐƠN / HỦY / HOÀN TIỀN)
              đều được quản lý tập trung trong component này theo status đơn. */}
          <CustomerActionButtons
            orderCode={order.code}
            status={order.status}
            paymentStatus={order.payment_status}
          />
        </div>
      </section>
    </div>
  );
}
