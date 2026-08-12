'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast/toast-store';
import type { OrderStatus } from '@/lib/supabase/types';
import { getOrderStatusMeta } from '@/lib/order/status';
import { CARRIER_LABELS } from '@/lib/order/timeline';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  WAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  WAITING_CONFIRM: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DONE'],
  DONE: [],
  CANCELLED: [],
};

const STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  NEW: 'Đơn vừa được tạo, chờ xác nhận.',
  WAITING_PAYMENT: 'Khách đang chờ thanh toán (BANK_TRANSFER đã tạo QR).',
  WAITING_CONFIRM: 'Khách đã báo đã CK, chờ admin xác nhận.',
  CONFIRMED: 'Đã xác nhận thông tin & thanh toán (nếu có).',
  SHIPPING: 'Đơn đang được vận chuyển đến khách. Cần nhập mã vận đơn.',
  DONE: 'Đơn đã giao thành công, đóng đơn.',
  CANCELLED: 'Đơn bị huỷ — không thể chuyển trạng thái khác.',
};

export interface StatusUpdateDialogProps {
  orderId: string;
  currentStatus: OrderStatus;
  onUpdated?: (newStatus: OrderStatus) => void;
}

export function StatusUpdateDialog({
  orderId,
  currentStatus,
  onUpdated,
}: StatusUpdateDialogProps) {
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Shipping form fields
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const availableTransitions = useMemo<OrderStatus[]>(
    () => ALLOWED_TRANSITIONS[currentStatus] ?? [],
    [currentStatus]
  );

  const isShipping = newStatus === 'SHIPPING';
  const isCancelled = newStatus === 'CANCELLED';

  // Validate shipping form
  const shippingValid = !isShipping || (carrier.trim() && trackingNumber.trim());

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    setOpen(next);
    if (!next) {
      setNewStatus(null);
      setCarrier('');
      setTrackingNumber('');
      setTrackingUrl('');
      setAdminNote('');
    }
  };

  const handleSubmit = async () => {
    if (!newStatus) {
      toast.error('Vui lòng chọn trạng thái mới');
      return;
    }
    if (isShipping && (!carrier.trim() || !trackingNumber.trim())) {
      toast.error('Vui lòng nhập đơn vị vận chuyển và mã vận đơn');
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (isShipping) {
        body.carrier = carrier.trim();
        body.trackingNumber = trackingNumber.trim();
        if (trackingUrl.trim()) body.trackingUrl = trackingUrl.trim();
      }
      if (isCancelled && adminNote.trim()) {
        body.adminNote = adminNote.trim();
      }

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? `Lỗi ${res.status}`);
        return;
      }
      toast.success(
        `Đã cập nhật: ${getOrderStatusMeta(currentStatus).label} → ${getOrderStatusMeta(newStatus).label}`
      );
      onUpdated?.(newStatus);
      setOpen(false);
      setNewStatus(null);
      setCarrier('');
      setTrackingNumber('');
      setTrackingUrl('');
      setAdminNote('');
    } catch (e) {
      toast.error((e as Error).message ?? 'Lỗi mạng');
    } finally {
      setLoading(false);
    }
  };

  const noTransitions = availableTransitions.length === 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={noTransitions}
        title={noTransitions ? 'Đơn đã đóng, không thể đổi trạng thái' : undefined}
      >
        Cập nhật trạng thái
      </Button>
      <Modal
        open={open}
        onClose={() => handleOpenChange(false)}
        title="Cập nhật trạng thái đơn hàng"
        description={
          noTransitions
            ? 'Đơn hàng đã ở trạng thái cuối, không thể chuyển tiếp.'
            : `Trạng thái hiện tại: ${getOrderStatusMeta(currentStatus).label} (${currentStatus})`
        }
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || !newStatus || !shippingValid}
            >
              {loading ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </>
        }
      >
        {noTransitions ? (
          <p className="text-sm text-[#D0C5AF]/60">
            Đơn hàng ở trạng thái <strong>{getOrderStatusMeta(currentStatus).label}</strong> —
            không có trạng thái kế tiếp hợp lệ.
          </p>
        ) : (
          <div className="space-y-3" role="radiogroup" aria-label="Trạng thái mới">
            {availableTransitions.map((s) => {
              const checked = newStatus === s;
              return (
                <label
                  key={s}
                  className="flex items-start gap-3 p-3 rounded-sm border border-[#4D4635]/30 hover:border-gold/40 cursor-pointer transition-colors"
                  style={{
                    background: checked ? 'rgba(242,202,80,0.06)' : 'rgba(31,27,19,0.4)',
                  }}
                >
                  <input
                    type="radio"
                    name="order-status"
                    value={s}
                    checked={checked}
                    onChange={() => setNewStatus(s)}
                    disabled={loading}
                    className="mt-1 accent-gold"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-[#EAE1D4] font-medium">
                      {getOrderStatusMeta(s).label}{' '}
                      <span className="text-[10px] text-gold/60 ml-1">({s})</span>
                    </div>
                    <p className="text-[11px] text-[#D0C5AF]/50 mt-0.5">
                      {STATUS_DESCRIPTION[s]}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Shipping form — chỉ hiện khi chọn SHIPPING */}
        {isShipping && (
          <div className="mt-4 space-y-3 border-t border-[#4D4635]/30 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-gold/80 font-heading">
              Thông tin vận chuyển
            </p>

            {/* Carrier dropdown */}
            <div>
              <label className="mb-1 block text-[11px] text-[#D0C5AF]/60">
                Đơn vị vận chuyển <span className="text-error">*</span>
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                disabled={loading}
                className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] px-3 py-2 text-sm text-[#EAE1D4] focus:border-gold/40 focus:outline-none"
              >
                <option value="">— Chọn đơn vị —</option>
                {Object.entries(CARRIER_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tracking number */}
            <div>
              <label className="mb-1 block text-[11px] text-[#D0C5AF]/60">
                Mã vận đơn <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={loading}
                placeholder="VD: GHN12345678"
                className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] px-3 py-2 text-sm text-[#EAE1D4] focus:border-gold/40 focus:outline-none"
              />
            </div>

            {/* Tracking URL (optional) */}
            <div>
              <label className="mb-1 block text-[11px] text-[#D0C5AF]/60">
                Link tra cứu (tùy chọn — tự sinh nếu bỏ trống)
              </label>
              <input
                type="text"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                disabled={loading}
                placeholder="https://..."
                className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] px-3 py-2 text-sm text-[#EAE1D4] focus:border-gold/40 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Cancel note — chỉ hiện khi chọn CANCELLED */}
        {isCancelled && (
          <div className="mt-4 space-y-2 border-t border-[#4D4635]/30 pt-4">
            <label className="block text-[11px] text-[#D0C5AF]/60">
              Lý do hủy (tùy chọn)
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              disabled={loading}
              rows={2}
              placeholder="VD: Khách đổi ý, hết hàng..."
              className="w-full resize-none rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] px-3 py-2 text-sm text-[#EAE1D4] focus:border-gold/40 focus:outline-none"
            />
          </div>
        )}
      </Modal>
    </>
  );
}
