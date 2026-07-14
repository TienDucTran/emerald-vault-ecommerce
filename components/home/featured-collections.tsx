import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Collection } from '@/lib/types';

interface FeaturedCollectionsProps {
  collections: Collection[];
}

export function FeaturedCollections({ collections }: FeaturedCollectionsProps) {
  return (
    <section className="px-4 py-12 sm:px-8 sm:py-20">
      {/* Section header */}
      <div className="mx-auto mb-8 flex max-w-5xl flex-col items-center gap-4 text-center sm:mb-16">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-gold sm:text-5xl">
          Bộ Sưu Tập Di Sản
        </h2>
        <div className="h-px w-24 bg-gold/30" />
      </div>

      {/* Bento grid:
          - mobile (<md): 1 cột, stack dọc, tự co height theo aspect ratio
          - desktop (md+): 1 card lớn trái + 1 cột phải (1 top + 2 bottom), h-[800px] */}
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:h-[800px] md:flex-row md:gap-6">
        {/* Main collection — left, large */}
        <Link
          href="/san-pham?category=DAY_CHUYEN"
          className="group relative block aspect-[3/4] w-full overflow-hidden rounded border border-gold/10 bg-surface md:aspect-auto md:h-full md:w-1/2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/home/collection-main-465cec.png"
            alt="Dây Chuyền & Pendants"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(0deg, rgba(13, 17, 23, 1) 0%, rgba(13, 17, 23, 0) 50%, rgba(13, 17, 23, 0) 100%)',
            }}
          />
          {/* Content — bottom left */}
          <div className="absolute bottom-0 left-0 flex flex-col gap-2 p-6 md:p-10">
            <h3 className="font-heading text-2xl font-semibold text-text-base md:text-3xl">
              Dây Chuyền & Pendants
            </h3>
            <p className="font-heading text-base text-gold md:text-lg">
              Di sản từ các triều đại cổ
            </p>
            <div className="mt-2 flex items-center gap-2 md:mt-4">
              <span className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-gold">
                KHÁM PHÁ
              </span>
              <ArrowRight className="h-3 w-3 text-gold" />
            </div>
          </div>
        </Link>

        {/* Secondary collections — right column */}
        <div className="flex w-full flex-col gap-4 md:w-1/2 md:gap-6">
          {/* Top: Nhẫn Siêu Cấp — full width */}
          <Link
            href="/san-pham?tier=SSS"
            className="group relative block aspect-[16/9] flex-1 overflow-hidden rounded border border-gold/10 bg-surface md:aspect-auto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/home/collection-rings-5298d6.png"
              alt="Nhẫn Siêu Cấp"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-background/40" />
            {/* Content — centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center">
              <h3 className="font-heading text-xl font-semibold text-text-base sm:text-2xl">
                Nhẫn Siêu Cấp
              </h3>
              <p className="font-heading text-[10px] font-normal uppercase tracking-[0.1em] text-gold">
                TIER SSS ONLY
              </p>
            </div>
          </Link>

          {/* Bottom: 2 small cards side by side */}
          <div className="flex flex-1 gap-4 md:gap-6">
            {/* Bông Tai */}
            <Link
              href="/san-pham?category=BONG_TAI"
              className="group relative block aspect-square flex-1 overflow-hidden rounded border border-gold/10 bg-surface md:aspect-auto"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/home/collection-bong-tai-759e1e.png"
                alt="Bông Tai"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-background/50" />
              {/* Content — bottom left */}
              <div className="absolute bottom-0 left-0 p-3 sm:p-4">
                <h4 className="font-heading text-xs font-normal text-text-base">
                  Bông Tai
                </h4>
              </div>
            </Link>

            {/* Vòng Tay */}
            <Link
              href="/san-pham?category=VONG_TAY"
              className="group relative block aspect-square flex-1 overflow-hidden rounded border border-gold/10 bg-surface md:aspect-auto"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/home/collection-vong-tay-318ebe.png"
                alt="Vòng Tay"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-background/50" />
              {/* Content — bottom left */}
              <div className="absolute bottom-0 left-0 p-3 sm:p-4">
                <h4 className="font-heading text-xs font-normal text-text-base">
                  Vòng Tay
                </h4>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
