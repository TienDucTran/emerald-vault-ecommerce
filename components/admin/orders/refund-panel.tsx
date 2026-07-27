'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Circle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast/toast-store';
import { formatVND } from '@/lib/utils';
import type { OrderRefundRow } from '@/lib/supabase/types';

// ────────────────────────────────────────────────────────────────────────────
// Admin Refund Panel
//
// Source of truth = bảng `order_refunds` (Phase 2). Component này render
// theo `refund.state` và dispatch POST /api/admin/orders/[id]/refund với
// action tương ứng: approve / reject / mark_completed / mark_failed.
//
// UI tokens: gold/champagne + glass card (giống BankPaymentCard).
// ────────────────────────────────────────────────────────────────────────────

export interface RefundPanelProps {
  orderId: string;
  orderCode: string;
  orderTotal: number;
  refund: OrderRefundRow | null;
}

const BADGE_CLASSES: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  APPROVED: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  COMPLETED: 'bg-green-500/20 border-green-500/40 text-green-300',
  FAILED: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  REJECTED: 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400',
};

const BADGE_LABEL: Record<string, string> = {
  PENDING: 'YÊU CẦU HOÀN TIỀN',
  APPROVED: 'ĐÃ DUYỆT',
  COMPLETED: 'ĐÃ HOÀN TIỀN',
  FAILED: 'CK LỖI',
  REJECTED: 'ĐÃ TỪ CHỐI',
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Trả về số giờ còn lại trước khi SLA escalate (>24h kể từ createdAt). */
function computeSlaHoursLeft(createdAtIso: string, nowMs?: number): number {
  const created = new Date(createdAtIso).getTime();
  const now = nowMs ?? Date.now();
  return Math.max(0, 24 - (now - created) / 3600000);
}

function formatSlaHours(hours: number): string {
  if (hours <= 0) return 'Đã quá SLA (>24h)';
  if (hours >= 1) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `Còn khoảng ${h} giờ ${m} phút trước khi SLA escalate (>24h)` : `Còn khoảng ${h} giờ trước khi SLA escalate (>24h)`;
  }
  const m = Math.max(1, Math.round(hours * 60));
  return `Còn khoảng ${m} phút trước khi SLA escalate (>24h)`;
}

