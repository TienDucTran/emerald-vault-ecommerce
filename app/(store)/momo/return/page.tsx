'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PollState = 'polling' | 'success' | 'failed' | 'timeout';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;

export default function MomoReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('orderId');
  const resultCode = Number(searchParams.get('resultCode') ?? -1);

  const [state, setState] = useState<PollState>('polling');
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const pollsRef = useRef(0);

  useEffect(() => {
    if (!orderCode) {
      setState('failed');
      return;
    }

    // MoMo trả về resultCode=0 thì user đã thanh toán trên app/web của MoMo.
    // Nhưng IPN có thể đến sau redirect → cần poll DB cho tới khi PAID hoặc timeout.
    if (resultCode !== 0) {
      setState('failed');
      return;
    }

    const start = Date.now();
    const tick = async () => {
      pollsRef.current += 1;
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/status`);
        const json = await res.json();
        if (json.ok) {
          setPaymentStatus(json.payment_status);
          if (json.payment_status === 'PAID') {
            setState('success');
            return;
          }
          if (json.payment_status === 'FAILED') {
            setState('failed');
            return;
          }
        }
      } catch {
        /* ignore */
      }
      if (Date.now() - start >= POLL_TIMEOUT_MS) {
        setState('timeout');
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  }, [orderCode, resultCode]);

  useEffect(() => {
    if (state === 'success' && orderCode) {
      const t = setTimeout(() => {
        router.push(`/don-hang/${orderCode}`);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [state, orderCode, router]);

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-md rounded-lg border border-gold/20 bg-surface p-10 text-center">
        {state === 'polling' && (
          <>
            <Loader2 className="mx-auto mb-6 h-12 w-12 animate-spin text-gold" />
            <h1 className="mb-2 font-heading text-2xl font-bold text-gold">
              Đang xác nhận thanh toán...
            </h1>
            <p className="text-sm text-text-muted">
              Vui lòng đợi trong giây lát, hệ thống đang đối soát với MoMo.
            </p>
            {orderCode && (
              <p className="mt-4 font-mono text-xs text-text-disabled">
                Mã đơn: {orderCode}
              </p>
            )}
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="mx-auto mb-6 h-12 w-12 text-gold" />
            <h1 className="mb-2 font-heading text-2xl font-bold text-gold">
              Thanh toán thành công!
            </h1>
            <p className="text-sm text-text-muted">
              Đang chuyển tới trang đơn hàng...
            </p>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle className="mx-auto mb-6 h-12 w-12 text-red-400" />
            <h1 className="mb-2 font-heading text-2xl font-bold text-red-400">
              Thanh toán thất bại
            </h1>
            <p className="text-sm text-text-muted">
              {paymentStatus === 'FAILED'
                ? 'MoMo từ chối giao dịch. Vui lòng thử lại hoặc chọn phương thức khác.'
                : resultCode !== 0
                  ? 'Giao dịch chưa hoàn tất. Vui lòng kiểm tra MoMo và thử lại.'
                  : 'Không xác định được đơn hàng.'}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {orderCode && (
                <Button asChild variant="primary" size="lg" className="w-full">
                  <Link href={`/don-hang/${orderCode}`}>Xem đơn hàng</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/gio-hang">Quay lại giỏ hàng</Link>
              </Button>
            </div>
          </>
        )}

        {state === 'timeout' && (
          <>
            <Clock className="mx-auto mb-6 h-12 w-12 text-amber-400" />
            <h1 className="mb-2 font-heading text-2xl font-bold text-amber-400">
              Đang chờ MoMo xác nhận
            </h1>
            <p className="text-sm text-text-muted">
              Hệ thống chưa nhận được IPN từ MoMo sau 30 giây. Đơn của bạn vẫn được giữ — vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ.
            </p>
            {orderCode && (
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild variant="primary" size="lg" className="w-full">
                  <Link href={`/don-hang/${orderCode}`}>Tôi đã thanh toán — kiểm tra lại</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/gio-hang">Quay lại giỏ hàng</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
