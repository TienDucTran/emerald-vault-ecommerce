import Link from 'next/link';

/* — Tier data per Figma — */
const TIERS = [
  {
    code: 'SSS',
    title: 'Bảo Vật Cấp Cao',
    desc: 'Độ hiếm cực cao, tình trạng tuyệt mỹ (Deadstock). Có giấy tờ giám định quốc tế (GIA, IGI) và lịch sử sở hữu danh giá.',
    bg: 'bg-[#262418]',
    border: 'border border-gold',
    codeSize: 'text-[64px]',
    titleSize: 'text-xl',
    codeColor: 'text-gold',
    titleColor: 'text-gold',
    descColor: 'text-text-base',
  },
  {
    code: 'SS',
    title: 'Tinh Hoa Tuyển Chọn',
    desc: 'Thiết kế tiêu biểu của một thời kỳ hoàng kim. Tình trạng bảo quản xuất sắc, mang tinh thần mỹ và giá trị đầu tư cao.',
    bg: 'bg-[#1F1B13]',
    border: 'border border-gold/40',
    codeSize: 'text-[52px]',
    titleSize: 'text-xl',
    codeColor: 'text-text-base',
    titleColor: 'text-text-base',
    descColor: 'text-text-muted',
  },
  {
    code: 'S',
    title: 'Cổ Điển Thanh Lịch',
    desc: 'Trang sức Vintage chính hiệu cho phong cách hàng ngày. Tình trạng tốt, mang đậm nét hoài cổ và dễ phối đồ.',
    bg: 'bg-[#1A170F]',
    border: 'border border-gold/20',
    codeSize: 'text-[44px]',
    titleSize: 'text-xl',
    codeColor: 'text-text-muted',
    titleColor: 'text-text-muted',
    descColor: 'text-text-muted/80',
  },
];

export function TierShowcase() {
  return (
    <section className="hidden md:block bg-background py-20 md:px-32 px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center gap-4 text-center">
          <p className="font-heading text-xs uppercase tracking-[0.3em] text-gold">
            AUTHENTICATION STANDARDS
          </p>
          <h2 className="font-heading text-4xl font-semibold uppercase tracking-[0.1em] text-gold">
            Hệ Thống Phân Cấp Chất Lượng
          </h2>
          <span className="mt-1 h-px w-16 bg-gold" />
          <p className="font-heading text-sm italic text-text-muted">
            Tiêu chuẩn khắt khe từ Bà Chủ Tiệm nhằm đảm bảo giá trị nội tại cho từng sản phẩm.
          </p>
        </div>

        {/* Tier cards — 3 columns */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <Link
              key={tier.code}
              href={`/san-pham?tier=${tier.code}`}
              className={`group flex flex-col items-center gap-6 rounded-lg ${tier.bg} ${tier.border} px-8 pt-10 pb-12 text-center transition-all hover:scale-[1.02]`}
            >
              {/* Tier code — large */}
              <span
                className={`font-heading font-normal leading-none ${tier.codeSize} ${tier.codeColor}`}
              >
                {tier.code}
              </span>

              {/* Divider */}
              <span className="h-px w-10 bg-gold/30" />

              {/* Tier info */}
              <div className="flex flex-col gap-3">
                <h4
                  className={`font-heading ${tier.titleSize} font-semibold uppercase tracking-[0.05em] ${tier.titleColor}`}
                >
                  {tier.title}
                </h4>
                <p className={`text-sm leading-relaxed ${tier.descColor}`}>
                  {tier.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
