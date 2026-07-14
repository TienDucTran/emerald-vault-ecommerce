'use client';

import { useState, type FormEvent } from 'react';

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

export function CheckoutForm({ payment, onPaymentChange }: CheckoutFormProps) {
  // FIX: B-3.4, C2 — controlled form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // FIX: basic validation
    if (!name.trim()) {
      alert('Vui lòng nhập họ và tên.');
      return;
    }
    if (!phone.trim()) {
      alert('Vui lòng nhập số điện thoại.');
      return;
    }

    // FIX: mock feedback — API integration sẽ do agent khác xử lý
    alert(
      'Đặt hàng thành công! (Mock - sẽ tích hợp API sau)\n' +
        `Khách hàng: ${name}\n` +
        `SĐT: ${phone}\n` +
        `Thanh toán: ${payment}`,
    );
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
        className="flex w-full items-center justify-center bg-gold py-4 font-heading text-xs font-bold uppercase tracking-[0.1em] text-background transition-all hover:bg-gold-champagne hover:shadow-gold-glow"
      >
        XÁC NHẬN ĐẶT HÀNG
      </button>
    </form>
  );
}
