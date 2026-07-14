import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[560px] w-full items-center justify-center overflow-hidden py-16 md:h-[720px] md:py-0">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/home/hero-bg-3f80b8.png"
        alt="Hero background"
        className="absolute inset-0 h-full w-full object-cover"
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
        {/* Eyebrow — "— THE MATRIARCH COLLECTION —" */}
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-gold opacity-60 sm:w-8" />
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.3em] text-gold opacity-90 sm:text-xs">
            The Matriarch Collection
          </p>
          <span className="h-px w-6 bg-gold opacity-60 sm:w-8" />
        </div>

        {/* H1 — "Tuyệt tác Vượt Thời Gian"
            leading-none = line-height: 1 (sát chữ, đẹp cho display heading)
            gap-y-2 = khoảng cách giữa 2 dòng (8px) — kiểm soát được, không phụ thuộc font-size */}
        <h1 className="flex flex-col items-center leading-none gap-y-1 sm:gap-y-2">
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

        {/* Subtitle — italic serif, responsive max-width */}
        <p className="max-w-[90vw] sm:max-w-[600px] md:max-w-[672px] font-heading text-[13px] italic leading-relaxed text-text-muted sm:text-base md:text-lg">
          Khám phá kho lưu trữ trang sức di sản được tuyển chọn từ Tokyo và Paris,
          nơi mỗi viên đá kể một câu chuyện về sự vĩnh cửu.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 sm:gap-4 sm:pt-4">
          <Link
            href="/san-pham"
            className="bg-gold px-5 py-2.5 font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-background transition-colors hover:bg-gold-champagne sm:px-10 sm:py-4 sm:text-xs"
          >
            Khám phá ngay
          </Link>
          <Link
            href="/bo-suu-tap"
            className="border border-gold px-5 py-2.5 font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-gold transition-colors hover:bg-gold/10 sm:px-10 sm:py-4 sm:text-xs"
          >
            Xem bộ sưu tập
          </Link>
        </div>
      </div>

      {/* 10-Minute Hold Floating Badge — bottom right, ẩn trên mobile nhỏ */}
      <div className="hidden sm:flex absolute right-6 md:right-8 bottom-5 items-center gap-3 rounded-xl border border-gold/20 bg-surface-emerald/80 px-5 py-3 backdrop-blur-md md:px-6">
        <ClockIcon />
        <div className="flex flex-col">
          <span className="font-heading text-[10px] font-normal text-text-muted">
            Ưu tiên giữ hàng
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-sans text-base font-normal text-gold">9:57</span>
            <span className="font-sans text-xs font-normal text-gold opacity-70">phút</span>
          </div>
        </div>
      </div>
    </section>
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
