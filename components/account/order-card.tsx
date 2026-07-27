'use client';

import Link from 'next/link';
import { Eye, Package } from 'lucide-react';
import { tierBadgeClass, formatVND, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getPaymentStatusMeta,
  toneToDotBg,
  ORDER_STATUS_TONE_BADGE,
} from '@/lib/order/status';
import type { CustomerOrderListItem } from '@/lib/supabase/queries/orders';

export function OrderCard({ order }: { order: CustomerOrderListItem }) {
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
  const isCancelled = order.status === 'CANCELLED';
  const productName = order.productName ?? 'Sản phẩm';
  const productDescription = order.productDescription ?? '';
  const tier = order.productTier ?? null;
  const imageUrl = order.firstItemImage ?? order.thumbnailUrl;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-md border border-gold/10 bg-surface-emerald/40 p-4 backdrop-blur-xl transition-all duration-300 hover:border-gold/20 hover:shadow-[0_0_24px_rgba(212,175,55,0.06)] sm:p-5 md:flex-row md:gap-5">
      {/* Status badge top-right */}
      <div
        className={cn(
          'absolute right-0 top-0 flex items-center gap-1.5 border-b border-l px-3 py-1 sm:px-4 sm:py-1.5',
          ORDER_STATUS_TONE_BADGE[paymentMeta.tone]
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            order.paymentStatus === 'AWAITING_CONFIRM' && 'animate-pulse',
            toneToDotBg(paymentMeta.tone)
          )}
        />
        <span className="font-heading text-[9px] tracking-[0.15em] sm:text-[10px]">
          {paymentMeta.label}
        </span>
      </div>

      {/* Image */}
      <div className="relative h-32 w-full shrink-0 overflow-hidden sm:h-36 sm:w-36 md:w-40">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
            style={{
              filter:
                tier === 'SSS'
                  ? 'grayscale(0.15)'
                  : tier === 'SS'
                    ? 'grayscale(0.4)'
                    : 'grayscale(0.7)',
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-container text-text-disabled">
            <Package className="h-8 w-8" />
          </div>
        )}
        {/* TIER badge */}
        {tier && (
          <div
            className={cn(
              'absolute left-2 top-2 border px-1.5 py-0.5 font-bold text-[9px]',
              tierBadgeClass(tier)
            )}
          >
            TIER {tier}
          </div>
        )}
      </div>

      {/* Middle content */}
      <div className="flex flex-1 flex-col justify-between gap-3 pt-3 md:gap-4 md:py-1">
        <div className="min-w-0">
          <h4 className="mb-1 font-mono text-[9px] tracking-tighter text-gold/60 sm:text-[10px]">
            ID: #{order.code}
          </h4>
          <h2 className="mb-2 line-clamp-1 font-heading text-base leading-tight text-on-surface sm:text-lg sm:leading-snug">
            {productName}
          </h2>
          {productDescription ? (
            <p className="line-clamp-2 max-w-xl text-xs text-text-muted/80 sm:text-sm">
              {productDescription}
            </p>
          ) : (
            <p className="line-clamp-1 text-xs italic text-text-muted/40 sm:text-sm">
              {order.itemCount > 1
                ? `${order.itemCount} sản phẩm trong đơn`
                : 'Sản phẩm độc quyền từ bộ sưu tập Vintage.'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-gold/10 pt-3 sm:gap-6 sm:pt-4">
          <div className="flex flex-col">
            <span className="mb-0.5 font-heading text-[9px] tracking-[0.15em] text-text-muted/60 sm:text-[10px]">
              GIÁ TRỊ
            </span>
            <span
              className={cn(
                'text-base font-semibold tracking-[0.02em] sm:text-lg',
                isCancelled ? 'text-text-disabled line-through' : 'text-gold'
              )}
            >
              {formatVND(order.totalAmount)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="mb-0.5 font-heading text-[9px] tracking-[0.15em] text-text-muted/60 sm:text-[10px]">
              NGÀY ĐẶT
            </span>
            <span className="font-mono text-xs text-on-surface sm:text-sm">
              {formatDate(order.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="mt-3 flex shrink-0 items-stretch justify-end md:mt-0 md:items-end md:self-stretch">
        <Link
          href={`/tai-khoan/don-hang/${order.code}`}
          className="w-full md:w-auto"
        >
          <Button type="button" variant="primary" size="sm" className="w-full md:w-auto">
            <Eye className="h-3.5 w-3.5" />
            <span>XEM CHI TIẾT</span>
          </Button>
        </Link>
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
