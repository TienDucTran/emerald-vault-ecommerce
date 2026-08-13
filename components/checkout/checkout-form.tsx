'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, AlertCircle, MapPin, CheckCircle2, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import { useGiftSelectionStore } from '@/lib/store/gift-selection';
import { useAnonymousId } from '@/hooks/use-anonymous-id';
import { createClient } from '@/lib/supabase/client';
import {
  AddressPicker,
  type PickedAddress,
} from '@/components/checkout/address-picker';
import { useCheckoutAddressStore } from '@/lib/store/checkout-address';

export type PaymentOption = 'MOMO' | 'COD' | 'BANK_TRANSFER';

interface CheckoutFormProps {
  payment: PaymentOption;
  onPaymentChange: (option: PaymentOption) => void;
  isBankConfigured: boolean;
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
    desc: 'Quét QR • Xác nhận trong vài giờ',
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
  PRODUCT_RESERVED: 'Món này đang được người khác thanh toán. Vui lòng thử lại sau ít phút.',
  OWN_PRODUCT_RESERVED: 'Bạn đang có đơn chờ thanh toán cho sản phẩm này.',
  MOMO_NOT_CONFIGURED: 'Hệ thống MoMo chưa được cấu hình. Vui lòng chọn COD.',
  MOMO_FAILED: 'Không thể tạo thanh toán MoMo. Vui lòng thử lại hoặc chọn COD.',
  BANK_NOT_CONFIGURED: 'Ngân hàng chưa được cấu hình. Vui lòng chọn phương thức khác.',
  ORDER_FAILED: 'Đặt hàng thất bại. Vui lòng thử lại.',
  NETWORK_ERROR: 'Mất kết nối mạng. Vui lòng thử lại.',
  // Gift validation errors (server-side anti-fraud)
  GIFT_NO_RULE_CODE: 'Quà tặng không hợp lệ (thiếu rule). Vui lòng chọn lại quà.',
  GIFT_MULTIPLE_RULES: 'Quà tặng không hợp lệ (nhiều rule). Vui lòng chọn lại quà.',
  GIFT_RULE_NOT_FOUND: 'Chương trình quà tặng không tồn tại hoặc đã kết thúc.',
  GIFT_RULE_INACTIVE: 'Chương trình quà tặng này đã tạm ngưng.',
  GIFT_RULE_TYPE_UNSUPPORTED: 'Loại quà tặng này không áp dụng tại giỏ hàng.',
  GIFT_NOT_ELIGIBLE: 'Đơn hàng chưa đủ điều kiện nhận quà. Vui lòng mua thêm món để đạt mốc.',
  GIFT_EXCEEDS_COUNT: 'Số lượng quà chọn vượt quá mức cho phép. Vui lòng chọn lại.',
  GIFT_PRODUCT_NOT_IN_POOL: 'Sản phẩm quà tặng không hợp lệ. Vui lòng chọn lại.',
  GIFT_OUT_OF_STOCK: 'Quà tặng này đã hết. Vui lòng chọn món quà khác.',
  GIFT_INVALID: 'Quà tặng không hợp lệ. Vui lòng chọn lại.',
  GIFT_POOL_QUERY_FAILED: 'Không kiểm tra được quà tặng. Vui lòng thử lại.',
};

function translateOrderError(code: string): string {
  return ORDER_ERROR_MAP[code] ?? `Đặt hàng thất bại (${code}).`;
}

