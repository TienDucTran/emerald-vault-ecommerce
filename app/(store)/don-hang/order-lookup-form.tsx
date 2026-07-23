'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function OrderLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedCode) {
      setError('Vui lòng nhập mã đơn hàng.');
      return;
    }
    if (!/^EV-\d{8}-\d{4}$/i.test(trimmedCode)) {
      setError('Mã đơn không đúng định dạng (VD: EV-20260723-8154).');
      return;
    }
    if (!trimmedPhone) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }
    if (trimmedPhone.replace(/\D/g, '').length < 8) {
      setError('Số điện thoại không hợp lệ.');
      return;
    }

    router.push(
      `/don-hang/${encodeURIComponent(trimmedCode)}?phone=${encodeURIComponent(trimmedPhone)}`
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gold/20 bg-surface p-6"
    >
      <div className="mb-4">
        <label
          htmlFor="code"
          className="mb-2 block font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-gold"
        >
          Mã đơn hàng
        </label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="EV-20260723-8154"
          className="w-full rounded border border-gold/30 bg-background px-3 py-2.5 font-mono text-base text-text-base placeholder:text-text-disabled focus:border-gold focus:outline-none"
          autoComplete="off"
          required
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="phone"
          className="mb-2 block font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-gold"
        >
          Số điện thoại đặt hàng
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0901 234 567"
          className="w-full rounded border border-gold/30 bg-background px-3 py-2.5 text-base text-text-base placeholder:text-text-disabled focus:border-gold focus:outline-none"
          autoComplete="tel"
          required
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded bg-gold px-5 py-2.5 text-sm font-semibold text-background hover:bg-gold-champagne"
      >
        <Search className="h-4 w-4" />
        Tra cứu
      </button>

      <p className="mt-4 text-center text-xs text-text-disabled">
        Mã đơn có dạng <span className="font-mono text-text-base">EV-YYYYMMDD-XXXX</span> được gửi trong email xác nhận.
      </p>
    </form>
  );
}
