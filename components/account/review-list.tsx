'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, Star, Trash2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ReviewForm, type ReviewFormValues } from './review-form';
import type { Review } from '@/lib/types/account';

type Status = 'loading' | 'ready' | 'error' | 'empty';

const cardClass = cn(
  'flex flex-col gap-4 rounded-md border border-gold/20 bg-surface-emerald p-5'
);

const labelClass =
  'font-heading text-[10px] font-normal uppercase tracking-[0.05em] text-[#99907C]';

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function statusInfo(review: Review): {
  label: string;
  variant: 'success' | 'gold' | 'sold-out';
} {
  if (review.is_approved) {
    return { label: 'Đã duyệt', variant: 'success' };
  }
  return { label: 'Chờ duyệt', variant: 'gold' };
}

export function ReviewList() {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<Review[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/account/reviews', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: Review[] };
      const list = json.data ?? [];
      setItems(list);
      setStatus(list.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      console.error('[ReviewList] fetch error:', err);
      setErrorMsg('Không thể tải danh sách đánh giá. Vui lòng thử lại.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/account/reviews/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const json = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(json?.message ?? `HTTP ${res.status}`);
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      if (items.length - 1 === 0) setStatus('empty');
    } catch (err) {
      console.error('[ReviewList] delete error:', err);
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể xoá đánh giá.'
      );
    } finally {
      setBusyId(null);
      setConfirmingDeleteId(null);
    }
  };

  const handleUpdate = async (id: string, values: ReviewFormValues) => {
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/account/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          content: values.content,
          rating: values.rating,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(json?.message ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { data: Review };
      setItems((prev) => prev.map((r) => (r.id === id ? json.data : r)));
      setEditingId(null);
    } catch (err) {
      console.error('[ReviewList] update error:', err);
      throw err;
    } finally {
      setBusyId(null);
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
          <p className="text-sm text-text-muted">Đang tải đánh giá…</p>
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
            <Inbox className="h-7 w-7 text-gold" />
          </div>
          <h2 className="font-heading text-xl text-gold">
            Bạn chưa có đánh giá nào.
          </h2>
          <p className="max-w-md text-sm text-text-muted">
            Sau khi mua sản phẩm, hãy chia sẻ cảm nhận để giúp những khách hàng
            khác.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((review) => (
            <ReviewRow
              key={review.id}
              review={review}
              isEditing={editingId === review.id}
              isBusy={busyId === review.id}
              isConfirmingDelete={confirmingDeleteId === review.id}
              onStartEdit={() => {
                setEditingId(review.id);
                setErrorMsg(null);
              }}
              onCancelEdit={() => setEditingId(null)}
              onAskDelete={() => setConfirmingDeleteId(review.id)}
              onCancelDelete={() => setConfirmingDeleteId(null)}
              onConfirmDelete={() => handleDelete(review.id)}
              onSubmitEdit={(values) => handleUpdate(review.id, values)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ReviewRowProps {
  review: Review;
  isEditing: boolean;
  isBusy: boolean;
  isConfirmingDelete: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onSubmitEdit: (values: ReviewFormValues) => Promise<void>;
}

function ReviewRow({
  review,
  isEditing,
  isBusy,
  isConfirmingDelete,
  onStartEdit,
  onCancelEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onSubmitEdit,
}: ReviewRowProps) {
  const info = statusInfo(review);

  if (isEditing) {
    return (
      <div className={cardClass}>
        <ReviewForm
          productId={review.product_id}
          onSubmit={onSubmitEdit}
          onCancel={onCancelEdit}
          isLoading={isBusy}
          initial={{
            rating: review.rating,
            title: review.title ?? '',
            content: review.content,
          }}
          submitLabel="LƯU THAY ĐỔI"
        />
      </div>
    );
  }

  return (
    <article className={cardClass}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={labelClass}>SẢN PHẨM</span>
            <Link
              href={`/san-pham/${review.product_id}`}
              className="text-sm font-medium text-gold transition-colors hover:text-gold-champagne"
            >
              Xem sản phẩm →
            </Link>
          </div>
          <p className="font-heading text-base font-bold text-text-base">
            {review.title || 'Đánh giá sản phẩm'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={info.variant}>{info.label}</Badge>
          <time
            dateTime={review.created_at}
            className="text-xs text-text-muted"
          >
            {formatDate(review.created_at)}
          </time>
        </div>
      </header>

      <div className="flex items-center gap-1" aria-label={`${review.rating} trên 5 sao`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(
              'h-4 w-4',
              n <= review.rating
                ? 'fill-gold text-gold'
                : 'text-gold/25'
            )}
          />
        ))}
        <span className="ml-2 text-xs text-text-muted">
          {review.rating}/5
        </span>
      </div>

      <p className="whitespace-pre-line text-sm text-text-base">
        {review.content}
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gold/10 pt-3">
        {isConfirmingDelete ? (
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onConfirmDelete}
              disabled={isBusy}
              className="bg-error text-white hover:bg-error/90"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Xác nhận xoá?
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelDelete}
              disabled={isBusy}
            >
              Huỷ
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
              disabled={isBusy}
            >
              <Pencil className="h-4 w-4" />
              Sửa
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAskDelete}
              disabled={isBusy}
              className="text-error hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="h-4 w-4" />
              Xoá
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
