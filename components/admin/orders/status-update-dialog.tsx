'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast/toast-store';
import type { OrderStatus } from '@/lib/supabase/types';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DONE'],
  DONE: [],
  CANCELLED: [],
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'Mới',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DONE: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
};

const STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  NEW: 'Đơn vừa được tạo, chờ xác nhận.',
  CONFIRMED: 'Đã xác nhận thông tin & thanh toán (nếu có).',
  SHIPPING: 'Đơn đang được vận chuyển đến khách.',
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

  const availableTransitions = useMemo<OrderStatus[]>(
    () => ALLOWED_TRANSITIONS[currentStatus] ?? [],
    [currentStatus]
  );

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    setOpen(next);
    if (!next) setNewStatus(null);
  };

  const handleSubmit = async () => {
    if (!newStatus) {
      toast.error('Vui lòng chọn trạng thái mới');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? `Lỗi ${res.status}`);
        return;
      }
      toast.success(
        `Đã cập nhật: ${STATUS_LABEL[currentStatus]} → ${STATUS_LABEL[newStatus]}`
      );
      onUpdated?.(newStatus);
      setOpen(false);
      setNewStatus(null);
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
            : `Trạng thái hiện tại: ${STATUS_LABEL[currentStatus]} (${currentStatus})`
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
              disabled={loading || !newStatus}
            >
              {loading ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </>
        }
      >
        {noTransitions ? (
          <p className="text-sm text-[#D0C5AF]/60">
            Đơn hàng ở trạng thái <strong>{STATUS_LABEL[currentStatus]}</strong> —
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
                      {STATUS_LABEL[s]}{' '}
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
      </Modal>
    </>
  );
}
