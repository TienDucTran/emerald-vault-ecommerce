'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ShoppingBag, ChevronDown } from 'lucide-react';
import { OrderCard } from './order-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast/toast-store';
import type { CustomerOrderListItem } from '@/lib/supabase/queries/orders';
import type { OrderStatus } from '@/lib/supabase/types';

type FilterKey = 'ALL' | 'WAITING' | 'SHIPPING' | 'DONE';

const FILTERS: { key: FilterKey; label: string; matchStatuses: OrderStatus[] }[] = [
  { key: 'ALL', label: 'Tất cả', matchStatuses: [] },
  { key: 'WAITING', label: 'Đang đợi', matchStatuses: ['NEW', 'WAITING_PAYMENT', 'WAITING_CONFIRM'] },
  { key: 'SHIPPING', label: 'Đang giao', matchStatuses: ['SHIPPING'] },
  { key: 'DONE', label: 'Hoàn tất', matchStatuses: ['DONE'] },
];

type SortKey = 'newest' | 'oldest' | 'price_desc' | 'price_asc';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'oldest', label: 'Cũ nhất' },
  { key: 'price_desc', label: 'Giá giảm dần' },
  { key: 'price_asc', label: 'Giá tăng dần' },
];

export interface OrderListProps {
  orders: CustomerOrderListItem[];
  total: number;
}

export function OrderList({ orders, total }: OrderListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const previousStatusesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const o of orders) map[o.code] = o.status;
    previousStatusesRef.current = map;
  }, []);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel(`orders-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new as {
              id: string;
              code: string;
              status: string;
            };
            const oldRow = payload.old as { status?: string };
            const oldStatus = oldRow?.status;
            const newStatus = newRow.status;
            const previous = previousStatusesRef.current[newRow.code];

            const cameFromPending =
              previous === undefined ||
              previous === 'WAITING_PAYMENT' ||
              previous === 'WAITING_CONFIRM' ||
              oldStatus === 'WAITING_PAYMENT' ||
              oldStatus === 'WAITING_CONFIRM';

            if (newStatus === 'CONFIRMED' && oldStatus !== 'CONFIRMED' && cameFromPending) {
              previousStatusesRef.current[newRow.code] = newStatus;
              toast.success(`Đơn hàng #${newRow.code} đã được admin xác nhận`, {
                description: 'Đang chuẩn bị giao hàng.',
                action: {
                  label: 'Xem',
                  onClick: () => router.push(`/don-hang/${encodeURIComponent(newRow.code)}`),
                },
              });
              router.refresh();
            } else if (previous === undefined) {
              previousStatusesRef.current[newRow.code] = newStatus;
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [router]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      ALL: orders.length,
      WAITING: 0,
      SHIPPING: 0,
      DONE: 0,
    };
    for (const o of orders) {
      if (o.status === 'NEW' || o.status === 'WAITING_PAYMENT' || o.status === 'WAITING_CONFIRM') c.WAITING++;
      if (o.status === 'SHIPPING') c.SHIPPING++;
      if (o.status === 'DONE') c.DONE++;
    }
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    let list = orders.filter(
      (o) => f.matchStatuses.length === 0 || f.matchStatuses.includes(o.status)
    );
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'price_desc':
          return b.totalAmount - a.totalAmount;
        case 'price_asc':
          return a.totalAmount - b.totalAmount;
      }
    });
    return list;
  }, [orders, filter, sort]);

  return (
    <div className="relative flex flex-col gap-8 overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-[120px]"
        aria-hidden
      />

      <header className="mb-12 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-[0.05em] text-gold md:text-5xl">
            ĐƠN HÀNG CỦA TÔI
          </h1>
          <p className="mt-2 text-sm italic text-text-muted">
            Lịch sử các vật phẩm lưu ký của bạn.
          </p>
        </div>
      </header>

      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <>
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
                      'shrink-0 px-6 py-2 font-heading text-[11px] tracking-[0.15em] transition-colors',
                      active
                        ? 'bg-gradient-gold text-background shadow-gold-glow'
                        : 'border border-gold/20 text-text-muted hover:border-gold/50 hover:text-gold'
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

          {visible.length === 0 ? (
            <FilteredEmpty />
          ) : (
            <div className="flex flex-col gap-4">
              {visible.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
          )}
        </>
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
      <h2 className="font-heading text-xl text-gold">Bạn chưa có đơn hàng nào.</h2>
      <p className="max-w-md text-sm text-text-muted">
        Hãy khám phá những kho báu vintage của chúng tôi và đặt đơn đầu tiên của
        bạn.
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

function FilteredEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-gold/10 bg-surface-emerald/40 p-8 text-center">
      <Package className="h-6 w-6 text-gold/60" />
      <p className="text-sm text-text-muted">
        Không có đơn hàng nào trong bộ lọc này.
      </p>
    </div>
  );
}
