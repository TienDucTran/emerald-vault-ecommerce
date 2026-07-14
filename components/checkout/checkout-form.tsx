'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import { useAnonymousId } from '@/hooks/use-anonymous-id';

export type PaymentOption = 'MOMO' | 'COD' | 'BANK_TRANSFER';

interface CheckoutFormProps {
  payment: PaymentOption;
  onPaymentChange: (option: PaymentOption) => void;
}

const PAYMENT_OPTIONS: {
  id: PaymentOption;
  title: string;
  desc: string;
  logo?: string;
  icon?: string;
}[] = [
  {
    id: 'MOMO',
    title: 'Ví điện tử MoMo',
    desc: 'Thanh toán nhanh chóng, bảo mật',
    logo: '/images/checkout/momo-logo-7fc51d.png',
  },
  {
    id: 'COD',
    title: 'Thanh toán khi nhận hàng (COD)',
    desc: 'Trả tiền mặt cho đơn vị vận chuyển khi nhận hàng',
    icon: 'COD',
  },
  {
    id: 'BANK_TRANSFER',
    title: 'Chuyển khoản ngân hàng',
    desc: 'Chuyển khoản qua tài khoản ngân hàng nội địa',
    icon: 'VCB',
  },
];

/* — Form field label (small uppercase gold tint) — */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block font-heading text-[10px] font-normal uppercase tracking-wider text-gold/60">
      {children}
    </label>
  );
}

