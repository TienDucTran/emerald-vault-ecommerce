'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingBag, ChevronDown } from 'lucide-react';
import { OrderCard } from './order-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types — match DB schema (flows.md §2.4 + §18.7)
// ─────────────────────────────────────────────
export type OrderStatus = 'NEW' | 'CONFIRMED' | 'SHIPPING' | 'DONE' | 'CANCELLED';

export interface OrderItem {
  id: string;
  product_id: string;
  price: number;
  snapshot_title: string;
  snapshot_image: string;
  snapshot_material?: string | null;
  product?: { id: string; slug: string } | null;
}

export interface OrderRow {
  id: string;
  code: string;
  status: OrderStatus;
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  payment_method: 'MOMO' | 'COD' | 'BANK_TRANSFER';
  total_amount: number;
  shipping_fee: number;
  created_at: string;
  cancel_reason?: string | null;
  order_items: OrderItem[];
}

// ─────────────────────────────────────────────
// Mock data — replace with real fetch from /api/account/orders
// ─────────────────────────────────────────────
const MOCK_ORDERS: OrderRow[] = [
  {
    id: '1',
    code: 'EV-20241012-9921',
    status: 'SHIPPING',
    payment_status: 'PAID',
    payment_method: 'MOMO',
    total_amount: 24_500_000,
    shipping_fee: 0,
    created_at: '2024-10-12T14:32:00+07:00',
    order_items: [
      {
        id: 'i1',
        product_id: 'p1',
        price: 24_500_000,
        snapshot_title: 'Dây Chuyền Victorian Locket',
        snapshot_image:
          'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&h=200&fit=crop',
        snapshot_material: 'VANG_18K',
        product: { id: 'p1', slug: 'day-chuyen-victorian-locket' },
      },
    ],
  },
  {
    id: '2',
    code: 'EV-20241005-8845',
    status: 'DONE',
    payment_status: 'PAID',
    payment_method: 'COD',
    total_amount: 42_000_000,
    shipping_fee: 0,
    created_at: '2024-10-05T09:15:00+07:00',
    order_items: [
      {
        id: 'i2',
        product_id: 'p2',
        price: 42_000_000,
        snapshot_title: 'Nhẫn Sapphire Art Deco',
        snapshot_image:
          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop',
        snapshot_material: 'KIM_CUONG',
        product: { id: 'p2', slug: 'nhan-sapphire-art-deco' },
      },
    ],
  },
  {
    id: '3',
    code: 'EV-20240928-7712',
    status: 'CANCELLED',
    payment_status: 'FAILED',
    payment_method: 'MOMO',
    total_amount: 18_200_000,
    shipping_fee: 0,
    created_at: '2024-09-28T11:48:00+07:00',
    cancel_reason: 'Hết thời gian giữ chỗ (10 phút)',
    order_items: [
      {
        id: 'i3',
        product_id: 'p3',
        price: 18_200_000,
        snapshot_title: 'Nhẫn Ngọc Lục Bảo Antique',
        snapshot_image:
          'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&h=200&fit=crop',
        snapshot_material: 'VANG_18K',
        product: { id: 'p3', slug: 'nhan-ngoc-luc-bao-antique' },
      },
    ],
  },
  {
    id: '4',
    code: 'EV-20240920-6730',
    status: 'CONFIRMED',
    payment_status: 'PAID',
    payment_method: 'MOMO',
    total_amount: 8_750_000,
    shipping_fee: 0,
    created_at: '2024-09-20T16:22:00+07:00',
    order_items: [
      {
        id: 'i4',
        product_id: 'p4',
        price: 8_750_000,
        snapshot_title: 'Bông Tai Ngọc Trai Showa',
        snapshot_image:
          'https://images.unsplash.com/photo-1535632066274-36f8d0e7b3b3?w=200&h=200&fit=crop',
        snapshot_material: 'BAC_925',
        product: { id: 'p4', slug: 'bong-tai-ngoc-trai-showa' },
      },
    ],
  },
  {
    id: '5',
    code: 'EV-20240915-5580',
    status: 'NEW',
    payment_status: 'PENDING',
    payment_method: 'COD',
    total_amount: 15_300_000,
    shipping_fee: 0,
    created_at: '2024-09-15T10:05:00+07:00',
    order_items: [
      {
        id: 'i5',
        product_id: 'p5',
        price: 15_300_000,
        snapshot_title: 'Vòng Tay Bạc 925 Vintage',
        snapshot_image:
          'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=200&h=200&fit=crop',
        snapshot_material: 'BAC_925',
        product: { id: 'p5', slug: 'vong-tay-bac-925-vintage' },
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Filter chip config
// ─────────────────────────────────────────────
type FilterKey = 'ALL' | 'NEW' | 'SHIPPING' | 'DONE' | 'CANCELLED';

const FILTERS: { key: FilterKey; label: string; matchStatuses: OrderStatus[] }[] = [
  { key: 'ALL', label: 'Tất cả', matchStatuses: [] },
  { key: 'NEW', label: 'Mới', matchStatuses: ['NEW', 'CONFIRMED'] },
  { key: 'SHIPPING', label: 'Đang giao', matchStatuses: ['SHIPPING'] },
  { key: 'DONE', label: 'Hoàn tất', matchStatuses: ['DONE'] },
  { key: 'CANCELLED', label: 'Đã hủy', matchStatuses: ['CANCELLED'] },
];

type SortKey = 'newest' | 'oldest' | 'price_desc' | 'price_asc';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'oldest', label: 'Cũ nhất' },
  { key: 'price_desc', label: 'Giá giảm dần' },
  { key: 'price_asc', label: 'Giá tăng dần' },
];

// ─────────────────────────────────────────────
// Page wrapper
// ─────────────────────────────────────────────
export function OrderList() {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      ALL: MOCK_ORDERS.length,
      NEW: 0,
      SHIPPING: 0,
      DONE: 0,
      CANCELLED: 0,
    };
    for (const o of MOCK_ORDERS) {
      if (o.status === 'NEW' || o.status === 'CONFIRMED') c.NEW++;
      if (o.status === 'SHIPPING') c.SHIPPING++;
      if (o.status === 'DONE') c.DONE++;
      if (o.status === 'CANCELLED') c.CANCELLED++;
    }
    return c;
  }, []);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    let list = MOCK_ORDERS.filter(
      (o) => f.matchStatuses.length === 0 || f.matchStatuses.includes(o.status)
    );
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price_desc':
          return b.total_amount - a.total_amount;
        case 'price_asc':
          return a.total_amount - b.total_amount;
      }
    });
    return list;
  }, [filter, sort]);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">
          ĐƠN HÀNG CỦA TÔI
        </h1>
        <p className="text-base text-text-muted">
          Theo dõi và quản lý tất cả đơn hàng của bạn
        </p>
      </div>

      {/* ── Filter bar ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-gold text-background shadow-gold-glow'
                    : 'border border-gold/20 text-text-muted hover:border-gold hover:text-text-base'
                )}
              >
                {f.label} ({counts[f.key]})
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-md border border-gold/20 bg-surface px-4 py-2 text-sm text-text-base transition-colors hover:border-gold sm:w-auto"
            aria-expanded={sortOpen}
          >
            <span className="text-text-muted">Sắp xếp:</span>
            <span className="font-medium text-gold">
              {SORTS.find((s) => s.key === sort)?.label}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-text-muted transition-transform',
                sortOpen && 'rotate-180'
              )}
            />
          </button>
          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSortOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-gold/20 bg-surface shadow-card">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setSort(s.key);
                      setSortOpen(false);
                    }}
                    className={cn(
                      'block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-surface-emerald',
                      s.key === sort ? 'text-gold' : 'text-text-base'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Order list ─────────────────────────────────── */}
      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-gold/20 bg-surface p-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full border border-gold/30 bg-surface-emerald">
        <Package className="h-7 w-7 text-gold" />
      </div>
      <h2 className="font-heading text-xl text-gold">Chưa có đơn hàng nào</h2>
      <p className="max-w-md text-sm text-text-muted">
        Bạn chưa có đơn hàng nào trong mục này. Hãy khám phá những kho báu vintage của chúng tôi.
      </p>
      <Link href="/san-pham">
        <Button variant="gold" size="md">
          <ShoppingBag className="h-4 w-4" />
          KHÁM PHÁ NGAY
        </Button>
      </Link>
    </div>
  );
}
