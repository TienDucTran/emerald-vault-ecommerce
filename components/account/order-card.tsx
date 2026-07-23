'use client';

import Link from 'next/link';
import { Eye, Package } from 'lucide-react';
import { tierBadgeClass, tierFrameClass, formatVND, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getOrderStatusMeta,
  getPaymentStatusMeta,
  toneToDotBg,
  ORDER_STATUS_TONE_BADGE,
} from '@/lib/order/status';
import type { CustomerOrderListItem } from '@/lib/supabase/queries/orders';

export function OrderCard({ order }: { order: CustomerOrderListItem }) {
  const statusMeta = getOrderStatusMeta(order.status);
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
  const isCancelled = order.status === 'CANCELLED';
  const productName = order.productName ?? 'Sản phẩm';
  const productDescription = order.productDescription ?? '';
  const tier = order.productTier ?? null;
  const imageUrl = order.firstItemImage ?? order.thumbnailUrl;

  return (
    <div className="group relative flex flex-col gap-8 overflow-hidden border border-gold/10 bg-surface-emerald/40 p-8 backdrop-blur-xl transition-all duration-500 hover:border-primary/20 hover:shadow-[0_0_30px_rgba(212,175,55,0.08)] md:flex-row">
      {/* Status badge top-right — tone from paymentMeta */}
      <div
        className={cn(
          'absolute right-0 top-0 flex items-center gap-2 border-b border-l px-6 py-2',
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
        <span className="font-heading text-[10px] tracking-[0.15em]">
          {paymentMeta.label}
        </span>
      </div>

      {/* Image with rotated frame */}
      <div className="relative h-48 w-48 shrink-0">
        <div
          className={cn(
            'absolute inset-0 border border-primary/20 transition-transform duration-500',
            tierFrameClass(tier)
          )}
        />
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            className="h-full w-full object-cover transition-all duration-700 group-hover:grayscale-0"
            style={{
              filter:
                tier === 'SSS'
                  ? 'grayscale(0.2)'
                  : tier === 'SS'
                    ? 'grayscale(0.5)'
                    : 'grayscale(0.8)',
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-container text-text-disabled">
            <Package className="h-12 w-12" />
          </div>
        )}
        {/* TIER badge */}
        {tier && (
          <div
            className={cn(
              'absolute left-2 top-2 border px-2 py-0.5 font-bold text-[10px]',
              tierBadgeClass(tier)
            )}
          >
            TIER {tier}
          </div>
        )}
      </div>

      {/* Middle content */}
      <div className="flex flex-1 flex-col justify-between py-2">
        <div>
          <h4 className="mb-1 font-mono text-[10px] tracking-tighter text-gold/60">
            ID: #{order.code}
          </h4>
          <h2 className="mb-4 font-heading text-2xl italic leading-tight text-on-surface">
            {productName}
          </h2>
          {productDescription ? (
            <p className="line-clamp-2 max-w-xl text-sm text-text-muted/80">
              {productDescription}
            </p>
          ) : (
            <p className="line-clamp-2 max-w-xl text-sm italic text-text-muted/40">
              {order.itemCount > 1
                ? `${order.itemCount} sản phẩm trong đơn`
                : 'Sản phẩm độc quyền từ bộ sưu tập Vintage.'}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-6 border-t border-gold/10 pt-6">
          <div className="flex flex-col">
            <span className="mb-1 font-heading text-[10px] tracking-[0.15em] text-text-muted/60">
              GIÁ TRỊ
            </span>
            <span
              className={cn(
                'text-[22px] font-semibold tracking-[0.05em]',
                isCancelled ? 'text-text-disabled line-through' : 'shimmer-text'
              )}
            >
              {formatVND(order.totalAmount)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 font-heading text-[10px] tracking-[0.15em] text-text-muted/60">
              NGÀY ĐẶT
            </span>
            <span className="font-mono text-sm text-on-surface">
              {formatDate(order.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex min-w-[140px] flex-col justify-end gap-3">
        <Link href={`/tai-khoan/don-hang/${order.code}`}>
          <Button type="button" variant="primary" size="md" className="w-full">
            XEM CHI TIẾT
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
