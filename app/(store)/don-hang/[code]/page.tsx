'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Search, Package, Clock, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import { useJewelryAnalytics } from '@/hooks/use-jewelry-analytics';
import type {
  OrderRow,
  OrderItemRow,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
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

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Package }> = {
  NEW: { label: 'Mới tạo', color: 'text-blue-400', icon: Package },
  CONFIRMED: { label: 'Đã xác nhận', color: 'text-gold', icon: CheckCircle2 },
  SHIPPING: { label: 'Đang giao', color: 'text-amber-400', icon: Truck },
  DONE: { label: 'Hoàn tất', color: 'text-green-400', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy', color: 'text-red-400', icon: XCircle },
};

const PAYMENT_STATUS_MAP: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export default function OrderLookupPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = decodeURIComponent(params.code);
  const analytics = useJewelryAnalytics();

  // Nếu URL có sẵn ?phone=... thì auto-fetch
  const initialPhone = searchParams.get('phone') ?? '';
  const [phone, setPhone] = useState(initialPhone);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tránh fire purchase 2 lần (MoMo redirect có thể trùng với direct reload).
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
      // GA4: purchase — chỉ fire 1 lần / mount, chỉ khi đã PAID.
      if (!purchaseFiredRef.current && next.payment_status === 'PAID') {
        purchaseFiredRef.current = true;
        // Cast an toàn: API trả về đúng shape, chỉ là type narrow.
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

  const st = order ? STATUS_MAP[order.status] : null;
  const StIcon = st?.icon ?? Package;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="mb-6 inline-block text-xs text-text-muted hover:text-gold">
        ← Trang chủ
      </Link>

      <h1 className="mb-2 font-heading text-3xl font-bold text-gold">
        Tra cứu đơn hàng
      </h1>
      <p className="mb-8 text-sm text-text-muted">
        Mã đơn: <span className="font-mono text-text-base">{code}</span>
      </p>

      {!order && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(phone);
          }}
          className="mx-auto max-w-md rounded-lg border border-gold/20 bg-surface p-6"
        >
          <label className="mb-2 block font-heading text-xs uppercase tracking-wider text-gold">
            Số điện thoại đặt hàng
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901 234 567"
              className="flex-1 rounded border border-gold/30 bg-background px-3 py-2.5 text-base text-text-base placeholder:text-text-disabled focus:border-gold focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded bg-gold px-5 py-2.5 text-sm font-semibold text-background hover:bg-gold-champagne disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Tra cứu
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <p className="mt-4 text-xs text-text-disabled">
            Nhập đúng SĐT bạn đã dùng khi đặt đơn để xem chi tiết.
          </p>
        </form>
      )}

      {order && st && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {/* Items */}
            {order.order_items.map((it) => (
              <div
                key={it.id}
                className="flex gap-4 rounded-lg border border-gold/20 bg-surface p-4"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-surface-emerald">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.snapshot_image} alt={it.snapshot_title} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <h3 className="font-heading text-lg font-semibold text-text-base">
                    {it.snapshot_title}
                  </h3>
                  <span className="font-sans text-lg text-gold">
                    {formatVND(it.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            {/* Status */}
            <div className="rounded-lg border border-gold/20 bg-surface p-5">
              <h2 className="mb-3 font-heading text-sm uppercase tracking-wider text-text-muted">
                Trạng thái đơn
              </h2>
              <div className={`flex items-center gap-2 ${st.color}`}>
                <StIcon className="h-5 w-5" />
                <span className="font-heading text-lg font-semibold">{st.label}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                <Clock className="h-4 w-4" />
                Cập nhật: {new Date(order.updated_at).toLocaleString('vi-VN')}
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-lg border border-gold/20 bg-surface p-5">
              <h2 className="mb-3 font-heading text-sm uppercase tracking-wider text-text-muted">
                Thanh toán
              </h2>
              <div className="flex items-center justify-between text-sm">
                <span>Phương thức</span>
                <span className="font-semibold text-text-base">
                  {order.payment_method === 'MOMO' ? 'Ví MoMo'
                    : order.payment_method === 'COD' ? 'COD'
                    : 'Chuyển khoản'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Trạng thái</span>
                <span
                  className={`font-semibold ${
                    order.payment_status === 'PAID' ? 'text-green-400'
                    : order.payment_status === 'FAILED' ? 'text-red-400'
                    : 'text-amber-400'
                  }`}
                >
                  {PAYMENT_STATUS_MAP[order.payment_status] ?? order.payment_status}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="rounded-lg border border-gold/20 bg-surface p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Tạm tính</span>
                <span>{formatVND(order.total_amount - order.shipping_fee)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-text-muted">Phí vận chuyển</span>
                <span>{order.shipping_fee === 0 ? 'Miễn phí' : formatVND(order.shipping_fee)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gold/10 pt-3">
                <span className="font-heading text-sm font-bold uppercase">Tổng cộng</span>
                <span className="font-heading text-2xl font-bold text-gold">
                  {formatVND(order.total_amount)}
                </span>
              </div>
            </div>

            {/* Customer */}
            <div className="rounded-lg border border-gold/20 bg-surface p-5 text-sm">
              <h2 className="mb-3 font-heading text-sm uppercase tracking-wider text-text-muted">
                Giao hàng đến
              </h2>
              <p className="font-semibold text-text-base">{order.customer_name}</p>
              <p className="text-text-muted">{order.customer_phone}</p>
              {order.customer_email && <p className="text-text-muted">{order.customer_email}</p>}
              {order.customer_address && (
                <p className="mt-2 text-text-base">
                  {order.customer_address}
                  {order.district && `, ${order.district}`}
                  {order.province && `, ${order.province}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