export function CheckoutForm({ payment, onPaymentChange, isBankConfigured }: CheckoutFormProps) {
  const router = useRouter();
  const clientId = useAnonymousId();
  const activeItems = useCartStore((s) =>
    s.items.filter((i) => Date.now() < i.expiresAt)
  );
  const activeItem = activeItems[0] ?? null; // backward-compat cho UI cũ
  const selectedGifts = useGiftSelectionStore((s) => s.selectedGifts);
  const clearGifts = useGiftSelectionStore((s) => s.clear);

  // FIX: B-3.4, C2 — controlled form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // error chứa string thường + trường hợp đặc biệt là ReactNode (link tới đơn cũ).
  const [error, setError] = useState<ReactNode | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [invalidItems, setInvalidItems] = useState<
    { productId: string; title: string; reason: string }[]
  >([]);
  const validateRanRef = useRef(false);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const submitStartRef = useRef<number>(0);

  // Idempotency key — generate 1 lần khi mount, persist trong sessionStorage.
  // Chống double checkout: nếu user bấm submit 2 lần hoặc refresh + resubmit,
  // server nhận cùng key → return order cũ thay vì tạo mới.
  // Clear sau khi order tạo thành công (redirect xong).
  const idempotencyKeyRef = useRef<string>('');
  if (typeof window !== 'undefined' && !idempotencyKeyRef.current) {
    try {
      const existing = sessionStorage.getItem('checkout_idempotency_key');
      if (existing) {
        idempotencyKeyRef.current = existing;
      } else {
        const newKey = crypto.randomUUID();
        sessionStorage.setItem('checkout_idempotency_key', newKey);
        idempotencyKeyRef.current = newKey;
      }
    } catch {
      // sessionStorage có thể không khả dụng (private mode) — generate in-memory
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
  // Success overlay state — khi order tạo xong, hiện confirmation screen
  // thay vì clear cart → re-render form rỗng → flash broken state.
  const [orderSuccess, setOrderSuccess] = useState<{
    code: string;
    redirectUrl: string;
    paymentMethod: string;
  } | null>(null);

  // Auto-scroll error vào viewport khi error thay đổi — đảm bảo user
  // thấy banner đỏ ngay cả khi submit button ở dưới màn hình.
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // Auto-redirect khi order thành công — dùng window.location.href (full page
  // load) thay vì router.push (async) để tránh flash broken state khi cart
  // đã clear. Delay 1.5s cho user kịp thấy confirmation + order code.
  useEffect(() => {
    if (!orderSuccess) return;
    const timer = setTimeout(() => {
      window.location.href = orderSuccess.redirectUrl;
    }, 1500);
    return () => clearTimeout(timer);
  }, [orderSuccess]);

  // Nhận diện: AddressPicker propagate live value mỗi khi user chọn saved address
  // hoặc gõ tay. Parent form luôn overwrite state với giá trị mới nhất từ picker
  // — nếu giữ `prev || picked` thì click chọn address khác sau khi đã auto-load
  // mặc định sẽ không cập nhật form (user bị kẹt với address cũ).
  // Sync province/district vào zustand store để GamificationPanel + ShippingFeeDisplay
  // tính shipping zone + freeship theo địa chỉ user chọn.
  const setCheckoutAddress = useCheckoutAddressStore((s) => s.setAddress);

  const handleAddressChange = useCallback((picked: PickedAddress) => {
    setName(picked.recipient_name);
    setPhone(picked.recipient_phone);
    setAddress(picked.address_line);
    setProvince(picked.province);
    setDistrict(picked.district);
    setWard(picked.ward);
    // Sync store cho GamificationPanel/ShippingFeeDisplay
    setCheckoutAddress(picked.province || null, picked.district || null);
  }, [setCheckoutAddress]);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        // Chỉ load profile (full_name + phone + email). Address giờ do
        // <AddressPicker/> xử lý (saved addresses + manual + auto-select default).
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle() as any;

        if (cancelled) return;

        const profileName = (profile?.full_name ?? '').toString().trim();
        const profilePhone = (profile?.phone ?? '').toString().trim();

        setName((prev) => prev || profileName);
        setPhone((prev) => prev || profilePhone);
        setEmail((prev) => prev || (user.email ?? ''));
      } catch (err) {
        console.error('Failed to auto-fill checkout form from profile:', err);
      } finally {
        if (!cancelled) {
          setProfileLoaded(true);
        }
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Server-side lock validation on mount — chạy đúng 1 lần, không re-validate khi re-render.
  useEffect(() => {
    if (validateRanRef.current) return;
    const items = useCartStore
      .getState()
      .items.filter((i) => Date.now() < i.expiresAt);
    if (items.length === 0) {
      validateRanRef.current = true;
      return;
    }
    validateRanRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.product.id,
              lockId: i.lockId,
            })),
          }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!json.ok || !Array.isArray(json.results)) return;
        const invalids: { productId: string; title: string; reason: string }[] = [];
        for (const r of json.results as Array<{
          productId: string;
          valid: boolean;
          reason?: string;
        }>) {
          if (r.valid) continue;
          const found = items.find((i) => i.product.id === r.productId);
          if (!found) continue;
          invalids.push({
            productId: found.product.id,
            title: found.product.title,
            reason: r.reason ?? 'LOCK_INVALID',
          });
        }
        if (invalids.length > 0) {
          setInvalidItems(invalids);
        }
      } catch (err) {
        // Network errors are non-fatal — local expiry check vẫn hoạt động.
        console.error('cart validate failed:', err);
      }
    })();
  }, []);

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
    if (payment === 'BANK_TRANSFER' && !isBankConfigured) {
      setError('Ngân hàng chưa được cấu hình. Vui lòng chọn phương thức khác.');
      return;
    }
    if (!activeItem) {
      setError('Giỏ hàng trống hoặc đã hết thời gian giữ hàng. Vui lòng chọn lại sản phẩm.');
      return;
    }

    setError(null);
    setSubmitting(true);
    submitStartRef.current = performance.now();
    try {
      // 0. Đánh dấu tất cả active items đã bắt đầu checkout
      //    → server /api/orders có thể re-use lock thay vì re-lock
      useCartStore
        .getState()
        .markCheckoutStarted(activeItems.map((i) => i.product.id));

      // 1. Tạo order (multi-item) + gift items (nếu user đã chọn quà)
      const orderItems = activeItems.map((i) => ({
        productId: i.product.id,
        price: i.product.price,
        title: i.product.title,
        image: i.product.image_url,
        material: i.product.material,
        lockId: i.lockId,
        checkoutStartedAt: i.checkoutStartedAt ?? null,
      }));

      // Gift items: price=0, is_gift=true, gift_rule_code từ store
      const giftRuleCode = useGiftSelectionStore.getState().ruleCode;
      const giftItems = selectedGifts.map((g) => ({
        productId: g.product_id,
        price: 0,
        title: g.product_title,
        image: g.product_image,
        material: undefined,
        lockId: null,
        checkoutStartedAt: null,
        is_gift: true,
        gift_rule_code: giftRuleCode ?? undefined,
      }));

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          items: [...orderItems, ...giftItems],
          customer: { name, phone, email, address, province, district, ward, notes },
          payment,
          clientId: clientId ?? undefined,
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.ok) {
        // Defensive: nếu session hết hạn giữa lúc load page và submit
        // → đẩy về login rồi quay lại checkout sau khi đăng nhập.
        if (orderRes.status === 401 || orderJson.error === 'NOT_AUTHENTICATED') {
          router.push('/tai-khoan/dang-nhap?next=/thanh-toan');
          return;
        }
        // OWN_PRODUCT_RESERVED: user đang có đơn WAITING_PAYMENT cũ cho đúng sp này.
        // → Hiển thị message rõ ràng + link tới đơn cũ để user thanh toán / huỷ.
        if (
          orderJson.error === 'OWN_PRODUCT_RESERVED' &&
          orderJson.existingOrderCode
        ) {
          const orderCode: string = orderJson.existingOrderCode;
          const productTitle: string = orderJson.productTitle ?? 'sản phẩm này';
          const serverMessage: string | undefined = orderJson.message;
          setError(
            <span>
              {serverMessage ?? (
                <>
                  Bạn đang có đơn chờ thanh toán cho{' '}
                  <strong className="text-red-300">{productTitle}</strong>.
                </>
              )}
              {' '}
              <Link
                href={`/tai-khoan/don-hang/${orderCode}`}
                className="font-semibold text-gold underline decoration-gold/40 underline-offset-2 hover:text-gold-champagne hover:decoration-gold-champagne"
              >
                Mở đơn {orderCode}
              </Link>
              {' '}để thanh toán hoặc huỷ trước khi đặt lại.
            </span>
          );
          return;
        }
        const msg = orderJson.error || 'ORDER_FAILED';
        console.error('[checkout] POST /api/orders failed:', {
          fetchMs: Math.round(performance.now() - submitStartRef.current),
          status: orderRes.status,
          error: orderJson.error,
          message: orderJson.message,
          existingOrderCode: orderJson.existingOrderCode,
        });
        setError(translateOrderError(msg));
        return;
      }
      const { code, paymentMethod } = orderJson.order;
      const redirectUrl: string | undefined = orderJson.redirectUrl;
      console.info('[checkout] POST /api/orders success:', {
        fetchMs: Math.round(performance.now() - submitStartRef.current),
        code,
        paymentMethod,
      });

      // 2. Phân luồng
      if (paymentMethod === 'MOMO') {
        try {
          sessionStorage.setItem(`momo-phone-${code}`, phone);
        } catch {
          // sessionStorage có thể không khả dụng (private mode) — ignore
        }
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
        // Clear idempotency key — order đã tạo thành công
        try { sessionStorage.removeItem('checkout_idempotency_key'); } catch {}
        window.location.href = momoJson.payUrl;
        return;
      }
      // Clear cart local + gift selection — làm ngay để cart icon update,
      // success overlay sẽ thay thế form nên không sợ flash rỗng.
      useCartStore.getState().clear();
      clearGifts();
      // Clear idempotency key — order đã tạo thành công
      try { sessionStorage.removeItem('checkout_idempotency_key'); } catch {}

      // Phân luồng redirect:
      // - MOMO: đã return ở nhánh trên (window.location.href)
      // - COD: → /tai-khoan/don-hang/[code]
      // - BANK_TRANSFER: → /don-hang/[code]/thanh-toan?phone=xxx (trang QR)
      //
      // Dùng success overlay + window.location.href thay vì router.push:
      //   router.push là async → trong lúc navigation, React re-render form
      //   với activeItems=[] (cart đã clear) → flash "giỏ hàng trống" + button
      //   disabled. Success overlay giữ UI ổn định cho đến khi full redirect.
      let finalRedirectUrl: string;
      if (paymentMethod === 'COD') {
        finalRedirectUrl = `/tai-khoan/don-hang/${encodeURIComponent(code)}`;
      } else {
        // BANK_TRANSFER
        if (redirectUrl) {
          finalRedirectUrl = `${redirectUrl}?phone=${encodeURIComponent(phone)}`;
        } else {
          finalRedirectUrl = `/don-hang/${code}?phone=${encodeURIComponent(phone)}`;
        }
      }
      setOrderSuccess({ code, redirectUrl: finalRedirectUrl, paymentMethod });
    } catch (e) {
      setError(translateOrderError(e instanceof Error ? e.message : 'NETWORK_ERROR'));
      setSubmitting(false);
    }
  };

  // Success overlay — thay thế toàn bộ form khi order tạo xong.
  // Tránh flash broken state khi cart clear + router.push async.
  if (orderSuccess) {
    const isBank = orderSuccess.paymentMethod === 'BANK_TRANSFER';
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full border border-success/40 bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-gold">
            Đặt hàng thành công
          </h2>
          <p className="text-sm text-text-muted">
            Mã đơn: <span className="font-mono text-text-base">{orderSuccess.code}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isBank ? 'Đang chuyển đến trang thanh toán...' : 'Đang chuyển đến đơn hàng...'}
        </div>
        <button
          type="button"
          onClick={() => {
            window.location.href = orderSuccess.redirectUrl;
          }}
          className="inline-flex items-center gap-2 rounded bg-gradient-gold px-6 py-3 font-heading text-xs font-bold uppercase tracking-[0.1em] text-background transition-all hover:shadow-gold-glow"
        >
          {isBank ? 'Đi đến thanh toán' : 'Xem đơn hàng'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-10" onSubmit={handleSubmit} noValidate>
      {invalidItems.length > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              Một số sản phẩm đã hết thời gian giữ kho
            </span>
          </div>
          <ul className="ml-6 list-disc text-xs text-amber-200/90">
            {invalidItems.map((it) => (
              <li key={it.productId}>
                Món {it.title} đã hết thời gian giữ kho hoặc có người khác đang
                giữ. Vui lòng quay lại giỏ hàng.
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* — Section 01: Customer Information — */}
      <section className="rounded-lg border border-gold/10 bg-surface-emerald/40 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <span className="font-heading text-2xl font-normal text-gold">01</span>
          <h2 className="font-heading text-3xl font-semibold text-gold">
            Thông Tin Khách Hàng
          </h2>
        </div>

        {activeItems.length === 0 && (
          <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            Tất cả sản phẩm đã hết thời gian giữ kho. Vui lòng quay lại giỏ hàng để giữ lại.
          </div>
        )}

        {/* Basic Info Glassmorphic Card — Name + Phone grid + Email full width */}
        <div className="mb-8 space-y-6 rounded-lg border border-gold/10 bg-surface-emerald/20 p-6 backdrop-blur-md">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Họ và tên */}
            <div className="rounded-sm border border-gold/20 bg-background/40 p-1 focus-within:border-gold">
              <label className="block px-3 pt-2 font-heading text-[10px] uppercase tracking-wider text-gold/60">
                HỌ VÀ TÊN *
              </label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full border-none bg-transparent px-3 py-2 font-sans text-base text-text-base placeholder:text-text-muted/30 focus:outline-none focus:ring-0"
                required
              />
            </div>

            {/* Số điện thoại */}
            <div className="rounded-sm border border-gold/20 bg-background/40 p-1 focus-within:border-gold">
              <label className="block px-3 pt-2 font-heading text-[10px] uppercase tracking-wider text-gold/60">
                SỐ ĐIỆN THOẠI *
              </label>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901 234 567"
                className="w-full border-none bg-transparent px-3 py-2 font-sans text-base text-text-base placeholder:text-text-muted/30 focus:outline-none focus:ring-0"
                required
              />
            </div>
          </div>

          {/* Email — full width */}
          <div className="rounded-sm border border-gold/20 bg-background/40 p-1 focus-within:border-gold">
            <label className="block px-3 pt-2 font-heading text-[10px] uppercase tracking-wider text-gold/60">
              EMAIL
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full border-none bg-transparent px-3 py-2 font-sans text-base text-text-base placeholder:text-text-muted/30 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* Address Ledger Section — saved address cards via AddressPicker */}
        <div className="space-y-4">
          <label className="mb-2 block font-heading text-[10px] uppercase tracking-wider text-gold/60">
            ĐỊA CHỈ GIAO HÀNG *
          </label>
          <AddressPicker
            defaultName={name}
            defaultPhone={phone}
            onChange={handleAddressChange}
          />
        </div>

        {/* Selected Address Summary — visual reference for user to confirm */}
        {(address || province) && (
          <div className="mt-8 rounded-lg border border-gold/20 bg-background/40 p-4">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-gold" />
              <span className="font-heading text-[10px] uppercase tracking-wider text-gold">
                ĐỊA CHỈ ĐÃ CHỌN
              </span>
            </div>
            <p className="pl-6 text-xs text-text-muted">
              {address || '(chưa có địa chỉ chi tiết)'}
              {(ward || district || province) && <br />}
              {(ward || district || province) &&
                [ward, district, province].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {/* Notes Section */}
        <div className="mt-8 rounded-sm border border-gold/20 bg-surface-emerald/40 p-1 focus-within:border-gold">
          <label className="block px-3 pt-2 font-heading text-[10px] uppercase tracking-wider text-gold/60">
            GHI CHÚ RIÊNG
          </label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Lời nhắn gửi cho Bà Chủ Tiệm hoặc hướng dẫn giao hàng đặc biệt..."
            className="w-full resize-none border-none bg-transparent px-3 py-2 font-sans text-base text-text-base placeholder:text-text-muted/30 focus:outline-none focus:ring-0"
          />
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
            const isBankUnavailable = option.id === 'BANK_TRANSFER' && !isBankConfigured;
            const isDisabled = isBankUnavailable;
            return (
              <label
                key={option.id}
                className={`flex items-center justify-between rounded-md border p-5 transition-all ${
                  isDisabled
                    ? 'cursor-not-allowed border-gold/10 bg-background/10 opacity-50'
                    : `cursor-pointer ${
                        isSelected
                          ? 'border-gold/40 bg-gold/5'
                          : 'border-gold/20 bg-background/20 hover:border-gold/30'
                      }`
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
                      {isBankUnavailable && (
                        <span className="ml-2 text-xs font-normal text-text-muted">
                          (Chưa khả dụng)
                        </span>
                      )}
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
                  disabled={isDisabled}
                  onChange={() => onPaymentChange(option.id)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* Error banner — đặt TRƯỚC submit button để user thấy ngay khi fail.
          Auto-scroll vào viewport qua errorRef (useEffect ở trên). */}
      {error && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-md border-2 border-red-500/60 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-300 shadow-md"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* — Submit button — */}
      <button
        type="submit"
        disabled={submitting || activeItems.length === 0}
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
    </form>
  );
}
