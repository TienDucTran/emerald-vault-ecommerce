import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Gem, Sparkles, Heart, ArrowRight } from 'lucide-react';

// Trang này gọi createClient() (cookies) → bắt buộc dynamic.
export const dynamic = 'force-dynamic';

const VALUES = [
  { icon: Gem, title: 'Tuyển chọn thủ công', desc: 'Chuyên gia 30 năm kinh nghiệm kiểm duyệt từng món.' },
  { icon: ShieldCheck, title: 'Thẩm định chất lượng', desc: '100% đã qua kiểm định — hoàn tiền nếu sai mô tả.' },
  { icon: Sparkles, title: 'Bản duy nhất', desc: 'Không bán hàng loạt. Mỗi món mang một câu chuyện riêng.' },
  { icon: Heart, title: 'Gìn giữ di sản', desc: 'Tìm người tri kỷ cho mỗi tuyệt tác vượt thời gian.' },
];

const MILESTONES = [
  { year: '1996', title: 'Khởi đầu từ Kyoto', desc: 'Cửa hàng nhỏ ở Kyoto — tìm kiếm trang sức cũ từ tiệm kim hoàn truyền thống.' },
  { year: '2005', title: 'Mở rộng Tokyo', desc: 'Mạng lưới đối tác mở rộng, tiếp cận bộ sưu tập thời Heisei & Showa.' },
  { year: '2015', title: 'Hệ thống Tier', desc: 'Ra mắt phân cấp SSS → S, đảm bảo minh bạch cho từng sản phẩm.' },
  { year: '2024', title: 'Emerald Vault online', desc: 'Mang di sản Nhật Bản đến tận tay người yêu trang sức Việt Nam.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Hero — đồng nhất với homepage hero (background image + gradient overlay) ─── */}
      <section className="relative flex min-h-[560px] w-full items-center justify-center overflow-hidden py-16 md:h-[720px] md:py-0">
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/home/hero-bg-3f80b8.png"
          alt="Emerald Vault — Câu chuyện"
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
              Câu chuyện của tiệm
            </p>
            <span className="h-px w-6 bg-gold opacity-60 sm:w-8" />
          </div>

          {/* H1 */}
          <h1
            className="flex flex-col items-center leading-none gap-y-1 sm:gap-y-2 motion-safe:animate-fadeInUp"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            <span className="font-heading text-[32px] sm:text-[56px] md:text-[88px] font-bold tracking-tight text-text-base">
              Về
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
              Emerald Vault
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="max-w-[90vw] sm:max-w-[600px] md:max-w-[672px] font-heading text-[13px] italic leading-relaxed text-text-muted sm:text-base md:text-lg motion-safe:animate-fadeInUp"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
          >
            {'Nơi những tuyệt tác vượt thời gian tìm thấy người tri kỷ — '}
            {'tuyển chọn từ Kyoto & Tokyo, gìn giữ cho thế hệ mai sau.'}
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
              Khám phá sưu tập
            </Link>
            <Link
              href="/lien-he"
              className="border border-gold px-5 py-2.5 text-center font-heading text-[10px] font-bold uppercase tracking-[0.1em] text-gold transition-all duration-300 hover:bg-gold/10 hover:-translate-y-0.5 sm:px-10 sm:py-4 sm:text-xs"
            >
              Liên hệ tiệm
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Story — đồng nhất với StoryTeaser (2-col grid: image + text) ─── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-2">
            {/* Image side */}
            <div
              className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-gold/20 shadow-2xl motion-safe:animate-fadeInUp"
              style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
            >
              <Image
                src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=85"
                alt="Vintage jewelry workshop"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute right-6 bottom-6 left-6 rounded-md border border-gold/30 bg-background/80 p-4 backdrop-blur-md">
                <p className="font-heading text-sm text-gradient-gold">Mỗi món đồ là một câu chuyện</p>
                <p className="mt-1 text-xs text-text-muted">30 năm tuyển chọn từ các tiệm kim hoàn Nhật</p>
              </div>
            </div>

            {/* Text side */}
            <div
              className="motion-safe:animate-fadeInUp"
              style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
            >
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.3em] text-gold sm:text-xs">
                ✦ TỪ NHỮNG NGÀY ĐẦU
              </p>
              <h2 className="mb-6 font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
                <span className="text-text-base">Đam mê </span>
                <span className="text-gradient-gold">với đồ si Nhật</span>
                <span className="text-text-base">, vượt qua thời gian</span>
              </h2>

              <div className="space-y-4 text-base leading-relaxed text-text-muted">
                <p>
                  Emerald Vault bắt đầu từ một cửa hàng nhỏ ở Kyoto, nơi chúng tôi tìm kiếm những
                  món trang sức cũ mà thời gian đã lãng quên.
                </p>
                <p>
                  Mỗi món đồ đều có một câu chuyện — một bà cô nhận được từ mẹ chồng, một chiếc
                  nhẫn đính hôn từ những năm 60, một đôi bông tai từ bộ sưu tập thời Heisei.
                </p>
                <p>
                  Chúng tôi không bán hàng loạt. Chúng tôi{' '}
                  <span className="text-gold">tuyển chọn, thẩm định, và gìn giữ</span> — để bạn
                  có thể sở hữu một phần lịch sử.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Values — đồng nhất với TrustStrip (border-y, bg-surface-emerald, grid) ─── */}
      <section className="border-y border-gold/10 bg-surface-emerald py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-gold sm:text-xs">
              ✦ Giá trị cốt lõi
            </p>
            <h2 className="font-heading text-2xl font-bold text-text-base sm:text-3xl lg:text-4xl">
              Vì sao chọn <span className="text-gradient-gold">Emerald Vault</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6 lg:gap-12">
            {VALUES.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex flex-col items-center gap-4 text-center motion-safe:animate-slideInLeft"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="grid h-12 w-12 place-items-center text-gold">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-gold">
                    {item.title}
                  </h3>
                  <p className="text-sm text-text-muted opacity-70">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Milestones — timeline dạng grid đơn giản, đồng nhất spacing ─── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-gold sm:text-xs">
              ✦ Hành trình
            </p>
            <h2 className="font-heading text-2xl font-bold text-text-base sm:text-3xl lg:text-4xl">
              <span className="text-gradient-gold">28 năm</span> gìn giữ di sản
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {MILESTONES.map((item, i) => (
              <div
                key={item.year}
                className="rounded-lg border border-gold/20 bg-surface-emerald/30 p-6 motion-safe:animate-fadeInUp"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
              >
                <p className="font-heading text-2xl font-bold text-gradient-gold">{item.year}</p>
                <h3 className="mt-2 font-heading text-base font-semibold text-text-base">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Commitment / CTA ─── */}
      <section className="border-t border-gold/10 bg-gradient-to-b from-surface-emerald/20 to-transparent py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-gold sm:text-xs">✦ Cam kết</p>
          <h2 className="mb-8 font-heading text-2xl font-bold text-text-base sm:text-3xl lg:text-4xl">
            <span className="text-gradient-gold">Lời hứa</span> của chúng tôi
          </h2>

          <ul className="mx-auto max-w-2xl space-y-3 text-left">
            {[
              '100% đã qua kiểm định chuyên gia',
              'Mỗi món là một bản duy nhất — không bán hàng loạt',
              'Đổi trả trong 7 ngày nếu không đúng mô tả',
              'Giao hàng cẩn thận, có bảo hiểm toàn trình',
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-md border border-gold/10 bg-surface-emerald/30 px-5 py-3 motion-safe:animate-fadeInUp"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
              >
                <span className="text-gold">✦</span>
                <span className="text-sm text-text-base">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/san-pham"
              className="group inline-flex h-12 items-center gap-2 rounded-md bg-gradient-gold px-6 text-sm font-semibold text-background transition-all duration-300 hover:scale-105 hover:shadow-gold-glow-lg active:scale-95"
            >
              Khám phá sưu tập
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/lien-he"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-gold/30 px-6 text-sm font-medium text-gold transition-all duration-300 hover:scale-105 hover:border-gold hover:bg-gold/10 active:scale-95"
            >
              Liên hệ với tiệm
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}