/* — Form input wrapper with overlay border — */
function FieldWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-gold/20 bg-background/20 p-1">
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-transparent px-3 py-2.5 text-base text-text-base placeholder:text-[#D0C5AF]/30 focus:outline-none focus:text-text-base transition-colors';

const ORDER_ERROR_MAP: Record<string, string> = {
  PRODUCT_SOLD_OUT: 'Món này vừa được sưu tầm rồi.',
  PRODUCT_NOT_FOUND: 'Sản phẩm không tồn tại.',
  PRODUCT_LOCKED_BY_OTHER: 'Có người khác đang giữ món này. Thử lại sau vài phút nhé.',
  MOMO_NOT_CONFIGURED: 'Hệ thống MoMo chưa được cấu hình. Vui lòng chọn COD.',
  MOMO_FAILED: 'Không thể tạo thanh toán MoMo. Vui lòng thử lại hoặc chọn COD.',
  ORDER_FAILED: 'Đặt hàng thất bại. Vui lòng thử lại.',
  NETWORK_ERROR: 'Mất kết nối mạng. Vui lòng thử lại.',
};

function translateOrderError(code: string): string {
  return ORDER_ERROR_MAP[code] ?? `Đặt hàng thất bại (${code}).`;
}

export function CheckoutForm({ payment, onPaymentChange }: CheckoutFormProps) {
  const router = useRouter();
  const clientId = useAnonymousId();
  const activeItem = useCartStore((s) =>
    s.items.find((i) => Date.now() < i.expiresAt)
  );

  // FIX: B-3.4, C2 — controlled form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!address.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }
    if (!activeItem) {
      setError('Giỏ hàng trống hoặc đã hết thời gian giữ hàng. Vui lòng chọn lại sản phẩm.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const product = activeItem.product;
      // 1. Tạo order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              productId: product.id,
              price: product.price,
              title: product.title,
              image: product.image_url,
              material: product.material,
            },
          ],
          customer: { name, phone, email, address, province, district, notes },
          payment,
          clientId: clientId ?? undefined,
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.ok) {
        const msg = orderJson.error || 'ORDER_FAILED';
        setError(translateOrderError(msg));
        return;
      }
      const { code, paymentMethod } = orderJson.order;

      // 2. Phân luồng
      if (paymentMethod === 'MOMO') {
        const momoRes = await fetch('/api/momo/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderCode: code }),
        });
        const momoJson = await momoRes.json();
        if (!momoRes.ok || !momoJson.ok || !momoJson.payUrl) {
          setError(momoJson.error || 'MOMO_FAILED');
          return;
        }
        // Redirect sang MoMo
        window.location.href = momoJson.payUrl;
        return;
      }
      // COD / Bank transfer: sang trang đơn hàng
      // Clear cart local
      useCartStore.getState().clear();
      router.push(`/don-hang/${code}?phone=${encodeURIComponent(phone)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NETWORK_ERROR');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-10" onSubmit={handleSubmit} noValidate>
      {/* — Section 01: Customer Information — */}
      <section className="rounded-md border border-gold/10 bg-surface-emerald/40 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <span className="font-heading text-2xl font-normal text-gold">01</span>
          <h2 className="font-heading text-3xl font-semibold text-gold">
            Thông Tin Khách Hàng
          </h2>
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-3">
          {/* Họ và tên */}
          <div>
            <FieldLabel>HỌ VÀ TÊN *</FieldLabel>
            <FieldWrapper>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={inputClass}
                required
              />
            </FieldWrapper>
          </div>

          {/* Số điện thoại */}
          <div>
            <FieldLabel>SỐ ĐIỆN THOẠI *</FieldLabel>
            <FieldWrapper>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901 234 567"
                className={inputClass}
                required
              />
            </FieldWrapper>
          </div>

          {/* Email */}
          <div>
            <FieldLabel>EMAIL</FieldLabel>
            <FieldWrapper>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className={inputClass}
              />
            </FieldWrapper>
          </div>

          {/* Địa chỉ giao hàng */}
          <div>
            <FieldLabel>ĐỊA CHỈ GIAO HÀNG *</FieldLabel>
            <FieldWrapper>
              <input
                type="text"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, Tên đường, Phường/Xã"
                className={inputClass}
                required
              />
            </FieldWrapper>
          </div>

          {/* Tỉnh/Thành phố & Quận/Huyện */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>TỈNH / THÀNH PHỐ</FieldLabel>
              <FieldWrapper>
                <input
                  type="text"
                  name="province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="TP. Hồ Chí Minh"
                  className={inputClass}
                />
              </FieldWrapper>
            </div>
            <div>
              <FieldLabel>QUẬN / HUYỆN</FieldLabel>
              <FieldWrapper>
                <input
                  type="text"
                  name="district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Quận 1"
                  className={inputClass}
                />
              </FieldWrapper>
            </div>
          </div>

          {/* Ghi chú riêng */}
          <div>
            <FieldLabel>GHI CHÚ RIÊNG</FieldLabel>
            <FieldWrapper>
              <textarea
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Lời nhắn gửi cho Bà Chủ Tiệm hoặc hướng dẫn giao hàng đặc biệt..."
                className={`${inputClass} resize-none`}
              />
            </FieldWrapper>
          </div>
        </div>
      </section>

      {/* — Section 02: Payment Method — */}
      <section className="rounded-md border border-gold/10 bg-surface-emerald/40 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <span className="font-heading text-2xl font-normal text-gold">02</span>
          <h2 className="font-heading text-3xl font-semibold text-gold">
            Phương Thức Thanh Toán
          </h2>
        </div>

        {/* Payment options */}
        <div className="flex flex-col gap-4">
          {PAYMENT_OPTIONS.map((option) => {
            const isSelected = payment === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center justify-between rounded-md border p-5 transition-all ${
                  isSelected
                    ? 'border-gold/40 bg-gold/5'
                    : 'border-gold/20 bg-background/20 hover:border-gold/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Radio circle */}
                  <div
                    className={`grid h-5 w-5 place-items-center rounded-full border ${
                      isSelected ? 'border-gold' : 'border-gold/40'
                    }`}
                  >
                    {isSelected && (
                      <div className="h-2.5 w-2.5 rounded-full bg-gold" />
                    )}
                  </div>

                  {/* Logo / icon box */}
                  <div className="grid h-10 w-10 place-items-center rounded-md border border-gold/10 bg-surface">
                    {option.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={option.logo}
                        alt={option.title}
                        className="h-8 w-8 rounded object-contain"
                      />
                    ) : (
                      <span className="font-heading text-[10px] font-bold text-gold">
                        {option.icon}
                      </span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex flex-col">
                    <span className="font-sans text-base font-semibold text-text-base">
                      {option.title}
                    </span>
                    <span className="text-xs text-text-muted">{option.desc}</span>
                  </div>
                </div>

                {/* Hidden radio input */}
                <input
                  type="radio"
                  name="payment"
                  value={option.id}
                  checked={isSelected}
                  onChange={() => onPaymentChange(option.id)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* — Submit button — */}
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 bg-gold py-4 font-heading text-xs font-bold uppercase tracking-[0.1em] text-background transition-all hover:bg-gold-champagne hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            ĐANG XỬ LÝ...
          </>
        ) : (
          'XÁC NHẬN ĐẶT HÀNG'
        )}
      </button>

      {error && (
        <p className="-mt-6 rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
