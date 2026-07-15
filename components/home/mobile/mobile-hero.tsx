export function MobileHero() {
  return (
    <>
      {/* Header Section */}
      <section
        className="flex flex-col gap-2 bg-surface-emerald px-4 pb-4 pt-8"
        style={{ backgroundColor: '#12241C' }}
      >
        {/* Eyebrow */}
        <p
          className="font-heading text-[10px] uppercase tracking-[0.2em] text-gold motion-safe:animate-fadeInUp"
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
          TIER SSS CURATION
        </p>

        {/* H1 */}
        <h2
          className="font-heading text-[32px] font-normal leading-[1.3em] text-text-base motion-safe:animate-fadeInUp"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          Kho Lưu Trữ Tuyệt Tác
        </h2>

        {/* Badge row */}
        <div
          className="mt-2 flex items-center gap-2 motion-safe:animate-fadeInUp"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <ShieldIcon />
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-gold/80">
            GIÁM ĐỊNH CHUYÊN GIA
          </p>
        </div>
      </section>

      {/* 10-Minute Hold Banner */}
      <div
        className="flex items-center justify-between px-4 py-2.5 motion-safe:animate-slideDown"
        style={{
          backgroundColor: 'rgba(52, 76, 63, 0.2)',
          borderBottom: '1px solid rgba(242, 202, 80, 0.1)',
          animationDelay: '450ms',
          animationFillMode: 'backwards',
        }}
      >
        <div className="flex items-center gap-2">
          <ClockSmallIcon />
          <p className="font-heading text-[12px] font-normal text-text-base">
            Ưu tiên giữ hàng 10 phút
          </p>
        </div>
        <p className="font-mono text-[14px] font-bold text-gold">9:57</p>
      </div>
    </>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 0L1 2.5V7C1 10.5 3.5 13 7 14C10.5 13 13 10.5 13 7V2.5L7 0Z"
        fill="rgba(242, 202, 80, 0.8)"
      />
      <path
        d="M4.5 7L6.5 9L9.5 5.5"
        stroke="#0D1117"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockSmallIcon() {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6.5" cy="7.5" r="6" stroke="#F2CA50" strokeWidth="1.5" />
      <path
        d="M6.5 4V7.5L9 9"
        stroke="#F2CA50"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}