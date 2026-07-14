import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function StoryTeaser() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Image side */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-gold/20 shadow-2xl">
            <Image
              src="https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1200&q=85"
              alt="Craftsmanship"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute right-6 bottom-6 left-6 rounded-md border border-gold/30 bg-background/80 p-4 backdrop-blur-md">
              <p className="font-heading text-sm text-gradient-gold">Mỗi món đồ là một câu chuyện</p>
              <p className="mt-1 text-xs text-text-muted">30 năm tuyển chọn từ các tiệm kim hoàn Nhật</p>
            </div>
          </div>

          {/* Text side */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
              ✦ CÂU CHUYỆN CỦA TIỆM
            </p>
            <h2 className="mb-6 font-heading text-3xl font-bold sm:text-4xl">
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

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/cau-chuyen"
                className="group inline-flex h-12 items-center gap-2 rounded-md bg-gradient-gold px-6 text-sm font-semibold text-background transition-shadow hover:shadow-gold-glow-lg"
              >
                Đọc câu chuyện
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/cach-phan-biet-do-si"
                className="inline-flex h-12 items-center gap-2 rounded-md border border-gold/30 px-6 text-sm font-medium text-gold transition-colors hover:border-gold hover:bg-gold/10"
              >
                Cách phân biệt đồ si thật
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
