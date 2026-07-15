'use client';

import Link from 'next/link';
import { Eye, RefreshCcw, Search, Truck, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatVND } from '@/lib/utils';
import type { CustomerOrderListItem } from '@/lib/supabase/queries/orders';

const STATUS_PILL: Record<
  string,
  { label: string; className: string }
> = {
  NEW: {
    label: 'MỚI',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  CONFIRMED: {
    label: 'ĐÃ XÁC NHẬN',
    className: 'bg-gold/15 text-gold border-gold/30',
  },
  SHIPPING: {
    label: 'ĐANG GIAO',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  DONE: {
    label: 'HOÀN TẤT',
    className: 'bg-success/15 text-success border-success/30',
  },
  CANCELLED: {
    label: 'ĐÃ HỦY',
    className: 'bg-error/15 text-error border-error/30',
  },
};

export function OrderCard({ order }: { order: CustomerOrderListItem }) {
  const pill = STATUS_PILL[order.status] ?? STATUS_PILL.NEW;
  const isCancelled = order.status === 'CANCELLED';
  const isShipped = order.status === 'SHIPPING';
  const isDone = order.status === 'DONE';
  const isNew = order.status === 'NEW' || order.status === 'CONFIRMED';

  return (
    <div className="rounded-lg border border-gold/20 bg-surface p-5 transition-colors hover:border-gold/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={`/tai-khoan/don-hang/${order.code}`}
            className="font-mono text-sm font-semibold text-gold transition-colors hover:text-gold-champagne"
          >
            ORDER #{order.code}
          </Link>
          <p className="text-xs text-text-muted">
            Đặt ngày: {formatDate(order.createdAt)}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center self-start rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider sm:self-auto',
            pill.className
          )}
        >
          {pill.label}
        </span>
      </div>

      <div className="my-4 h-px bg-gold/10" />

      <div className="flex gap-4">
        <Link
          href={`/tai-khoan/don-hang/${order.code}`}
          className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gold/10 bg-surface-emerald"
        >
          {order.thumbnailUrl ? (
            <img
              src={order.thumbnailUrl}
              alt="Sản phẩm trong đơn hàng"
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-text-muted/60">
              No image
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3
              className={cn(
                'font-heading text-lg font-semibold leading-tight',
                isCancelled ? 'text-text-muted line-through' : 'text-text-base'
              )}
            >
              {order.itemCount > 1
                ? `${order.itemCount} sản phẩm`
                : order.itemCount === 1
                ? '1 sản phẩm'
                : 'Đơn hàng'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
              <span>
                Mã đơn: <span className="text-text-base">{order.code}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span
              className={cn(
                'font-heading text-2xl font-bold',
                isCancelled ? 'text-text-disabled' : 'text-gold'
              )}
            >
              {formatVND(order.totalAmount)}
            </span>
            {order.paymentStatus === 'PAID' && !isCancelled && (
              <span className="text-[11px] uppercase tracking-wider text-success">
                ✓ Đã thanh toán
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-gold/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-muted">
          Tổng cộng: <span className="text-text-base">{order.itemCount}</span>{' '}
          sản phẩm
          {order.paymentStatus === 'PENDING' && (
            <span className="ml-2 rounded border border-gold/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gold">
              Chờ TT
            </span>
          )}
          {order.paymentStatus === 'PAID' && (
            <span className="ml-2 rounded border border-success/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-success">
              Đã TT
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <Link href={`/tai-khoan/don-hang/${order.code}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-3.5 w-3.5" />
              XEM CHI TIẾT
            </Button>
          </Link>

          {isNew && (
            <Button
              variant="ghost"
              size="sm"
              className="text-error hover:bg-error/10 hover:text-error"
            >
              <X className="h-3.5 w-3.5" />
              HỦY ĐƠN
            </Button>
          )}

          {isShipped && (
            <Button variant="ghost" size="sm">
              <Truck className="h-3.5 w-3.5" />
              THEO DÕI ĐƠN HÀNG
            </Button>
          )}

          {isDone && (
            <>
              <Button variant="ghost" size="sm">
                <RefreshCcw className="h-3.5 w-3.5" />
                MUA LẠI
              </Button>
              <Button variant="ghost" size="sm">
                <Star className="h-3.5 w-3.5" />
                ĐÁNH GIÁ
              </Button>
            </>
          )}

          {isCancelled && (
            <Link href="/san-pham">
              <Button variant="ghost" size="sm">
                <Search className="h-3.5 w-3.5" />
                TÌM SẢN PHẨM TƯƠNG TỰ
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
