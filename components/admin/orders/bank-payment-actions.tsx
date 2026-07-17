'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast/toast-store';
import { ConfirmBankDialog } from '@/components/admin/orders/confirm-bank-dialog';
import { formatVND } from '@/lib/utils';

interface Props {
  orderId: string;
  amount: number;
}

export function BankPaymentActions({ orderId, amount }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message ?? `Lỗi ${res.status}`);
        return;
      }
      toast.success('Đã huỷ đơn hàng');
      setCancelOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error((e as Error).message ?? 'Lỗi mạng');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="button"
          variant="gold"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
        >
          Xác nhận đã nhận tiền · {formatVND(amount)}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setCancelOpen(true)}
          disabled={pending || cancelling}
          className="border-error/50 text-error hover:bg-error/10 hover:border-error"
        >
          Huỷ đơn
        </Button>
      </div>

      <ConfirmBankDialog
        orderId={orderId}
        amount={amount}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirmed={() => {
          setConfirmOpen(false);
          startTransition(() => router.refresh());
        }}
      />

      <Modal
        open={cancelOpen}
        onClose={() => {
          if (!cancelling) setCancelOpen(false);
        }}
        title="Huỷ đơn hàng"
        description="Đơn sẽ chuyển sang CANCELLED. Hành động này không thể hoàn tác."
        size="sm"
        variant="danger"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Không
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-error text-white hover:bg-error/90"
            >
              {cancelling ? 'Đang huỷ...' : 'Huỷ đơn'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#D0C5AF]/80">
          Bạn có chắc muốn huỷ đơn này? Nếu đã nhận tiền, vui lòng xác nhận trước.
        </p>
      </Modal>
    </>
  );
}
