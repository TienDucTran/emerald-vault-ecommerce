'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart';
import { useAnonymousId } from '@/hooks/use-anonymous-id';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface HoldButtonProps {
  product: Product;
  className?: string;
  size?: 'sm' | 'lg';
  label?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  PRODUCT_NOT_FOUND: 'Sản phẩm không tồn tại.',
  PRODUCT_SOLD_OUT: 'Món này đã được sưu tầm rồi.',
  PRODUCT_LOCKED_BY_OTHER: 'Có người khác đang giữ món này. Thử lại sau vài phút nhé.',
  LOCK_FAILED: 'Không thể giữ hàng lúc này. Thử lại sau.',
  NETWORK_ERROR: 'Mất kết nối — vẫn giữ tạm ở máy bạn 10 phút.',
};

export function HoldButton({ product, className, size = 'lg', label }: HoldButtonProps) {
  const router = useRouter();
  const clientId = useAnonymousId();
  const lockItemAsync = useCartStore((s) => s.lockItemAsync);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (state === 'loading') return;
    if (!clientId) {
      setError('Đang khởi tạo phiên... vui lòng thử lại sau 1 giây.');
      return;
    }
    setState('loading');
    setError(null);
    const res = await lockItemAsync(product, clientId);
    if (res.ok) {
      setState('success');
      // Chuyển sang cart sau 600ms
      setTimeout(() => router.push('/gio-hang'), 600);
    } else {
      setState('error');
      setError(ERROR_MESSAGES[res.error] ?? res.error);
    }
  }

  const isLoading = state === 'loading';
  const isSuccess = state === 'success';

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size={size}
        variant="primary"
        disabled={isLoading || isSuccess}
        onClick={onClick}
        className={cn('hover:scale-[1.02] active:scale-[0.98]', className)}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang giữ hàng...
          </>
        ) : isSuccess ? (
          <>
            <Check className="h-4 w-4" />
            Đã giữ — chuyển tới giỏ...
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            {label ?? 'Giữ hàng 10 phút'}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
