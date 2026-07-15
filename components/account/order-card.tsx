'use client';

import Link from 'next/link';
import { Eye, RefreshCcw, Search, Star, Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatVND, MATERIAL_LABELS, TIER_LABELS } from '@/lib/utils';
import type { OrderRow } from './order-list';

// ─────────────────────────────────────────────
// Status pill config — match Stitch design
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Card component
// ─────────────────────────────────────────────
export function OrderCard({ order }: { order: OrderRow }) {
  const pill = STATUS_PILL[order.status];
  const firstItem = order.order_items[0];
  const itemCount = order.order_items.length;
  const isCancelled = order.status === 'CANCELLED';
  const isShipped = order.status === 'SHIPPING';
  const isDone = order.status === 'DONE';
  const isNew = order.status === 'NEW' || order.status === 'CONFIRMED';

  return (
    <div className="rounded-lg border border-gold/20 bg-surface p-5 transition-colors hover:border-gold/40">
      {/* ── Header row: code (left) + status pill (right) ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={`/tai-khoan/don-hang/${order.code}`}
            className="font-mono text-sm font-semibold text-gold transition-colors hover:text-gold-champagne"
          >
            ORDER #{order.code}
          </Link>
          <p className="text-xs text-text-muted">
            Đặt ngày: {formatDate(order.created_at)}
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

      {/* ── Divider ── */}
      <div className="my-4 h-px bg-gold/10" />

      {/* ── Product body: thumb + title + meta + price ── */}
      <div className="flex gap-4">
        <Link
          href={
            firstItem.product
              ? `/san-pham/${firstItem.product.slug}`
              : `/tai-khoan/don-hang/${order.code}`
          }
          className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gold/10 bg-surface-emerald"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={firstItem.snapshot_image}
            alt={firstItem.snapshot_title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </Link>

        <div className="flex flex-1 flex-col justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3
              className={cn(
                'font-heading text-lg font-semibold leading-tight',
                isCancelled ? 'text-text-muted line-through' : 'text-text-base'
              )}
            >
              {firstItem.snapshot_title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
              {firstItem.snapshot_material && (
                <span>{MATERIAL_LABELS[firstItem.snapshot_material] ?? firstItem.snapshot_material}</span>
              )}
              {firstItem.snapshot_material && <span className="text-gold/40">•</span>}
              {itemCount > 1 ? (
                <span>+{itemCount - 1} sản phẩm khác</span>
              ) : (
                <span>1 sản phẩm</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span
              className={cn(
                'font-heading text-2xl font-bold',
                isCancelled ? 'text-text-disabled' : 'text-gold'
              )}
            >
              {formatVND(order.total_amount)}
            </span>
            {order.shipping_fee === 0 && !isCancelled && (
              <span className="text-[11px] uppercase tracking-wider text-success">
                ✓ Freeship
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Cancel reason (nếu có) ── */}
      {isCancelled && order.cancel_reason && (
        <p className="mt-3 rounded-md border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
          <span className="font-semibold">Lý do hủy:</span> {order.cancel_reason}
        </p>
      )}

      {/* ── Footer: total summary + actions ── */}
      <div className="mt-5 flex flex-col gap-3 border-t border-gold/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-muted">
          Tổng cộng: <span className="text-text-base">{itemCount}</span> sản phẩm
          {order.payment_method === 'COD' && (
            <span className="ml-2 rounded border border-gold/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gold">
              COD
            </span>
          )}
          {order.payment_method === 'MOMO' && (
            <span className="ml-2 rounded border border-gold/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-pink-400">
              MoMo
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Common: Xem chi tiết */}
          <Link href={`/tai-khoan/don-hang/${order.code}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-3.5 w-3.5" />
              XEM CHI TIẾT
            </Button>
          </Link>

          {/* NEW: Hủy đơn */}
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

          {/* SHIPPING: Theo dõi */}
          {isShipped && (
            <Button variant="ghost" size="sm">
              <Truck className="h-3.5 w-3.5" />
              THEO DÕI ĐƠN HÀNG
            </Button>
          )}

          {/* DONE: Mua lại + Đánh giá */}
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

          {/* CANCELLED: Tìm sản phẩm tương tự */}
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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
