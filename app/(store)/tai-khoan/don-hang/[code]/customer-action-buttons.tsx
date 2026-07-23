'use client';

// Customer action buttons cho trang order detail (/tai-khoan/don-hang/[code]).
// Quản lý tập trung cả 4 button theo status, tránh hiển thị button vô nghĩa:
//
//   Status đơn           │ TT  │ THEO DÕI │ TẢI HÓA ĐƠN │ HỦY ĐƠN │ YÊU CẦU HOÀN TIỀN
//   ─────────────────────┼─────┼──────────┼──────────────┼──────────┼───────────────────
//   WAITING_PAYMENT      │ PEN │    —     │      —       │    ✅    │        —
//   WAITING_CONFIRM      │ AC  │    —     │      —       │    —     │        ✅
//   CONFIRMED            │ PAID│    ✅    │      ✅      │    —     │        ✅
//   SHIPPING             │ PAID│    ✅    │      ✅      │    —     │        ✅
//   DONE                 │ PAID│    —     │      ✅      │    —     │        — (quá muộn)
//   CANCELLED            │ FAIL│    —     │      —       │    —     │        —
//   REFUND_REQUESTED     │ (giữ status gốc + payment=REFUND_REQUESTED) → ẩn nút refund, ẩn
//                        │     │  THEO DÕI/TẢI HÓA ĐƠN theo status gốc như bảng trên.
//
// Sau action thành công → router.refresh() để server re-render với status mới.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Truck,
  Receipt,
} from 'lucide-react';
import { toast } from '@/lib/toast/toast-store';

interface CustomerActionButtonsProps {
  orderCode: string;
  status: string;
  paymentStatus: string;
}