export function RefundPanel({ orderId, orderCode, orderTotal, refund }: RefundPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  // Empty state
  if (!refund) {
    return (
      <section
        className="p-5 rounded-sm space-y-3"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <div className="flex items-center justify-between border-b border-[#4D4635]/40 pb-2">
          <h2 className="font-heading text-xs tracking-[0.15em] uppercase text-gold/80">
            Hoàn tiền
          </h2>
        </div>
        <p className="text-sm text-[#D0C5AF]/50 py-3 text-center">
          Chưa có yêu cầu hoàn tiền cho đơn{' '}
          <span className="font-mono text-gold/70">{orderCode}</span>.
        </p>
      </section>
    );
  }

  const badgeClass = BADGE_CLASSES[refund.state] ?? BADGE_CLASSES.REJECTED;
  const badgeLabel = BADGE_LABEL[refund.state] ?? refund.state;

  return (
    <section
      className="p-5 rounded-sm space-y-5"
      style={{
        background: 'rgba(18, 36, 28, 0.6)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(241, 229, 172, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#4D4635]/40 pb-2">
        <h2 className="font-heading text-xs tracking-[0.15em] uppercase text-gold/80">
          Hoàn tiền
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-heading text-[10px] tracking-[0.15em] ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Customer info (chung cho tất cả non-terminal) */}
      {refund.customer_reason && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Lý do khách yêu cầu
          </p>
          <p className="text-sm text-[#EAE1D4] italic">&ldquo;{refund.customer_reason}&rdquo;</p>
        </div>
      )}

      {/* === PENDING === */}
      {refund.state === 'PENDING' && (
        <PendingBlock
          refund={refund}
          onApprove={() => setApproveOpen(true)}
          onReject={() => setRejectOpen(true)}
        />
      )}

      {/* === APPROVED === */}
      {refund.state === 'APPROVED' && (
        <ApprovedBlock
          refund={refund}
          onMarkCompleted={() => setCompleteOpen(true)}
          onMarkFailed={() => setFailedOpen(true)}
        />
      )}

      {/* === COMPLETED === */}
      {refund.state === 'COMPLETED' && <CompletedBlock refund={refund} />}

      {/* === FAILED === */}
      {refund.state === 'FAILED' && (
        <FailedBlock
          refund={refund}
          onRetry={() => setCompleteOpen(true)}
        />
      )}

      {/* === REJECTED === */}
      {refund.state === 'REJECTED' && <RejectedBlock refund={refund} />}

      {/* Modals */}
      <RefundApproveModal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        orderId={orderId}
        orderTotal={orderTotal}
        onApproved={() => {
          setApproveOpen(false);
          toast.success('Đã duyệt yêu cầu hoàn tiền');
          refresh();
        }}
      />
      <RefundRejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        orderId={orderId}
        onRejected={() => {
          setRejectOpen(false);
          toast.success('Đã từ chối yêu cầu hoàn tiền');
          refresh();
        }}
      />
      <RefundCompleteModal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        orderId={orderId}
        onCompleted={() => {
          setCompleteOpen(false);
          toast.success('Đã đánh dấu hoàn tất hoàn tiền');
          refresh();
        }}
      />
      <RefundFailedModal
        open={failedOpen}
        onClose={() => setFailedOpen(false)}
        orderId={orderId}
        onFailed={() => {
          setFailedOpen(false);
          toast.success('Đã đánh dấu CK lỗi — bạn có thể retry');
          refresh();
        }}
      />
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// State-specific blocks
// ────────────────────────────────────────────────────────────────────────────

function PendingBlock({
  refund,
  onApprove,
  onReject,
}: {
  refund: OrderRefundRow;
  onApprove: () => void;
  onReject: () => void;
}) {
  const hoursLeft = useMemo(
    () => computeSlaHoursLeft(refund.created_at),
    [refund.created_at]
  );
  const overSla = hoursLeft <= 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Thời điểm yêu cầu
          </p>
          <p className="text-sm text-[#EAE1D4] mt-1">
            {formatDateTime(refund.customer_requested_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">SLA</p>
          <p
            className={`text-sm mt-1 ${overSla ? 'text-error font-medium' : 'text-gold'}`}
          >
            {formatSlaHours(hoursLeft)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="button" variant="gold" onClick={onApprove}>
          Duyệt
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReject}
          className="border-error/50 text-error hover:bg-error/10 hover:border-error"
        >
          Từ chối
        </Button>
      </div>
    </div>
  );
}

function ApprovedBlock({
  refund,
  onMarkCompleted,
  onMarkFailed,
}: {
  refund: OrderRefundRow;
  onMarkCompleted: () => void;
  onMarkFailed: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Thời điểm duyệt
          </p>
          <p className="text-sm text-[#EAE1D4] mt-1">
            {formatDateTime(refund.admin_decision_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Admin xử lý
          </p>
          <p className="text-sm text-[#EAE1D4] font-mono mt-1 break-all">
            {refund.admin_id ?? '—'}
          </p>
        </div>
      </div>

      <div className="border-t border-[#4D4635]/30 pt-4">
        <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40 mb-2">
          Thông tin hoàn tiền
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
              Số tiền hoàn
            </p>
            <p className="text-base text-gold font-heading font-bold mt-1">
              {refund.refund_amount != null ? formatVND(Number(refund.refund_amount)) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
              Ngân hàng nhận
            </p>
            <p className="text-sm text-[#EAE1D4] mt-1">
              {refund.bank_name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
              Số tài khoản
            </p>
            <p className="text-sm text-[#EAE1D4] font-mono mt-1">
              {refund.bank_account_number ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
              Chủ tài khoản
            </p>
            <p className="text-sm text-[#EAE1D4] mt-1">
              {refund.bank_account_name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="button" variant="gold" onClick={onMarkCompleted}>
          Đánh dấu đã CK
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onMarkFailed}
          className="border-orange-500/50 text-orange-300 hover:bg-orange-500/10 hover:border-orange-500"
        >
          Đánh dấu CK lỗi
        </Button>
      </div>
    </div>
  );
}

function CompletedBlock({ refund }: { refund: OrderRefundRow }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Số tiền đã hoàn
          </p>
          <p className="text-base text-green-300 font-heading font-bold mt-1">
            {refund.refund_amount != null ? formatVND(Number(refund.refund_amount)) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Thời điểm hoàn tất
          </p>
          <p className="text-sm text-[#EAE1D4] mt-1">
            {formatDateTime(refund.completed_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Admin xử lý
          </p>
          <p className="text-sm text-[#EAE1D4] font-mono mt-1 break-all">
            {refund.admin_id ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Tài khoản nhận
          </p>
          <p className="text-sm text-[#EAE1D4] mt-1">
            {refund.bank_name ?? '—'} ·{' '}
            <span className="font-mono">{refund.bank_account_number ?? '—'}</span>
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="pt-2 border-t border-[#4D4635]/30">
        <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40 mb-3">
          Tiến trình
        </p>
        <ol className="relative space-y-3 pl-6 border-l border-[#4D4635]/40">
          <TimelineStep
            done
            label="Khách yêu cầu hoàn tiền"
            timestamp={refund.customer_requested_at}
          />
          <TimelineStep
            done={Boolean(refund.admin_decision_at)}
            label="Admin duyệt"
            timestamp={refund.admin_decision_at}
            subLabel={refund.admin_id ?? undefined}
          />
          <TimelineStep
            done={Boolean(refund.completed_at)}
            label="Hoàn tất CK"
            timestamp={refund.completed_at}
          />
        </ol>
      </div>

      {/* Bill proof thumbnail */}
      {refund.bill_proof_url && (
        <div className="pt-2 border-t border-[#4D4635]/30">
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40 mb-2">
            Bill CK hoàn (admin upload)
          </p>
          <a
            href={refund.bill_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block relative h-[200px] w-[200px] rounded-sm border border-[#4D4635]/40 overflow-hidden hover:border-gold/60 transition-colors"
            style={{ background: 'rgba(31,27,19,0.4)' }}
            title="Click để xem full size"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={refund.bill_proof_url}
              alt="Bill CK hoàn"
              className="h-full w-full object-contain"
            />
          </a>
        </div>
      )}
    </div>
  );
}

function FailedBlock({
  refund,
  onRetry,
}: {
  refund: OrderRefundRow;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Thời điểm đánh dấu lỗi
          </p>
          <p className="text-sm text-[#EAE1D4] mt-1">
            {formatDateTime(refund.failed_at ?? refund.admin_decision_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Số tiền dự kiến
          </p>
          <p className="text-base text-gold font-heading font-bold mt-1">
            {refund.refund_amount != null ? formatVND(Number(refund.refund_amount)) : '—'}
          </p>
        </div>
      </div>

      {refund.admin_decision_reason && (
        <div
          className="p-3 rounded-sm border border-orange-500/30 text-sm"
          style={{ background: 'rgba(249,115,22,0.06)' }}
        >
          <p className="text-[10px] uppercase tracking-wider text-orange-300/80 mb-1 inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Lý do CK lỗi
          </p>
          <p className="text-[#EAE1D4] italic">&ldquo;{refund.admin_decision_reason}&rdquo;</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="button"
          variant="gold"
          onClick={onRetry}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Đánh dấu đã CK lại
        </Button>
      </div>
    </div>
  );
}

function RejectedBlock({ refund }: { refund: OrderRefundRow }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Thời điểm từ chối
          </p>
          <p className="text-sm text-[#EAE1D4] mt-1">
            {formatDateTime(refund.rejected_at ?? refund.admin_decision_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/40">
            Admin xử lý
          </p>
          <p className="text-sm text-[#EAE1D4] font-mono mt-1 break-all">
            {refund.admin_id ?? '—'}
          </p>
        </div>
      </div>

      {refund.admin_decision_reason && (
        <div
          className="p-3 rounded-sm border border-zinc-500/30 text-sm"
          style={{ background: 'rgba(113,113,122,0.08)' }}
        >
          <p className="text-[10px] uppercase tracking-wider text-zinc-400/80 mb-1">
            Lý do từ chối
          </p>
          <p className="text-[#EAE1D4] italic">&ldquo;{refund.admin_decision_reason}&rdquo;</p>
        </div>
      )}

      <p className="text-xs text-[#D0C5AF]/60 italic">
        Khách có thể gửi yêu cầu hoàn tiền mới cho đơn này.
      </p>
    </div>
  );
}

function TimelineStep({
  done,
  label,
  timestamp,
  subLabel,
}: {
  done: boolean;
  label: string;
  timestamp: string | null;
  subLabel?: string;
}) {
  return (
    <li className="relative">
      <span
        className={
          'absolute -left-[33px] top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border ' +
          (done
            ? 'border-gold bg-gold/20 text-gold'
            : 'border-[#4D4635] bg-[#1F1B13] text-[#D0C5AF]/40')
        }
        aria-hidden
      >
        {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      </span>
      <p className={'text-sm ' + (done ? 'text-[#EAE1D4]' : 'text-[#D0C5AF]/50')}>
        {label}
      </p>
      {timestamp ? (
        <p className="text-[10px] text-[#D0C5AF]/50 mt-0.5">
          {formatDateTime(timestamp)}
          {subLabel ? <span className="font-mono"> · {subLabel}</span> : null}
        </p>
      ) : (
        <p className="text-[10px] text-[#D0C5AF]/30 mt-0.5 italic">Chưa xảy ra</p>
      )}
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Modals
// ────────────────────────────────────────────────────────────────────────────

async function postRefund(
  orderId: string,
  body: unknown
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: json?.message ?? `Lỗi ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error).message ?? 'Lỗi mạng' };
  }
}

function RefundApproveModal({
  open,
  onClose,
  orderId,
  orderTotal,
  onApproved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  onApproved: () => void;
}) {
  const [refundAmount, setRefundAmount] = useState<string>(String(orderTotal));
  const [bankName, setBankName] = useState<string>('Eximbank');
  const [bankAccountName, setBankAccountName] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const amount = Number(refundAmount);
  const amountValid = Number.isFinite(amount) && amount >= 1000 && amount <= orderTotal;
  const nameValid = bankAccountName.trim().length > 0 && bankAccountName.length <= 200;
  const accountValid =
    /^[0-9]{4,50}$/.test(bankAccountNumber.trim());
  const bankValid = bankName.trim().length > 0 && bankName.length <= 200;
  const formValid = amountValid && nameValid && accountValid && bankValid;

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!formValid) return;
    setLoading(true);
    const result = await postRefund(orderId, {
      action: 'approve',
      refund_amount: amount,
      bank_account_name: bankAccountName.trim(),
      bank_account_number: bankAccountNumber.trim(),
      bank_name: bankName.trim(),
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message ?? 'Duyệt thất bại');
      return;
    }
    onApproved();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Duyệt yêu cầu hoàn tiền"
      description="Xác nhận số tiền và thông tin tài khoản nhận hoàn."
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Huỷ
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleSubmit}
            disabled={!formValid || loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </span>
            ) : (
              'Duyệt hoàn tiền'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          className="p-3 rounded-sm border border-gold/30 text-sm"
          style={{ background: 'rgba(242,202,80,0.06)' }}
        >
          <p className="text-[10px] uppercase tracking-wider text-[#D0C5AF]/50 mb-1">
            Tổng đơn
          </p>
          <p className="font-heading text-xl font-bold text-gold">{formatVND(orderTotal)}</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-wider text-[#D0C5AF]/60">
            Số tiền hoàn (VND)
          </label>
          <input
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            min={1000}
            max={orderTotal}
            step={1000}
            disabled={loading}
            className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] text-sm text-[#EAE1D4] px-3 py-2 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 disabled:opacity-50"
          />
          {refundAmount && !amountValid && (
            <p className="text-[11px] text-error">
              Số tiền phải từ 1.000 đến {formatVND(orderTotal)}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-wider text-[#D0C5AF]/60">
            Ngân hàng nhận
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            maxLength={200}
            disabled={loading}
            placeholder="vd: Eximbank"
            className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] text-sm text-[#EAE1D4] placeholder:text-[#D0C5AF]/30 px-3 py-2 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-wider text-[#D0C5AF]/60">
            Số tài khoản
          </label>
          <input
            type="text"
            value={bankAccountNumber}
            onChange={(e) =>
              setBankAccountNumber(e.target.value.replace(/[^0-9]/g, ''))
            }
            maxLength={50}
            disabled={loading}
            placeholder="vd: 210014852021001"
            className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] text-sm text-[#EAE1D4] font-mono placeholder:text-[#D0C5AF]/30 px-3 py-2 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 disabled:opacity-50"
          />
          {bankAccountNumber && !accountValid && (
            <p className="text-[11px] text-error">STK phải là 4–50 chữ số.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-wider text-[#D0C5AF]/60">
            Chủ tài khoản
          </label>
          <input
            type="text"
            value={bankAccountName}
            onChange={(e) => setBankAccountName(e.target.value)}
            maxLength={200}
            disabled={loading}
            placeholder="vd: NGUYEN VAN A"
            className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] text-sm text-[#EAE1D4] placeholder:text-[#D0C5AF]/30 px-3 py-2 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 disabled:opacity-50 uppercase"
          />
        </div>
      </div>
    </Modal>
  );
}

function RefundRejectModal({
  open,
  onClose,
  orderId,
  onRejected,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const reasonValid = reason.trim().length >= 10 && reason.length <= 500;
  const formValid = reasonValid;

  const handleClose = () => {
    if (loading) return;
    setReason('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!formValid) return;
    setLoading(true);
    const result = await postRefund(orderId, {
      action: 'reject',
      reason: reason.trim(),
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message ?? 'Từ chối thất bại');
      return;
    }
    onRejected();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Từ chối yêu cầu hoàn tiền"
      description="Lý do từ chối sẽ được lưu vào lịch sử — tối thiểu 10 ký tự."
      size="md"
      variant="danger"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Huỷ
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!formValid || loading}
            className="bg-error text-white hover:bg-error/90"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </span>
            ) : (
              'Từ chối'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <label className="block text-[10px] uppercase tracking-wider text-[#D0C5AF]/60">
          Lý do từ chối
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={10}
          maxLength={500}
          rows={4}
          disabled={loading}
          placeholder="vd: Sản phẩm đã qua sử dụng, không đủ điều kiện hoàn."
          className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] text-sm text-[#EAE1D4] placeholder:text-[#D0C5AF]/30 px-3 py-2 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 disabled:opacity-50 resize-y"
        />
        <div className="flex items-center justify-between text-[11px]">
          <span className={reasonValid || reason.length === 0 ? 'text-[#D0C5AF]/40' : 'text-error'}>
            Tối thiểu 10 ký tự.
          </span>
          <span className="text-[#D0C5AF]/40">{reason.length}/500</span>
        </div>
      </div>
    </Modal>
  );
}

function RefundCompleteModal({
  open,
  onClose,
  orderId,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onCompleted: () => void;
}) {
  const [billProofUrl, setBillProofUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const urlValid = (() => {
    try {
      const u = new URL(billProofUrl.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  })();

  const handleClose = () => {
    if (loading) return;
    setBillProofUrl('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!urlValid) return;
    setLoading(true);
    const result = await postRefund(orderId, {
      action: 'mark_completed',
      bill_proof_url: billProofUrl.trim(),
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message ?? 'Hoàn tất thất bại');
      return;
    }
    onCompleted();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Đánh dấu đã chuyển khoản hoàn"
      description="Dán URL bill chuyển khoản (ảnh/PDF) để lưu làm bằng chứng."
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Huỷ
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleSubmit}
            disabled={!urlValid || loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </span>
            ) : (
              'Xác nhận hoàn tất'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <label className="block text-[10px] uppercase tracking-wider text-[#D0C5AF]/60">
          URL bill CK hoàn
        </label>
        <input
          type="url"
          value={billProofUrl}
          onChange={(e) => setBillProofUrl(e.target.value)}
          maxLength={2000}
          disabled={loading}
          placeholder="https://..."
          className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] text-sm text-[#EAE1D4] placeholder:text-[#D0C5AF]/30 px-3 py-2 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 disabled:opacity-50"
        />
        {billProofUrl && !urlValid && (
          <p className="text-[11px] text-error">URL không hợp lệ (phải bắt đầu bằng http/https).</p>
        )}
        <p className="text-[11px] text-[#D0C5AF]/40 pt-1">
          Upload UI sẽ được tích hợp sau — hiện tại paste URL trực tiếp.
        </p>
        {urlValid && (
          <a
            href={billProofUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 pt-1"
          >
            <ExternalLink className="h-3 w-3" /> Xem trước
          </a>
        )}
      </div>
    </Modal>
  );
}

function RefundFailedModal({
  open,
  onClose,
  orderId,
  onFailed,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onFailed: () => void;
}) {
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const reasonValid = reason.trim().length >= 1 && reason.length <= 500;
  const formValid = reasonValid;

  const handleClose = () => {
    if (loading) return;
    setReason('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!formValid) return;
    setLoading(true);
    const result = await postRefund(orderId, {
      action: 'mark_failed',
      reason: reason.trim(),
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message ?? 'Đánh dấu lỗi thất bại');
      return;
    }
    onFailed();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Đánh dấu CK lỗi"
      description="Ghi rõ lý do để khách hàng / admin retry hiểu được vấn đề."
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Huỷ
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!formValid || loading}
            className="bg-orange-500 text-white hover:bg-orange-500/90"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </span>
            ) : (
              'Đánh dấu lỗi'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <label className="block text-[10px] uppercase tracking-wider text-[#D0C5AF]/60">
          Lý do CK lỗi
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={4}
          disabled={loading}
          placeholder="vd: STK khách bị khoá, không nhận được tiền."
          className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] text-sm text-[#EAE1D4] placeholder:text-[#D0C5AF]/30 px-3 py-2 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 disabled:opacity-50 resize-y"
        />
        <div className="flex items-center justify-end text-[11px]">
          <span className="text-[#D0C5AF]/40">{reason.length}/500</span>
        </div>
      </div>
    </Modal>
  );
}
