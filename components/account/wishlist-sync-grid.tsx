'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatVND } from '@/lib/utils';
import type { WishlistItemWithProduct } from '@/lib/types/account';

type Status = 'loading' | 'ready' | 'error' | 'empty';

const cardClass = cn(
  'group flex flex-col overflow-hidden rounded-md border border-gold/20',
  'bg-surface-emerald transition-colors hover:border-gold/40'
);

export function WishlistSyncGrid() {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<WishlistItemWithProduct[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/account/wishlist', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as { data: WishlistItemWithProduct[] };
      const list = json.data ?? [];
      setItems(list);
      setStatus(list.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      console.error('[WishlistSyncGrid] fetch error:', err);
      setErrorMsg('Không thể tải danh sách yêu thích. Vui lòng thử lại.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/account/wishlist/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        throw new Error(`HTTP ${res.status}`);
      }
      const next = items.filter((i) => i.product_id !== productId);
      setItems(next);
      if (next.length === 0) setStatus('empty');
    } catch (err) {
      console.error('[WishlistSyncGrid] delete error:', err);
      setErrorMsg('Không thể xoá sản phẩm. Vui lòng thử lại.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {errorMsg ? (
        <div
          role="alert"
          className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          {errorMsg}
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-gold/20 bg-surface-emerald p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          <p className="text-sm text-text-muted">Đang tải danh sách yêu thích…</p>
        </div>
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-gold/20 bg-surface-emerald p-12 text-center">
          <p className="text-sm text-text-muted">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Thử lại
          </Button>
        </div>
      ) : status === 'empty' ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-gold/20 bg-surface-emerald p-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-gold/30 bg-surface">
            <Heart className="h-7 w-7 text-gold" />
          </div>
          <h2 className="font-heading text-xl text-gold">
            Chưa có kho báu nào
          </h2>
          <p className="max-w-md text-sm text-text-muted">
            Bạn chưa lưu sản phẩm nào trong danh sách yêu thích. Hãy khám phá bộ
            sưu tập và thả tim những món trang sức bạn yêu thích.
          </p>
          <Link href="/bo-suu-tap">
            <Button variant="primary" size="md">
              <Sparkles className="h-4 w-4" />
              KHÁM PHÁ BỘ SƯU TẬP
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <WishlistSyncCard
              key={item.id}
              item={item}
              isRemoving={removingId === item.product_id}
              onRemove={() => handleRemove(item.product_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface WishlistSyncCardProps {
  item: WishlistItemWithProduct;
  isRemoving: boolean;
  onRemove: () => void;
}

function WishlistSyncCard({ item, isRemoving, onRemove }: WishlistSyncCardProps) {
  const product = item.product;
  const href = product?.slug ? `/san-pham/${product.slug}` : '/san-pham';

  return (
    <div className={cardClass}>
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden bg-surface"
      >
        {product?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title ?? 'Sản phẩm'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <Heart className="h-8 w-8" />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={href}
          className="line-clamp-2 text-sm font-medium text-text-base transition-colors hover:text-gold"
        >
          {product?.title ?? 'Sản phẩm'}
        </Link>
        <p className="font-heading text-base font-bold text-gold">
          {product?.price != null ? formatVND(product.price) : '—'}
        </p>
        <div className="mt-auto flex justify-end pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={isRemoving}
            className="text-error hover:bg-error/10 hover:text-error"
            aria-label="Xoá khỏi yêu thích"
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Xoá
          </Button>
        </div>
      </div>
    </div>
  );
}