export function CustomerActionButtons({
  orderCode,
  status,
  paymentStatus,
}: CustomerActionButtonsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState<'cancel' | 'refund' | null>(null);
  const [reason, setReason] = useState('');

  // Nếu đã refund-requested → coi như "đã yêu cầu" → ẩn button refund, vẫn hiện THEO DÕI / HÓA ĐƠN theo status gốc.
  const refundAlreadyRequested = paymentStatus === 'REFUND_REQUESTED';

  // Bảng quyết định hiển thị theo status đơn
  // (KHÔNG phụ thuộc paymentStatus — trừ refundAlreadyRequested đã check riêng)
  const visibleButtons: Record<
    string,
    {
      track: boolean;
      invoice: boolean;
      cancel: boolean;
      refund: boolean;
    }
  > = {
    WAITING_PAYMENT: { track: false, invoice: false, cancel: true, refund: false },
    WAITING_CONFIRM: { track: false, invoice: false, cancel: false, refund: true },
    CONFIRMED: { track: true, invoice: true, cancel: false, refund: true },
    SHIPPING: { track: true, invoice: true, cancel: false, refund: true },
    DONE: { track: false, invoice: true, cancel: false, refund: false },
    CANCELLED: { track: false, invoice: false, cancel: false, refund: false },
  };
  const v = visibleButtons[status] ?? { track: false, invoice: false, cancel: false, refund: false };

  // Refund chỉ hiện khi: status cho phép AND payment đủ điều kiện AND chưa request
  const canRefund =
    v.refund &&
    !refundAlreadyRequested &&
    (paymentStatus === 'PAID' || paymentStatus === 'AWAITING_CONFIRM');

  // Nếu đã refund-requested → hiện banner "đang chờ admin"
  const showRefundWaiting = refundAlreadyRequested;

  // Không có button nào visible → return null
  if (!v.track && !v.invoice && !v.cancel && !canRefund && !showRefundWaiting) {
    return null;
  }

  const submit = async (action: 'cancel' | 'request_refund') => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderCode)}/customer-action`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reason: reason.trim() || undefined }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.message ?? json.error ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
        return;
      }
      if (action === 'cancel') {
        toast.success('Đã hủy đơn hàng', {
          description: 'Sản phẩm đã được trả về kho. Bạn có thể đặt lại bất cứ lúc nào.',
        });
      } else {
        toast.success('Đã gửi yêu cầu hoàn tiền', {
          description: 'Admin sẽ xử lý và CK lại cho bạn trong vòng 24-48h làm việc.',
        });
      }
      setShowReasonDialog(null);
      setReason('');
      router.refresh();
    } catch {
      toast.error('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 pt-6 sm:flex-row">
        {/* THEO DÕI HÀNH TRÌNH — CONFIRMED/SHIPPING */}
        {v.track && (
          <button
            type="button"
            onClick={() => toast.info('Tính năng đang phát triển', { description: 'Theo dõi hành trình sẽ sớm ra mắt.' })}
            className="flex flex-1 items-center justify-center gap-2 border border-gold/40 py-3 font-heading text-[11px] tracking-[0.15em] text-gold-champagne transition-all hover:bg-gold/5"
          >
            <Truck className="h-4 w-4" />
            THEO DÕI HÀNH TRÌNH
          </button>
        )}

        {/* TẢI HÓA ĐƠN — CONFIRMED/SHIPPING/DONE */}
        {v.invoice && (
          <button
            type="button"
            onClick={() => toast.info('Tính năng đang phát triển', { description: 'Tải hóa đơn sẽ sớm ra mắt.' })}
            className="flex flex-1 items-center justify-center gap-2 bg-gradient-gold py-3 font-heading text-[11px] tracking-[0.15em] text-background shadow-gold-glow transition-shadow hover:shadow-gold-glow-lg"
          >
            <Receipt className="h-4 w-4" />
            TẢI HÓA ĐƠN
          </button>
        )}

        {/* HỦY ĐƠN HÀNG — chỉ WAITING_PAYMENT */}
        {v.cancel && (
          <button
            type="button"
            onClick={() => setShowReasonDialog('cancel')}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 border border-error/40 bg-transparent py-3 font-heading text-[11px] tracking-[0.15em] text-error transition-all hover:bg-error/5 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            HỦY ĐƠN HÀNG
          </button>
        )}

        {/* YÊU CẦU HOÀN TIỀN — WAITING_CONFIRM/CONFIRMED/SHIPPING khi đã thanh toán */}
        {canRefund && (
          <button
            type="button"
            onClick={() => setShowReasonDialog('refund')}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 border border-warning/40 bg-transparent py-3 font-heading text-[11px] tracking-[0.15em] text-warning transition-all hover:bg-warning/5 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            YÊU CẦU HOÀN TIỀN
          </button>
        )}

        {/* Banner "ĐANG CHỜ ADMIN HOÀN TIỀN" — khi đã REFUND_REQUESTED */}
        {showRefundWaiting && (
          <div className="flex flex-1 items-center justify-center gap-2 border border-warning/30 bg-warning/5 py-3 font-heading text-[11px] tracking-[0.15em] text-warning">
            <Loader2 className="h-4 w-4" />
            ĐANG CHỜ ADMIN HOÀN TIỀN
          </div>
        )}
      </div>

      {/* Reason dialog (modal overlay) */}
      {showReasonDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !busy && setShowReasonDialog(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-gold/20 bg-surface p-6 shadow-gold-glow-lg"
          >
            <h3 className="font-heading text-lg font-bold text-gold">
              {showReasonDialog === 'cancel'
                ? 'Hủy đơn hàng'
                : 'Yêu cầu hoàn tiền'}
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              {showReasonDialog === 'cancel'
                ? 'Bạn có chắc muốn hủy đơn này? Sản phẩm sẽ được trả về kho và bạn có thể đặt lại bất cứ lúc nào.'
                : 'Admin sẽ xử lý và chuyển khoản lại cho bạn trong vòng 24-48h làm việc. Vui lòng mô tả lý do (không bắt buộc).'}
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={
                showReasonDialog === 'cancel'
                  ? 'Lý do hủy (không bắt buộc)...'
                  : 'Lý do hoàn tiền (không bắt buộc)...'
              }
              className="mt-4 w-full resize-none rounded border border-gold/20 bg-background/40 px-3 py-2 text-sm text-text-base placeholder:text-text-muted/50 focus:border-gold/50 focus:outline-none"
            />

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowReasonDialog(null)}
                disabled={busy}
                className="rounded border border-gold/30 px-4 py-2 text-sm text-text-base transition-colors hover:bg-gold/5 disabled:opacity-60"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() =>
                  submit(showReasonDialog === 'cancel' ? 'cancel' : 'request_refund')
                }
                disabled={busy}
                className={`flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  showReasonDialog === 'cancel'
                    ? 'bg-error text-white hover:bg-error/90'
                    : 'bg-warning text-background hover:bg-warning/90'
                }`}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : showReasonDialog === 'cancel' ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {showReasonDialog === 'cancel' ? 'Xác nhận hủy' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
