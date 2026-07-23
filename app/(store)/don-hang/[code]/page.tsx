'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
  BadgeCheck,
  CreditCard,
  Truck,
  Lock,
  MapPin,
  Phone,
  Mail,
  Receipt,
  Search,
  Package,
  Clock,
} from 'lucide-react';
import { formatVND } from '@/lib/utils';
import { useJewelryAnalytics } from '@/hooks/use-jewelry-analytics';
import {
  getOrderStatusMeta,
  getOrderStatusPill,
  getPaymentStatusMeta,
  getPaymentMethodLabel,
  ORDER_STATUS_TONE_BADGE,
  toneToDotBg,
  type OrderStatus,
} from '@/lib/order/status';
import type {
  OrderRow,
  OrderItemRow,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/supabase/types';

interface OrderItem {
  id: string;
  product_id: string;
  price: number;
  snapshot_title: string;
  snapshot_image: string;
  snapshot_material?: string | null;
  product?: { id: string; slug: string; title: string; image_url: string } | null;
}

interface OrderDetail {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_address?: string | null;
  province?: string | null;
  district?: string | null;
  notes?: string | null;
  total_amount: number;
  shipping_fee: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

export default function OrderLookupPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const code = decodeURIComponent(params.code);
  const analytics = useJewelryAnalytics();

  const initialPhone = searchParams.get('phone') ?? '';
  const [phone, setPhone] = useState(initialPhone);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const purchaseFiredRef = useRef(false);

  async function lookup(p: string) {
    if (!p.trim()) {
      setError('Vui lòng nhập số điện thoại để xác minh đơn hàng.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(code)}?phone=${encodeURIComponent(p)}`
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError('Không tìm thấy đơn hàng. Vui lòng kiểm tra mã và số điện thoại.');
        return;
      }
      const next = json.order as OrderDetail;
      setOrder(next);
      if (!purchaseFiredRef.current && next.payment_status === 'PAID') {
        purchaseFiredRef.current = true;
        const orderRow = {
          ...next,
          payment_method: next.payment_method as PaymentMethod,
          payment_status: next.payment_status as PaymentStatus,
          status: next.status as OrderStatus,
        } as unknown as OrderRow;
        const itemRows: OrderItemRow[] = (next.order_items ?? []).map((oi) => ({
          id: oi.id,
          order_id: next.id,
          product_id: oi.product_id,
          price: oi.price,
          snapshot_title: oi.snapshot_title,
          snapshot_image: oi.snapshot_image,
          snapshot_material: (oi.snapshot_material ?? null) as OrderItemRow['snapshot_material'],
        }));
        analytics.purchase({ order: orderRow, items: itemRows });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialPhone) lookup(initialPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusMeta = order ? getOrderStatusMeta(order.status) : null;
  const paymentMeta = order ? getPaymentStatusMeta(order.payment_status) : null;
  const methodLabel = order ? getPaymentMethodLabel(order.payment_method) : '';
  const StatusIcon = statusMeta?.icon ?? Package;

  const dateLabel = order
    ? new Date(order.created_at).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/don-hang"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-gold"
        >
          <ChevronLeft className="h-3 w-3" />
          Tra cứu đơn khác
        </Link>
      </div>

      {!order && (
        <div className="flex flex-col gap-6">
          <header>
            <h1 className="font-heading text-4xl font-bold text-gradient-gold md:text-5xl">
              Tra cứu đơn hàng
            </h1>
            <p className="mt-2 font-sans text-sm text-text-muted">
              Mã đơn: <span className="font-mono text-text-base">{code}</span>
            </p>
          </header>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup(phone);
            }}
            className="mx-auto max-w-md border border-gold/20 bg-surface p-6"
          >
            <label className="mb-2 block font-heading text-[10px] tracking-[0.15em] uppercase text-gold">
              Số điện thoại đặt hàng
            </label>
            <div className="flex flex-col gap-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901 234 567"
                className="w-full rounded border border-gold/30 bg-background px-3 py-2.5 text-base text-text-base placeholder:text-text-disabled focus:border-gold focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded bg-gradient-gold py-3 font-heading text-[11px] tracking-[0.15em] text-background hover:shadow-gold-glow disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                Tra cứu
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-error" role="alert">
                {error}
              </p>
            )}
            <p className="mt-4 text-xs text-text-disabled">
              Nhập đúng SĐT bạn đã dùng khi đặt đơn để xem chi tiết.
            </p>
          </form>
        </div>
      )}

      {order && statusMeta && (
        <div className="flex flex-col gap-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 font-heading text-[10px] tracking-[0.2em] text-text-muted">
            <Link href="/don-hang" className="uppercase hover:text-gold">
              Tra cứu
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
                <StatusIcon className="h-3 w-3" />
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
                    <p className="whitespace-nowrap font-sans text-[22px] font-semibold tracking-[0.05em] text-gold">
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
                    TRẠNG THÁI ĐƠN
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-heading text-[10px] tracking-[0.15em] ${getOrderStatusPill(order.status)}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>
                <div>
                  <p className="mb-1 font-heading text-[10px] tracking-[0.15em] text-text-muted">
                    TRẠNG THÁI
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${toneToDotBg(paymentMeta?.tone)}`} />
                    <p className={`font-sans ${paymentMeta?.textColor ?? 'text-text-muted'}`}>
                      {paymentMeta?.label ?? order.payment_status}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                  <Clock className="h-3.5 w-3.5" />
                  Cập nhật: {new Date(order.updated_at).toLocaleString('vi-VN')}
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

          {/* Bank-transfer banner */}
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
                href={`/don-hang/${order.code}/thanh-toan?phone=${encodeURIComponent(phone)}`}
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
              <div className="flex flex-col gap-3 pt-6 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 border border-gold/40 py-3 font-heading text-[11px] tracking-[0.15em] text-gold-champagne transition-all hover:bg-gold/5"
                >
                  THEO DÕI HÀNH TRÌNH
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 bg-gradient-gold py-3 font-heading text-[11px] tracking-[0.15em] text-background shadow-gold-glow transition-shadow hover:shadow-gold-glow-lg"
                >
                  <Receipt className="h-4 w-4" />
                  TẢI HÓA ĐƠN
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
