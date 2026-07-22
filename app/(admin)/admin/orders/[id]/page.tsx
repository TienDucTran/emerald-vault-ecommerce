import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, Circle, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusUpdateDialog } from '@/components/admin/orders/status-update-dialog';
import { BankPaymentActions } from '@/components/admin/orders/bank-payment-actions';
import { requireAdmin } from '@/lib/auth/require-admin';
import { formatVND, MATERIAL_LABELS } from '@/lib/utils';
import { getBankByCode } from '@/lib/bank/types';
import type {
  Material,
  OrderRow,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface OrderItemWithProduct {
  id: string;
  order_id: string;
  product_id: string;
  price: number;
  snapshot_title: string;
  snapshot_image: string;
  snapshot_material: Material | null;
  product: { id: string; slug: string } | null;
}

interface BankTransferRow {
  id: string;
  order_id: string;
  qr_image_url: string;
  bank_code: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  amount: number;
  transfer_content: string;
  qr_expires_at: string | null;
  user_confirmed_at: string | null;
  bill_image_url: string | null;
  bill_uploaded_at: string | null;
  admin_confirmed_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'Mới',
  WAITING_PAYMENT: 'Chờ thanh toán',
  WAITING_CONFIRM: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DONE: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, { label: string; icon: string }> = {
  MOMO: { label: 'MoMo', icon: 'M' },
  COD: { label: 'COD', icon: 'C' },
  BANK_TRANSFER: { label: 'Chuyển khoản', icon: 'B' },
};

const ORDER_STATUS_BADGE: Record<OrderStatus, 'default' | 'outline' | 'gold' | 'success' | 'sold-out'> = {
  NEW: 'outline',
  WAITING_PAYMENT: 'outline',
  WAITING_CONFIRM: 'gold',
  CONFIRMED: 'default',
  SHIPPING: 'default',
  DONE: 'gold',
  CANCELLED: 'sold-out',
};

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, 'default' | 'outline' | 'gold' | 'success' | 'sold-out'> = {
  PENDING: 'outline',
  PAID: 'success',
  FAILED: 'sold-out',
  REFUNDED: 'gold',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!params.id) notFound();

  const { adminClient } = await requireAdmin();

  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .single<OrderRow>();

  if (orderErr || !order) {
    notFound();
  }

  const { data: itemsRaw, error: itemsErr } = await adminClient
    .from('order_items')
    .select(
      'id, order_id, product_id, price, snapshot_title, snapshot_image, snapshot_material, product:products!order_items_product_id_fkey(id, slug)'
    )
    .eq('order_id', params.id);

  if (itemsErr) {
    console.error('[admin/orders/:id page] items error:', itemsErr);
  }

  const items: OrderItemWithProduct[] = (itemsRaw ?? []).map((row) => {
    const r = row as unknown as OrderItemWithProduct;
    return {
      id: r.id,
      order_id: r.order_id,
      product_id: r.product_id,
      price: r.price,
      snapshot_title: r.snapshot_title,
      snapshot_image: r.snapshot_image,
      snapshot_material: r.snapshot_material,
      product: r.product ?? null,
    };
  });

  let bankTransfer: BankTransferRow | null = null;
  if (order.payment_method === 'BANK_TRANSFER') {
    const { data: btRaw, error: btErr } = await (adminClient as any)
      .from('bank_transfers')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();
    if (btErr) {
      console.error('[admin/orders/:id page] bank_transfers error:', btErr);
    } else if (btRaw) {
      bankTransfer = btRaw as BankTransferRow;
    }
  }

  const subtotal = order.total_amount - order.shipping_fee;
  const pmInfo = PAYMENT_METHOD_LABEL[order.payment_method];
  const fullAddress = [order.customer_address, order.district, order.province]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center h-9 w-9 rounded border border-[#4D4635]/40 text-gold/70 hover:text-gold hover:border-gold/40 transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-3xl font-bold text-gold tracking-tight">
                {order.code}
              </h1>
              <Badge variant={ORDER_STATUS_BADGE[order.status]}>
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
            </div>
            <p className="text-xs text-[#D0C5AF]/50 mt-1">
              Tạo lúc {formatDate(order.created_at)} · Cập nhật {formatDate(order.updated_at)}
            </p>
          </div>
        </div>
        <StatusUpdateDialog
          orderId={order.id}
          currentStatus={order.status}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Khách hàng */}
        <section
          className="lg:col-span-1 p-5 rounded-sm space-y-4"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <h2 className="font-heading text-xs tracking-[0.15em] uppercase text-gold/80 border-b border-[#4D4635]/40 pb-2">
            Khách hàng
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">Họ tên</p>
              <p className="text-sm text-[#EAE1D4] mt-0.5">{order.customer_name}</p>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-3.5 w-3.5 mt-0.5 text-gold/60" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">Số điện thoại</p>
                <a
                  href={`tel:${order.customer_phone}`}
                  className="text-sm text-gold hover:text-gold/80 transition-colors"
                >
                  {order.customer_phone}
                </a>
              </div>
            </div>
            {order.customer_email && (
              <div className="flex items-start gap-2">
                <Mail className="h-3.5 w-3.5 mt-0.5 text-gold/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">Email</p>
                  <a
                    href={`mailto:${order.customer_email}`}
                    className="text-sm text-gold hover:text-gold/80 transition-colors break-all"
                  >
                    {order.customer_email}
                  </a>
                </div>
              </div>
            )}
            {fullAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-gold/60" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">Địa chỉ</p>
                  <p className="text-sm text-[#D0C5AF] mt-0.5">{fullAddress}</p>
                </div>
              </div>
            )}
            {order.notes && (
              <div className="pt-2 border-t border-[#4D4635]/30">
                <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">Ghi chú</p>
                <p className="text-sm text-[#D0C5AF]/80 mt-1 italic">{order.notes}</p>
              </div>
            )}
          </div>
        </section>

        {/* Thanh toán */}
        <section
          className="lg:col-span-2 p-5 rounded-sm space-y-4"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <h2 className="font-heading text-xs tracking-[0.15em] uppercase text-gold/80 border-b border-[#4D4635]/40 pb-2">
            Thanh toán
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
                Phương thức
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gold/15 text-gold text-[10px] font-bold">
                  {pmInfo.icon}
                </span>
                <span className="text-sm text-[#EAE1D4]">{pmInfo.label}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
                Trạng thái TT
              </p>
              <div className="mt-1">
                <Badge variant={PAYMENT_STATUS_BADGE[order.payment_status]}>
                  {PAYMENT_STATUS_LABEL[order.payment_status]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-t border-[#4D4635]/30 pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#D0C5AF]/60">Tạm tính</span>
              <span className="text-[#D0C5AF]">{formatVND(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#D0C5AF]/60 inline-flex items-center gap-1.5">
                <Truck className="h-3 w-3" /> Phí vận chuyển
              </span>
              <span className="text-[#D0C5AF]">{formatVND(order.shipping_fee)}</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-gold/20">
              <span className="font-heading text-sm tracking-wider uppercase text-gold/80">
                Tổng cộng
              </span>
              <span className="font-heading text-2xl font-bold text-gold">
                {formatVND(order.total_amount)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Thanh toán ngân hàng (chỉ khi BANK_TRANSFER) */}
      {order.payment_method === 'BANK_TRANSFER' && bankTransfer && (
        <BankPaymentCard
          bankTransfer={bankTransfer}
          orderId={order.id}
          currentStatus={order.status}
        />
      )}

      {/* Sản phẩm */}
      <section
        className="p-5 rounded-sm space-y-4"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <div className="flex items-center justify-between border-b border-[#4D4635]/40 pb-2">
          <h2 className="font-heading text-xs tracking-[0.15em] uppercase text-gold/80">
            Sản phẩm ({items.length})
          </h2>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-[#D0C5AF]/40 py-6 text-center">
            Đơn hàng chưa có sản phẩm.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <article
                key={it.id}
                className="flex gap-3 p-3 rounded-sm border border-[#4D4635]/30 hover:border-gold/30 transition-colors"
                style={{ background: 'rgba(31,27,19,0.4)' }}
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-[#4D4635]/40 bg-[#1F1B13]">
                  {it.snapshot_image ? (
                    <Image
                      src={it.snapshot_image}
                      alt={it.snapshot_title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#D0C5AF]/30 text-xs">
                      ◆
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 flex flex-col">
                  {it.product?.slug ? (
                    <Link
                      href={`/san-pham/${it.product.slug}`}
                      className="text-sm text-[#EAE1D4] hover:text-gold transition-colors line-clamp-2"
                    >
                      {it.snapshot_title}
                    </Link>
                  ) : (
                    <p className="text-sm text-[#EAE1D4] line-clamp-2">
                      {it.snapshot_title}
                    </p>
                  )}
                  {it.snapshot_material && (
                    <div className="mt-1">
                      <span className="inline-block text-[10px] uppercase tracking-wider text-gold/70 border border-gold/30 rounded px-1.5 py-0.5">
                        {MATERIAL_LABELS[it.snapshot_material] ?? it.snapshot_material}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-gold font-medium mt-auto pt-1">
                    {formatVND(it.price)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Hành động */}
      <div className="flex items-center justify-end gap-3">
        <Link href="/admin/orders">
          <Button type="button" variant="outline">
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    </div>
  );
}

function BankPaymentCard({
  bankTransfer,
  orderId,
  currentStatus,
}: {
  bankTransfer: BankTransferRow;
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const bank = getBankByCode(bankTransfer.bank_code);
  const isAlreadyConfirmed = Boolean(bankTransfer.admin_confirmed_at);
  const canAct =
    !isAlreadyConfirmed &&
    (currentStatus === 'WAITING_PAYMENT' || currentStatus === 'WAITING_CONFIRM');

  return (
    <section
      className="p-5 rounded-sm space-y-5"
      style={{
        background: 'rgba(18, 36, 28, 0.6)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(241, 229, 172, 0.1)',
      }}
    >
      <div className="flex items-center justify-between border-b border-[#4D4635]/40 pb-2">
        <h2 className="font-heading text-xs tracking-[0.15em] uppercase text-gold/80">
          Thanh toán ngân hàng
        </h2>
        {isAlreadyConfirmed ? (
          <Badge variant="success">Đã xác nhận</Badge>
        ) : canAct ? (
          <Badge variant="gold">Đang chờ xác nhận</Badge>
        ) : (
          <Badge variant="outline">Đã đóng</Badge>
        )}
      </div>

      {/* Grid 2 cột: label / value */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Phương thức
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-[#EAE1D4]">Chuyển khoản ngân hàng</span>
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border border-gold/30 text-gold bg-gold/5">
              {bank?.name ?? bankTransfer.bank_code}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Số tài khoản
          </p>
          <p className="text-sm text-[#EAE1D4] font-mono mt-1">
            {bankTransfer.account_number}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Chủ tài khoản
          </p>
          <p className="text-sm text-[#EAE1D4] mt-1">
            {bankTransfer.account_name}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Số tiền CK
          </p>
          <p className="text-sm font-heading font-bold text-gold mt-1">
            {formatVND(Number(bankTransfer.amount))}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Nội dung CK
          </p>
          <p className="text-sm text-gold font-bold font-mono mt-1 break-all">
            {bankTransfer.transfer_content}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="pt-2">
        <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40 mb-3">
          Tiến trình
        </p>
        <ol className="relative space-y-3 pl-6 border-l border-[#4D4635]/40">
          <TimelineStep
            done
            label="QR đã tạo"
            timestamp={bankTransfer.created_at}
          />
          <TimelineStep
            done={Boolean(bankTransfer.user_confirmed_at)}
            label="User báo đã CK"
            timestamp={bankTransfer.user_confirmed_at}
          />
          <TimelineStep
            done={Boolean(bankTransfer.admin_confirmed_at)}
            label="Admin xác nhận"
            timestamp={bankTransfer.admin_confirmed_at}
          />
        </ol>
      </div>

      {/* Bill upload */}
      {bankTransfer.bill_image_url && (
        <div className="pt-2">
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40 mb-2">
            Bill chuyển khoản từ khách
          </p>
          <div className="flex items-start gap-3">
            <a
              href={bankTransfer.bill_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative h-[200px] w-[200px] shrink-0 rounded-sm border border-[#4D4635]/40 overflow-hidden hover:border-gold/60 transition-colors"
              style={{ background: 'rgba(31,27,19,0.4)' }}
              title="Click để xem full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bankTransfer.bill_image_url}
                alt="Bill CK"
                className="h-full w-full object-contain"
              />
            </a>
            <div className="text-xs text-[#D0C5AF]/60 space-y-1">
              <p>Click ảnh để mở full size.</p>
              {bankTransfer.bill_uploaded_at && (
                <p>
                  Upload lúc:{' '}
                  <span className="text-[#D0C5AF]">
                    {formatDate(bankTransfer.bill_uploaded_at)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin note nếu đã confirm */}
      {isAlreadyConfirmed && bankTransfer.admin_note && (
        <div
          className="p-3 rounded-sm border border-success/30 text-sm"
          style={{ background: 'rgba(34,197,94,0.05)' }}
        >
          <p className="text-[10px] uppercase tracking-wider text-success/80 mb-1">
            Ghi chú admin
          </p>
          <p className="text-[#EAE1D4] italic">&ldquo;{bankTransfer.admin_note}&rdquo;</p>
        </div>
      )}

      {/* Nút hành động */}
      {canAct ? (
        <BankPaymentActions orderId={orderId} amount={Number(bankTransfer.amount)} />
      ) : null}
    </section>
  );
}

function TimelineStep({
  done,
  label,
  timestamp,
}: {
  done: boolean;
  label: string;
  timestamp: string | null;
}) {
  return (
    <li className="relative">
      <span
        className={
          'absolute -left-[33px] top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border ' +
          (done
            ? 'border-gold bg-gold/20 text-gold'
            : 'border-[#4D4635] bg-[#1F1B13] text-[#D0C5AF]/40')
        }
        aria-hidden
      >
        {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      </span>
      <p
        className={
          'text-sm ' + (done ? 'text-[#EAE1D4]' : 'text-[#D0C5AF]/50')
        }
      >
        {label}
      </p>
      {timestamp ? (
        <p className="text-[10px] text-[#D0C5AF]/50 mt-0.5">{formatDate(timestamp)}</p>
      ) : (
        <p className="text-[10px] text-[#D0C5AF]/30 mt-0.5 italic">Chưa xảy ra</p>
      )}
    </li>
  );
}
