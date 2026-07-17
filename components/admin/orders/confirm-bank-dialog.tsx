'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast/toast-store';
import { formatVND } from '@/lib/utils';

export interface ConfirmBankDialogProps {
  orderId: string;
  amount: number;
  open: boolean;
  onClose: () => void;
  onConfirmed: (result: { order: unknown; bankTransfer: unknown }) => void;
}

export function ConfirmBankDialog({
  orderId,
  amount,
  open,
  onClose,
  onConfirmed,
}: ConfirmBankDialogProps) {
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setAdminNote('');
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_bank_payment',
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? `Lỗi ${res.status}`);
        return;
      }
      toast.success('Đã xác nhận nhận tiền — đơn chuyển sang CONFIRMED');
      onConfirmed({ order: json.order, bankTransfer: json.bankTransfer });
      setAdminNote('');
    } catch (e) {
      toast.error((e as Error).message ?? 'Lỗi mạng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Xác nhận đã nhận tiền"
      description="Bạn đã verify đúng số tiền vào tài khoản ngân hàng?"
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </span>
            ) : (
              'Xác nhận'
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
            Số tiền cần verify
          </p>
          <p className="font-heading text-xl font-bold text-gold">
            {formatVND(amount)}
          </p>
        </div>

        <p className="text-xs text-[#D0C5AF]/70">
          Hành động này sẽ:
        </p>
        <ul className="text-xs text-[#D0C5AF]/70 list-disc list-inside space-y-0.5">
          <li>Đánh dấu bank_transfer đã admin xác nhận</li>
          <li>Chuyển đơn sang <span className="text-gold">CONFIRMED</span> + payment <span className="text-gold">PAID</span></li>
          <li>Đổi sản phẩm trong đơn sang SOLD_OUT</li>
          <li>Convert inventory_locks ACTIVE → CONVERTED</li>
        </ul>

        <div className="space-y-1.5 pt-1">
          <label
            htmlFor="admin-note"
            className="block text-[10px] uppercase tracking-wider text-[#D0C5AF]/60"
          >
            Ghi chú admin (optional)
          </label>
          <textarea
            id="admin-note"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            disabled={loading}
            rows={3}
            maxLength={500}
            placeholder="vd: đã nhận qua app MB lúc 14:30"
            className="w-full rounded-sm border border-[#4D4635]/40 bg-[#1F1B13] text-sm text-[#EAE1D4] placeholder:text-[#D0C5AF]/30 px-3 py-2 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 disabled:opacity-50 resize-y"
          />
        </div>
      </div>
    </Modal>
  );
}
