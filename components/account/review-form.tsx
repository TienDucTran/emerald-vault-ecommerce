'use client';

import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ReviewFormValues = {
  product_id: string;
  rating: number;
  title: string;
  content: string;
};

export interface ReviewFormProps {
  productId: string;
  productTitle?: string;
  onSubmit: (data: ReviewFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initial?: Partial<ReviewFormValues>;
  submitLabel?: string;
}

const inputClass = cn(
  'w-full rounded-md border bg-background px-4 py-3 text-base text-text-base',
  'border-gold/30 placeholder:text-text-disabled/50',
  'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/10',
  'transition-colors'
);

const labelClass =
  'font-heading text-[10px] font-normal uppercase tracking-[0.05em] text-[#99907C]';

export function ReviewForm({
  productId,
  productTitle,
  onSubmit,
  onCancel,
  isLoading,
  initial,
  submitLabel = 'GỬI ĐÁNH GIÁ',
}: ReviewFormProps) {
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [title, setTitle] = useState<string>(initial?.title ?? '');
  const [content, setContent] = useState<string>(initial?.content ?? '');
  const [error, setError] = useState<string | null>(null);

  const displayRating = hover || rating;
  const contentLength = content.length;
  const contentValid = contentLength >= 10 && contentLength <= 2000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (rating < 1 || rating > 5) {
      setError('Vui lòng chọn số sao đánh giá.');
      return;
    }
    if (!contentValid) {
      setError('Nội dung phải có từ 10 đến 2000 ký tự.');
      return;
    }
    try {
      await onSubmit({
        product_id: productId,
        rating,
        title: title.trim(),
        content: content.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đã có lỗi xảy ra, vui lòng thử lại.'
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-gold/20 bg-surface-emerald p-6"
      aria-busy={isLoading}
    >
      {productTitle ? (
        <p className="text-sm text-text-muted">
          Đánh giá cho:{' '}
          <span className="font-medium text-text-base">{productTitle}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className={labelClass}>SỐ SAO *</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Số sao">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = displayRating >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} sao`}
                disabled={isLoading}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:opacity-50"
              >
                <Star
                  className={cn(
                    'h-7 w-7 transition-colors',
                    active
                      ? 'fill-gold text-gold'
                      : 'text-gold/30'
                  )}
                />
              </button>
            );
          })}
          <span className="ml-2 text-sm text-text-muted">
            {rating > 0 ? `${rating}/5` : 'Chưa chọn'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={labelClass}>
          TIÊU ĐỀ (tuỳ chọn)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tóm tắt đánh giá của bạn"
          maxLength={200}
          className={inputClass}
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="content" className={labelClass}>
          NỘI DUNG *
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm…"
          rows={5}
          minLength={10}
          maxLength={2000}
          required
          className={cn(inputClass, 'min-h-[120px] resize-y')}
          disabled={isLoading}
        />
        <p
          className={cn(
            'self-end text-xs',
            contentValid ? 'text-text-muted' : 'text-error'
          )}
        >
          {contentLength}/2000
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-error/30 bg-error/10 px-4 py-2 text-sm text-error"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
          >
            Huỷ
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isLoading || rating === 0 || !contentValid}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
