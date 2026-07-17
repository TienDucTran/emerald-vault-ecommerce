// Trang thanh toán cho đơn BANK_TRANSFER: hiển thị QR VietQR + countdown + nút
// "Tôi đã chuyển" / "Upload bill".
//
// Flow:
//   - Server fetch order + bank_transfers theo code.
//   - Redirect nếu order không phải BANK_TRANSFER hoặc đã quá giai đoạn CK.
//   - Client subcomponent xử lý copy + countdown + upload + confirm.

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBankByCode } from '@/lib/bank/types';
import { BankPaymentClient } from './bank-payment-client';

export const dynamic = 'force-dynamic';

/**
 * Normalize phone về dạng chỉ còn chữ số, quy về prefix 0xxx để so sánh.
 * - Loại bỏ mọi ký tự không phải số (khoảng trắng, dấu gạch, +).
 * - Nếu bắt đầu bằng "84" và đủ 11 số (VD: 84924825726) thì đổi thành 0xxx.
 * - Trả về chuỗi digits thuần để so sánh lỏng lẻo giữa DB và URL.
 */
function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, '');
  // 84924825726 → 0924825726
  if (digits.startsWith('84') && digits.length === 11) {
    return '0' + digits.slice(2);
  }
  return digits;
}

interface PageProps {
  params: { code: string };
  searchParams: { phone?: string };
}

export default async function BankPaymentPage({ params, searchParams }: PageProps) {
  const code = decodeURIComponent(params.code);
  const phone = (searchParams.phone ?? '').trim();

  if (!phone) {
    // Bắt buộc có phone để xác minh (guest lookup pattern).
    redirect(`/don-hang/${encodeURIComponent(code)}`);
  }

  const supabase = createClient();
  const db = supabase as any;

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select(
      'id, code, customer_name, customer_phone, total_amount, payment_method, status, created_at'
    )
    .eq('code', code)
    .maybeSingle();

  if (orderErr) {
    return (
      <div className="container mx-auto px-4 py-20">
        <p className="text-center text-red-400">Không tải được đơn hàng. Vui lòng thử lại.</p>
      </div>
    );
  }
  if (!order) {
    notFound();
  }
  // So sánh phone sau khi normalize để tránh lệch do +84, khoảng trắng, v.v.
  const dbPhone = normalizePhone(order.customer_phone);
  const urlPhone = normalizePhone(phone);
  if (dbPhone !== urlPhone || dbPhone.length < 8) {
    notFound();
  }

  if (order.payment_method !== 'BANK_TRANSFER') {
    redirect(`/don-hang/${encodeURIComponent(code)}`);
  }

  // Nếu đã qua giai đoạn CK (admin confirm hoặc đang ship) → quay về trang đơn.
  if (['CONFIRMED', 'SHIPPING', 'DONE'].includes(order.status)) {
    redirect(`/don-hang/${encodeURIComponent(code)}`);
  }

  const { data: bt, error: btErr } = await db
    .from('bank_transfers')
    .select(
      'id, qr_image_url, bank_code, account_number, account_name, amount, transfer_content, qr_expires_at, user_confirmed_at, bill_image_url, bill_uploaded_at, admin_confirmed_at'
    )
    .eq('order_id', order.id)
    .maybeSingle();

  if (btErr) {
    return (
      <div className="container mx-auto px-4 py-20">
        <p className="text-center text-red-400">Không tải được thông tin CK. Vui lòng thử lại.</p>
      </div>
    );
  }
  if (!bt) {
    // Debug log - giúp truy vết khi thiếu bank_transfers cho đơn BANK_TRANSFER.
    // Có thể bỏ sau khi đã ổn định flow tạo row ở checkout.
    console.error('[bank-payment] bank_transfers not found for order:', order.id, order.code);
    notFound();
  }

  const bankMeta = getBankByCode(bt.bank_code);
  const bankName = bankMeta?.name ?? bt.bank_code;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="font-heading text-3xl font-bold text-gold">Hoàn tất thanh toán</h1>
        <p className="mt-2 text-sm text-text-muted">
          Mã đơn: <span className="font-mono text-text-base">{order.code}</span>
        </p>
      </div>

      <BankPaymentClient
        orderCode={order.code}
        phone={phone}
        qrImageUrl={bt.qr_image_url}
        bankName={bankName}
        accountNumber={bt.account_number}
        accountName={bt.account_name}
        amount={bt.amount}
        transferContent={bt.transfer_content}
        qrExpiresAt={bt.qr_expires_at}
        userConfirmedAt={bt.user_confirmed_at}
        billImageUrl={bt.bill_image_url}
        orderStatus={order.status}
      />
    </div>
  );
}
