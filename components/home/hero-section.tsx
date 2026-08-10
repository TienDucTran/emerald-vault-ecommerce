'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart';
import { useCountdown, formatCountdown } from '@/hooks/use-countdown';
import { formatVND } from '@/lib/utils';

const DEFAULT_HERO_IMAGE = '/images/home/hero-bg-3f80b8.png';

export function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Chỉ subscribe tới items array (shallow reference, không tạo mới mỗi render)
  const items = useCartStore((s) => s.items);

  // Derive active items sorted by expiresAt (sắp hết hạn trước) — memoized
  const activeItems = useMemo(() => {
    if (!mounted || items.length === 0) return [];
    const now = Date.now();
    const active = items.filter((i) => now < i.expiresAt);
    active.sort((a, b) => a.expiresAt - b.expiresAt);
    return active;
  }, [items, mounted]);

  // Real countdown từ expiresAt sớm nhất (weakest-link)
  const minExpiresAt = activeItems.length > 0 ? activeItems[0].expiresAt : null;
  const countdownMs = useCountdown(minExpiresAt);
  const hasActiveHold = activeItems.length > 0;

  // Total price
  const totalPrice = useMemo(() => {
    return activeItems.reduce((sum, i) => sum + i.product.price, 0);
  }, [activeItems]);

  // ─── Layout 1: Có sản phẩm đang giữ → immersive multi-item showcase ───
  if (hasActiveHold) {
    const isSingle = activeItems.length === 1;

    return (
      <section className="relative flex min-h-[560px] w-full items-center overflow-hidden bg-background py-16 md:min-h-[720px] md:py-0">
        {/* Layered background: deep gradient + ambient gold glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 70% 50%, rgba(242, 202, 80, 0.06) 0%, transparent 60%), linear-gradient(135deg, #0D1117 0%, #051C12 100%)',
          }}
        />
        {/* Decorative gold orb — right side glow */}
        <div
          className="pointer-events-none absolute right-[-10%] top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(242, 202, 80, 0.3) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-4 sm:px-8 md:flex-row md:gap-12 lg:gap-16">
          {/* ─── Left: Text content ─── */}
          <div className="flex flex-1 flex-col items-center gap-5 text-center md:items-start md:text-left sm:gap-6">
            {/* Eyebrow with pulse dot */}
            <div
              className="flex items-center gap-3 motion-safe:animate-fadeInUp"
              style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </span>
              <p className="font-heading text-[10px] font-bold uppercase tracking-[0.3em] text-gold sm:text-xs">
                Đang giữ hàng của bạn
              </p>
              <span className="h-px w-8 bg-gold opacity-40" />
            </div>

            {/* Title — dynamic theo số lượng */}
            <h1
              className="flex flex-col leading-tight gap-y-1 motion-safe:animate-fadeInUp"
              style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
            >
              {isSingle ? (
                <span
                  className="font-heading text-[28px] sm:text-[40px] md:text-[52px] font-bold tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #F1E5AC 0%, #F2CA50 50%, #D4AF37 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {activeItems[0].product.title}
                </span>
              ) : (
                <>
                  <span className="font-heading text-[28px] sm:text-[40px] md:text-[52px] font-bold tracking-tight text-text-base">
                    {activeItems.length} món đồ
                  </span>
                  <span
                    className="font-heading text-[24px] sm:text-[32px] md:text-[40px] font-bold italic tracking-tight"
                    style={{
                      background: 'linear-gradient(135deg, #F1E5AC 0%, #F2CA50 50%, #D4AF37 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    đang chờ bạn
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle — product info hoặc summary */}
            {isSingle ? (
              <p
                className="max-w-[90vw] font-heading text-[13px] italic leading-relaxed text-text-muted sm:text-base motion-safe:animate-fadeInUp"
                style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
              >
                {activeItems[0].product.code && (
                  <span className="text-gold/80">{activeItems[0].product.code}</span>
                )}
                {activeItems[0].product.code && activeItems[0].product.era && ' — '}
                {activeItems[0].product.era}
              </p>
            ) : (
              <p
                className="max-w-[90vw] font-heading text-[13px] italic leading-relaxed text-text-muted sm:text-base motion-safe:animate-fadeInUp"
                style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
              >
                Mỗi món đang được giữ riêng cho bạn. Hoàn tất thanh toán trước khi hết thời gian.
              </p>
            )}

            {/* Price + Countdown — polished badge row */}
            <div
              className="flex flex-wrap items-center gap-3 pt-2 motion-safe:animate-fadeInUp"
              style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
            >
              <span className="font-sans text-xl font-semibold text-gold sm:text-2xl">
                {formatVND(totalPrice)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-surface-emerald/80 px-4 py-2 shadow-gold-glow backdrop-blur-md">
                <ClockIcon />
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-base font-bold text-gold">
                    {formatCountdown(countdownMs)}
                  </span>
                  <span className="font-heading text-[10px] uppercase tracking-wider text-text-muted">còn lại</span>
                </div>
              </span>
            </div>

            {/* CTA buttons */}
            <div
              className="flex w-full max-w-md flex-col items-stretch justify-center gap-2 pt-3 sm:flex-row md:items-center md:justify-start sm:gap-4 sm:pt-5 motion-safe:animate-fadeInUp"
              style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
            >
              <Link
                href="/thanh-toan"
                className="group inline-flex items-center justify-center gap-2 rounded-md bg-gradient-gold px-6 py-3 font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-background transition-all duration-300 hover:scale-[1.03] hover:shadow-gold-glow-lg active:scale-95 sm:px-10 sm:py-4 sm:text-xs"
              >
                Thanh toán ngay
                <svg className="h-3 w-3 transition-transform group-hover:translate-x-1" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8m0 0L6 2m4 4L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/gio-hang"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gold/40 px-6 py-3 font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-gold transition-all duration-300 hover:scale-[1.03] hover:border-gold hover:bg-gold/10 active:scale-95 sm:px-10 sm:py-4 sm:text-xs"
              >
                Xem giỏ hàng
              </Link>
            </div>
          </div>

          {/* ─── Right: Product showcase ─── */}
          <div
            className="flex flex-1 items-center justify-center motion-safe:animate-fadeInUp"
            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
          >
            {isSingle ? (
              <SingleProductCard item={activeItems[0]} />
            ) : (
              <MultiProductGrid items={activeItems} />
            )}
          </div>
        </div>
      </section>
    );
  }

  // ─── Layout 2: Không có sản phẩm → default centered hero ───
  return (
    <section className="relative flex min-h-[560px] w-full items-center justify-center overflow-hidden py-16 md:h-[720px] md:py-0">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DEFAULT_HERO_IMAGE}
        alt="Hero background"
        className="absolute inset-0 h-full w-full object-cover motion-safe:animate-scaleIn"
        style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
      />
      {/* Gradient overlay — bottom to top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(0deg, rgba(13, 17, 23, 1) 0%, rgba(13, 17, 23, 0) 50%, rgba(13, 17, 23, 0.4) 100%)',
        }}
      />

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-4 text-center sm:gap-6 sm:px-8">
        {/* Eyebrow */}
        <div
          className="flex items-center gap-3 motion-safe:animate-fadeInUp"
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
          <span className="h-px w-6 bg-gold opacity-60 sm:w-8" />
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.3em] text-gold opacity-90 sm:text-xs">
            The Matriarch Collection
          </p>
          <span className="h-px w-6 bg-gold opacity-60 sm:w-8" />
        </div>

        {/* H1 */}
        <h1
          className="flex flex-col items-center leading-none gap-y-1 sm:gap-y-2 motion-safe:animate-fadeInUp"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          <span className="font-heading text-[32px] sm:text-[56px] md:text-[88px] font-bold tracking-tight text-text-base">
            Tuyệt tác
          </span>
          <span
            className="font-heading text-[32px] sm:text-[56px] md:text-[88px] font-bold italic tracking-tight"
            style={{
              background:
                'linear-gradient(90deg, rgba(241, 229, 172, 1) 0%, rgba(242, 202, 80, 1) 50%, rgba(241, 229, 172, 1) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Vượt Thời Gian
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="max-w-[90vw] sm:max-w-[600px] md:max-w-[672px] font-heading text-[13px] italic leading-relaxed text-text-muted sm:text-base md:text-lg motion-safe:animate-fadeInUp"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          Khám phá kho lưu trữ trang sức di sản được tuyển chọn từ Tokyo và Paris,
          nơi mỗi viên đá kể một câu chuyện về sự vĩnh cửu.
        </p>

        {/* CTA buttons */}
        <div
          className="flex w-full max-w-md flex-col items-stretch justify-center gap-2 pt-2 sm:flex-row sm:items-center sm:gap-4 sm:pt-4 motion-safe:animate-fadeInUp"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <Link
            href="/san-pham"
            className="bg-gold px-5 py-2.5 text-center font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-background transition-all duration-300 hover:bg-gold-champagne hover:-translate-y-0.5 hover:shadow-lg sm:px-10 sm:py-4 sm:text-xs"
          >
            Khám phá ngay
          </Link>
          <Link
            href="/bo-suu-tap"
            className="border border-gold px-5 py-2.5 text-center font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-gold transition-all duration-300 hover:bg-gold/10 hover:-translate-y-0.5 sm:px-10 sm:py-4 sm:text-xs"
          >
            Xem bộ sưu tập
          </Link>
        </div>
      </div>

      {/* Default floating badge */}
      <div
        className="hidden sm:flex absolute right-6 md:right-8 bottom-5 items-center gap-3 rounded-xl border border-gold/20 bg-surface-emerald/80 px-5 py-3 backdrop-blur-md md:px-6 motion-safe:animate-fadeInUp"
        style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}
      >
        <ClockIcon />
        <div className="flex flex-col">
          <span className="font-heading text-[10px] font-normal text-text-muted">
            Ưu tiên giữ hàng
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-sans text-base font-normal text-gold">10:00</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Single product card — framed showcase with depth ───
function SingleProductCard({ item }: { item: ReturnType<typeof useCartStore.getState>['items'][0] }) {
  const countdownMs = useCountdown(item.expiresAt);

  return (
    <div className="relative">
      {/* Outer glow ring */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-3xl opacity-30 blur-2xl"
        style={{ background: 'radial-gradient(ellipse at center, rgba(242, 202, 80, 0.25) 0%, transparent 70%)' }}
      />
      {/* Image frame */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gold/30 shadow-2xl sm:max-w-lg md:max-w-md lg:max-w-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.product.image_url}
          alt={item.product.title}
          className="aspect-square w-full object-cover sm:aspect-[4/5]"
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(13, 17, 23, 0.3) 0%, transparent 25%, transparent 60%, rgba(13, 17, 23, 0.7) 100%)',
          }}
        />
        {/* Gold corner accents */}
        <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-gold/60" />
        <div className="absolute right-0 bottom-0 h-8 w-8 border-b-2 border-r-2 border-gold/60" />

        {/* Floating countdown badge */}
        <div className="absolute bottom-5 left-5 flex items-center gap-2.5 rounded-xl border border-gold/30 bg-surface-emerald/90 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <ClockIcon />
          <div className="flex flex-col">
            <span className="font-heading text-[9px] uppercase tracking-wider text-text-muted">
              Thời gian giữ
            </span>
            <span className="font-mono text-base font-bold text-gold">
              {formatCountdown(countdownMs)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Multi product grid — always 4 cells, overflow card thay cho card thứ 4 ───
function MultiProductGrid({ items }: { items: ReturnType<typeof useCartStore.getState>['items'] }) {
  // Luôn show 4 cells. Nếu <= 4 items: show hết. Nếu > 4: show 3 cards + 1 overflow card
  const MAX_DISPLAY = 4;
  const hasOverflow = items.length > MAX_DISPLAY;
  const productSlots = hasOverflow ? MAX_DISPLAY - 1 : items.length;
  const displayItems = items.slice(0, productSlots);
  const overflowCount = items.length - productSlots;

  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:gap-4 md:max-w-md lg:max-w-lg">
      {displayItems.map((item, idx) => (
        <ProductMiniCard key={item.product.id} item={item} index={idx} />
      ))}
      {/* Overflow card — thay thế card thứ 4 khi > 4 items */}
      {hasOverflow && (
        <Link
          href="/gio-hang"
          className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-gold/30 bg-surface-emerald/60 backdrop-blur-md transition-all duration-300 hover:border-gold/60 hover:bg-surface-emerald/80 motion-safe:animate-fadeInUp"
          style={{
            animationDelay: `${200 + productSlots * 80}ms`,
            animationFillMode: 'backwards',
          }}
        >
          {/* Subtle background pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgba(242, 202, 80, 0.15) 0%, transparent 70%)',
            }}
          />
          <div className="relative flex flex-col items-center gap-1.5 text-center">
            <span className="font-heading text-3xl font-bold text-gold sm:text-4xl">
              +{overflowCount}
            </span>
            <span className="font-heading text-[9px] uppercase tracking-wider text-text-muted">
              món nữa
            </span>
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-gold/10 px-2 py-0.5 font-heading text-[8px] uppercase tracking-wider text-gold/80">
              Xem tất cả
              <svg className="h-2 w-2" viewBox="0 0 8 8" fill="none">
                <path d="M1 4h6m0 0L4 1m3 3L4 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}

// ─── Mini product card cho grid ───
function ProductMiniCard({
  item,
  index,
}: {
  item: ReturnType<typeof useCartStore.getState>['items'][0];
  index: number;
}) {
  const countdownMs = useCountdown(item.expiresAt);

  return (
    <Link
      href={`/san-pham/${item.product.slug}`}
      className="group relative flex aspect-square flex-col overflow-hidden rounded-xl border border-gold/20 shadow-lg transition-all duration-300 hover:border-gold/50 hover:shadow-gold-glow motion-safe:animate-fadeInUp"
      style={{ animationDelay: `${200 + index * 80}ms`, animationFillMode: 'backwards' }}
    >
      {/* Product image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.product.image_url}
        alt={item.product.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, transparent 40%, rgba(13, 17, 23, 0.85) 100%)',
        }}
      />

      {/* Bottom content */}
      <div className="relative mt-auto p-2.5 sm:p-3">
        {/* Product title — truncate */}
        <p className="mb-1 truncate font-heading text-[11px] font-semibold text-text-base sm:text-xs">
          {item.product.title}
        </p>
        {/* Price + countdown */}
        <div className="flex items-center justify-between gap-1">
          <span className="font-sans text-[10px] font-semibold text-gold sm:text-[11px]">
            {formatVND(item.product.price)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-emerald/80 px-1.5 py-0.5 backdrop-blur-sm">
            <span className="font-mono text-[9px] font-bold text-gold sm:text-[10px]">
              {formatCountdown(countdownMs)}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* — Clock icon (SVG matching Figma) — */
function ClockIcon() {
  return (
    <svg
      width="16"
      height="21"
      viewBox="0 0 16 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 0C3.58 0 0 3.58 0 8v5c0 4.42 3.58 8 8 8s8-3.58 8-8V8c0-4.42-3.58-8-8-8z"
        fill="#F2CA50"
        opacity="0.4"
      />
      <path
        d="M8 4.5v4l3 2"
        stroke="#F2CA50"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}