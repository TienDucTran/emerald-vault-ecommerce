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
//
// Refund state machine (Phase 5 — order_refunds table):
//   - PENDING     → banner "Đã gửi yêu cầu — admin sẽ duyệt trong 24h"
//   - APPROVED    → banner "Admin đã duyệt — sẽ CK trong 1-3 ngày làm việc"
//   - COMPLETED   → banner "Đã hoàn tiền X đ" + bill proof nếu có
//   - FAILED      → banner "CK lỗi — admin đang retry"
//   - REJECTED    → banner "Admin từ chối — [lý do]" + button "Gửi yêu cầu mới"
//
// Sau action thành công → router.refresh() để server re-render với state mới.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Truck,
  Receipt,
  Clock,
  ShieldX,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/lib/toast/toast-store';
import { formatVND } from '@/lib/utils';
import type { OrderRefundRow } from '@/lib/supabase/types';

interface CustomerActionButtonsProps {
  orderCode: string;
  status: string;
  paymentStatus: string;
  /** Latest refund row từ bảng order_refunds (mới nhất theo created_at). */
  latestRefund?: OrderRefundRow | null;
}

export function CustomerActionButtons({
  orderCode,
  status,
  paymentStatus,
  latestRefund = null,
}: CustomerActionButtonsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState<'cancel' | 'refund' | null>(null);
  const [reason, setReason] = useState('');

  // Refund state từ order_refunds table (Phase 5). Ưu tiên latestRefund.state
  // hơn paymentStatus (legacy), vì order_refunds có state machine đầy đủ.
  // Chỉ treat như "đang active" khi state ∈ {PENDING, APPROVED, FAILED}.
  const refundState = latestRefund?.state ?? null;
  const isRefundActive =
    refundState === 'PENDING' ||
    refundState === 'APPROVED' ||
    refundState === 'FAILED';
  const isRefundCompleted = refundState === 'COMPLETED';
  const isRefundRejected = refundState === 'REJECTED';

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
    !isRefundActive &&
    !isRefundCompleted &&
    (paymentStatus === 'PAID' || paymentStatus === 'AWAITING_CONFIRM');

  // Sau khi REJECTED → cho phép customer gửi yêu cầu MỚI
  const canRefundAfterRejection = isRefundRejected && v.refund && !isRefundActive;

  // Hiển thị banner dynamic theo refund state (ưu tiên state machine hơn paymentStatus)
  const showRefundBanner = isRefundActive || isRefundCompleted || isRefundRejected;

  // Không có button nào visible → return null
  if (!v.track && !v.invoice && !v.cancel && !canRefund && !canRefundAfterRejection && !showRefundBanner) {
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

        {/* Banner refund state machine (Phase 5) — ưu tiên order_refunds.state hơn paymentStatus */}
        {showRefundBanner && (
          <RefundStateBanner refund={latestRefund!} />
        )}

        {/* YÊU CẦU HOÀN TIỀN — WAITING_CONFIRM/CONFIRMED/SHIPPING khi đã thanh toán
            HOẶC sau khi admin REJECTED request cũ */}
        {(canRefund || canRefundAfterRejection) && (
          <button
            type="button"
            onClick={() => setShowReasonDialog('refund')}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 border border-warning/40 bg-transparent py-3 font-heading text-[11px] tracking-[0.15em] text-warning transition-all hover:bg-warning/5 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            {canRefundAfterRejection ? 'GỬI YÊU CẦU MỚI' : 'YÊU CẦU HOÀN TIỀN'}
          </button>
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

/**
 * Banner hiển thị trạng thái refund dựa trên order_refunds.state.
 * Phase 5 — thay thế banner "ĐANG CHỜ ADMIN HOÀN TIỀN" đơn giản bằng state
 * machine đầy đủ: PENDING / APPROVED / COMPLETED / FAILED / REJECTED.
 */
function RefundStateBanner({ refund }: { refund: OrderRefundRow }) {
  const state = refund.state;
  const refundAmount = refund.refund_amount != null ? Number(refund.refund_amount) : null;

  // Style + icon theo state
  switch (state) {
    case 'PENDING':
      return (
        <Banner tone="warning" icon={<Clock className="h-4 w-4" />}>
          <p className="font-heading text-[11px] tracking-[0.15em]">
            ĐÃ GỬI YÊU CẦU HOÀN TIỀN
          </p>
          <p className="mt-1 text-[10px] opacity-80">
            Admin sẽ duyệt trong vòng 24 giờ làm việc. Bạn sẽ nhận được thông báo khi có cập nhật.
          </p>
          {refund.customer_reason && (
            <p className="mt-2 text-[10px] italic opacity-70">
              Lý do của bạn: &ldquo;{refund.customer_reason}&rdquo;
            </p>
          )}
        </Banner>
      );
    case 'APPROVED':
      return (
        <Banner tone="info" icon={<CheckCircle2 className="h-4 w-4" />}>
          <p className="font-heading text-[11px] tracking-[0.15em]">
            ADMIN ĐÃ DUYỆT HOÀN TIỀN
          </p>
          <p className="mt-1 text-[10px] opacity-80">
            Số tiền{' '}
            {refundAmount !== null ? (
              <span className="font-bold">{formatVND(refundAmount)}</span>
            ) : (
              <span>đang cập nhật</span>
            )}{' '}
            sẽ được chuyển khoản về tài khoản của bạn trong 1-3 ngày làm việc.
          </p>
        </Banner>
      );
    case 'COMPLETED':
      return (
        <Banner tone="success" icon={<Banknote className="h-4 w-4" />}>
          <p className="font-heading text-[11px] tracking-[0.15em]">
            ĐÃ HOÀN TIỀN
          </p>
          {refundAmount !== null && (
            <p className="mt-1 text-[10px] opacity-90">
              Số tiền: <span className="font-bold">{formatVND(refundAmount)}</span>
              {refund.completed_at && (
                <>
                  {' '}
                  · Hoàn tất lúc{' '}
                  {new Date(refund.completed_at).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </>
              )}
            </p>
          )}
          {refund.bill_proof_url && (
            <a
              href={refund.bill_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[10px] underline opacity-90 hover:opacity-100"
            >
              Xem bill chuyển khoản →
            </a>
          )}
        </Banner>
      );
    case 'FAILED':
      return (
        <Banner tone="orange" icon={<AlertCircle className="h-4 w-4" />}>
          <p className="font-heading text-[11px] tracking-[0.15em]">
            CHUYỂN KHOẢN HOÀN TIỀN BỊ LỖI
          </p>
          <p className="mt-1 text-[10px] opacity-90">
            Admin đang xử lý và sẽ chuyển lại trong thời gian sớm nhất.
          </p>
          {refund.admin_decision_reason && (
            <p className="mt-1 text-[10px] italic opacity-70">
              Lý do: {refund.admin_decision_reason}
            </p>
          )}
        </Banner>
      );
    case 'REJECTED':
      return (
        <Banner tone="muted" icon={<ShieldX className="h-4 w-4" />}>
          <p className="font-heading text-[11px] tracking-[0.15em]">
            YÊU CẦU HOÀN TIỀN BỊ TỪ CHỐI
          </p>
          {refund.admin_decision_reason && (
            <p className="mt-1 text-[10px] italic opacity-90">
              Lý do: {refund.admin_decision_reason}
            </p>
          )}
          <p className="mt-2 text-[10px] opacity-80">
            Bạn có thể gửi yêu cầu mới nếu có thêm thông tin.
          </p>
        </Banner>
      );
    default:
      return null;
  }
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'warning' | 'info' | 'success' | 'orange' | 'muted';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClass = {
    warning: 'border-warning/30 bg-warning/5 text-warning',
    info: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
    success: 'border-success/30 bg-success/5 text-success',
    orange: 'border-orange-500/30 bg-orange-500/5 text-orange-400',
    muted: 'border-zinc-500/30 bg-zinc-500/5 text-zinc-400',
  }[tone];
  return (
    <div
      className={`flex flex-1 items-start gap-2 border ${toneClass} px-4 py-3`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-1 flex-col gap-1">{children}</div>
    </div>
  );
}
