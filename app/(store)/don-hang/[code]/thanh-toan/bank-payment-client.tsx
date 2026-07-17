'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2, AlertTriangle, Upload, CheckCircle2 } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import { toast } from '@/lib/toast/toast-store';

interface BankPaymentClientProps {
  orderCode: string;
  phone: string;
  qrImageUrl: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  transferContent: string;
  qrExpiresAt: string;
  userConfirmedAt: string | null;
  billImageUrl: string | null;
  orderStatus: string;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const target = new Date(expiresAt).getTime();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = target - now;
  const expired = diff <= 0;

  if (expired) {
    return (
      <div
        role="alert"
        className="mt-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          QR đã hết hạn. Vui lòng liên hệ admin qua Zalo hoặc email{' '}
          <a
            href="mailto:support@emerald-vault.vn"
            className="font-semibold underline underline-offset-2"
          >
            support@emerald-vault.vn
          </a>
          .
        </span>
      </div>
    );
  }

  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return (
    <p className="mt-4 text-center text-sm text-text-muted">
      QR còn hiệu lực:{' '}
      <span className="font-mono text-gold">
        {pad2(h)}:{pad2(m)}:{pad2(s)}
      </span>
    </p>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã copy ${label}`);
    } catch {
      toast.error('Không thể copy. Vui lòng copy thủ công.');
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded border border-gold/30 text-gold transition-colors hover:bg-gold/10"
      aria-label={`Copy ${label}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

export function BankPaymentClient(props: BankPaymentClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onConfirmPaid = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(props.orderCode)}/confirm-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: props.phone }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
        return;
      }
      toast.success('Đã ghi nhận', {
        description: 'Admin sẽ xác nhận trong ít phút.',
      });
      router.refresh();
    } catch {
      toast.error('Mất kết nối mạng.');
    } finally {
      setConfirming(false);
    }
  };

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset để chọn lại cùng 1 file
    if (!file) return;
    if (uploading) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append('phone', props.phone);
      form.append('userConfirmed', 'false');
      form.append('bill', file);

      const res = await fetch(
        `/api/orders/${encodeURIComponent(props.orderCode)}/bank-proof`,
        { method: 'POST', body: form }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.message ?? json.error ?? 'Upload thất bại.');
        return;
      }
      toast.success('Đã upload bill');
      router.refresh();
    } catch {
      toast.error('Upload thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const isWaitingConfirm = props.orderStatus === 'WAITING_CONFIRM';
  const userConfirmed = !!props.userConfirmedAt;

  return (
    <div>
      {/* QR card */}
      <div className="rounded-lg border-2 border-gold/30 bg-card p-6">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.qrImageUrl}
            alt="QR thanh toán VietQR"
            width={256}
            height={256}
            className="h-64 w-64 rounded-md bg-white p-2"
            onError={(e) => {
              // Ẩn QR + show fallback "nhập tay"
              const img = e.currentTarget;
              img.style.display = 'none';
              const fallback = document.getElementById('qr-fallback');
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
        </div>

        {/* Fallback khi QR ảnh fail (STK invalid, vietqr.io lỗi...) */}
        <div id="qr-fallback" className="hidden">
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-center">
            <p className="text-sm font-semibold text-amber-300">
              ⚠️ Không tải được mã QR
            </p>
            <p className="mt-2 text-xs text-text-muted">
              Vui lòng nhập thủ công thông tin bên dưới trong app ngân hàng:
            </p>
            <ul className="mt-2 space-y-1 text-left text-xs text-text-base">
              <li>
                <strong>Số TK:</strong> {props.accountNumber}
              </li>
              <li>
                <strong>Chủ TK:</strong> {props.accountName}
              </li>
              <li>
                <strong>Số tiền:</strong> {props.amount.toLocaleString('vi-VN')}đ
              </li>
              <li>
                <strong>Nội dung:</strong>{' '}
                <span className="font-mono font-bold text-gold">
                  {props.transferContent}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-text-muted">
          Quét QR bằng app ngân hàng bất kỳ
        </p>
        <Countdown expiresAt={props.qrExpiresAt} />
      </div>

      {/* Info grid */}
      <div className="mt-6 grid grid-cols-1 gap-3">
        <InfoRow label="Ngân hàng" value={props.bankName} copyValue={props.bankName} />
        <InfoRow
          label="Số tài khoản"
          value={props.accountNumber}
          copyValue={props.accountNumber}
          mono
        />
        <InfoRow
          label="Chủ tài khoản"
          value={props.accountName.toUpperCase()}
          copyValue={props.accountName.toUpperCase()}
        />
        <InfoRow
          label="Số tiền"
          value={formatVND(props.amount)}
          copyValue={String(props.amount)}
          highlight="gold"
        />
        <InfoRow
          label="Nội dung CK"
          value={props.transferContent}
          copyValue={props.transferContent}
          highlight="gold"
        />
      </div>

      {/* User already confirmed banner */}
      {userConfirmed && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Bạn đã báo &quot;đã chuyển&quot;. Đang chờ admin xác nhận. Bạn vẫn có thể upload bill
            để admin xử lý nhanh hơn.
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onConfirmPaid}
          disabled={confirming || isWaitingConfirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gold px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-gold-champagne disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {isWaitingConfirm ? 'Đã ghi nhận' : 'Tôi đã chuyển'}
        </button>

        <button
          type="button"
          onClick={onPickFile}
          disabled={uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-gold/40 bg-transparent px-5 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload bill
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {/* Help text */}
      <p className="mt-4 text-center text-sm text-text-muted">
        Sau khi chuyển khoản, bấm &quot;Tôi đã chuyển&quot; hoặc upload ảnh bill để admin xác
        nhận nhanh hơn.
      </p>
      <p className="mt-2 text-center text-sm text-text-muted">
        Quá 24h chưa nhận xác nhận? Liên hệ Zalo/email:&nbsp;
        <a
          href="mailto:support@emerald-vault.vn"
          className="text-gold underline underline-offset-2"
        >
          support@emerald-vault.vn
        </a>
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyValue,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  copyValue: string;
  mono?: boolean;
  highlight?: 'gold';
}) {
  const valueClass = highlight === 'gold'
    ? 'font-mono text-xl font-bold text-gold'
    : mono
      ? 'font-mono text-text-base'
      : 'text-text-base';

  return (
    <div className="flex items-center gap-2 rounded-md border border-gold/20 bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
        <p className={`mt-0.5 truncate ${valueClass}`}>{value}</p>
      </div>
      <CopyButton value={copyValue} label={label} />
    </div>
  );
}
