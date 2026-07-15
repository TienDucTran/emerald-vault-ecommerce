'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ProductForm } from '@/components/admin/product-form';
import type { ProductRow } from '@/lib/supabase/types';

const glassStyle: CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'notfound' }
  | { kind: 'ok'; product: ProductRow };

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : null;
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [retryNonce, setRetryNonce] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) {
      setState({ kind: 'error', message: 'Invalid product id.' });
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ kind: 'loading' });

    (async () => {
      try {
        const res = await fetch(`/api/admin/products/${id}`, { signal: ctrl.signal });
        if (res.status === 404) {
          if (!ctrl.signal.aborted) setState({ kind: 'notfound' });
          return;
        }
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) {
          if (!ctrl.signal.aborted) {
            setState({
              kind: 'error',
              message: (json && (json.error || json.message)) || `Request failed (${res.status})`,
            });
          }
          return;
        }
        if (!ctrl.signal.aborted) setState({ kind: 'ok', product: json.data as ProductRow });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!ctrl.signal.aborted) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Network error',
          });
        }
      }
    })();

    return () => ctrl.abort();
  }, [id, retryNonce]);

  if (state.kind === 'loading') return <EditSkeleton />;

  if (state.kind === 'notfound') {
    return (
      <div
        className="p-8 rounded-sm text-center space-y-3"
        style={{ ...glassStyle, border: '1px solid rgba(220, 80, 80, 0.3)' }}
      >
        <AlertCircle className="w-8 h-8 text-error mx-auto" />
        <h2 className="font-heading text-base font-semibold text-error uppercase tracking-[0.1em]">
          Sản phẩm không tồn tại
        </h2>
        <p className="text-sm text-[#D0C5AF]/60">
          Sản phẩm này có thể đã bị xóa hoặc bạn không có quyền truy cập.
        </p>
        <Link
          href="/admin/products"
          className="inline-block mt-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div
        className="p-8 rounded-sm text-center space-y-3"
        style={{ ...glassStyle, border: '1px solid rgba(220, 80, 80, 0.3)' }}
      >
        <AlertCircle className="w-8 h-8 text-error mx-auto" />
        <h2 className="font-heading text-base font-semibold text-error uppercase tracking-[0.1em]">
          Không tải được sản phẩm
        </h2>
        <p className="text-sm text-[#D0C5AF]/60 font-mono">{state.message}</p>
        <button
          type="button"
          onClick={() => setRetryNonce((n) => n + 1)}
          className="inline-block mt-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return <ProductForm mode="edit" initialData={state.product} productId={state.product.id} />;
}

function EditSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-40 rounded-sm bg-[#1F1B13] animate-pulse" />
        <div className="h-7 w-72 rounded-sm bg-[#1F1B13] animate-pulse" />
        <div className="h-4 w-96 rounded-sm bg-[#1F1B13] animate-pulse" />
      </div>

      {/* 5 glass card skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-sm space-y-4"
          style={glassStyle}
        >
          <div className="h-4 w-48 rounded-sm bg-[#1F1B13] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-9 w-full rounded-sm bg-[#1F1B13] animate-pulse" />
            <div className="h-9 w-full rounded-sm bg-[#1F1B13] animate-pulse" />
          </div>
          <div className="h-9 w-2/3 rounded-sm bg-[#1F1B13] animate-pulse" />
          <div className="h-20 w-full rounded-sm bg-[#1F1B13] animate-pulse" />
        </div>
      ))}

      <div className="flex items-center justify-center text-xs text-[#D0C5AF]/50 gap-2 py-4">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Đang tải sản phẩm…
      </div>
    </div>
  );
}
