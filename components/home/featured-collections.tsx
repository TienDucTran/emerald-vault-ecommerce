import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomeBanner, BannerSlotKey } from '@/lib/types';
import { DEFAULT_BANNERS, bannersBySlot } from '@/lib/supabase/queries/site-content-defaults';

interface FeaturedCollectionsProps {
  /** Dynamic banners from API — if empty or missing, falls back to defaults */
  banners?: HomeBanner[];
  /** Legacy prop — kept for backward compat but not used for rendering */
  collections?: unknown[];
}

export function FeaturedCollections({ banners }: FeaturedCollectionsProps) {
  // Build slot map with fallback to defaults
  const slots = bannersBySlot(banners ?? DEFAULT_BANNERS);
  const main = slots['main']!;
  const top = slots['top']!;
  const bottomLeft = slots['bottom_left']!;
  const bottomRight = slots['bottom_right']!;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      {/* Section header */}
      <div
        className="mx-auto mb-8 flex w-full max-w-store flex-col items-center gap-4 px-4 text-center motion-safe:animate-fadeInUp sm:mb-16 sm:px-6 lg:px-8 xl:px-10"
        style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
      >
        <h2 className="font-heading text-2xl font-bold tracking-tight text-gold sm:text-3xl lg:text-5xl">
          Bộ Sưu Tập Di Sản
        </h2>
        <div className="h-px w-24 bg-gold/30" />
      </div>

      {/* Bento grid:
          - mobile (<md): 1 cột, stack dọc, tự co height theo aspect ratio
          - desktop (md+): 1 card lớn trái + 1 cột phải (1 top + 2 bottom), h-[800px] */}
      <div className="mx-auto flex w-full max-w-store flex-col gap-4 px-4 sm:px-6 md:h-[800px] md:flex-row md:gap-6 lg:px-8 xl:px-10">
        {/* Main collection — left, large */}
        <Link
          href={main.link_url}
          className="group relative block aspect-[3/4] w-full overflow-hidden rounded border border-gold/10 bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-safe:animate-fadeInUp md:aspect-auto md:h-full md:w-1/2"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={main.image_url}
            alt={main.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
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
              {main.title}
            </h3>
            {main.subtitle && (
              <p className="font-heading text-base text-gold md:text-lg">
                {main.subtitle}
              </p>
            )}
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
          {/* Top: full width */}
          <Link
            href={top.link_url}
            className="group relative block aspect-[16/9] flex-1 overflow-hidden rounded border border-gold/10 bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-safe:animate-fadeInUp md:aspect-auto"
            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={top.image_url}
              alt={top.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-background/40" />
            {/* Content — centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center">
              <h3 className="font-heading text-xl font-semibold text-text-base sm:text-2xl">
                {top.title}
              </h3>
              {top.subtitle && (
                <p className="font-heading text-[10px] font-normal uppercase tracking-[0.1em] text-gold">
                  {top.subtitle}
                </p>
              )}
            </div>
          </Link>

          {/* Bottom: 2 small cards side by side */}
          <div className="flex flex-1 gap-4 md:gap-6">
            {/* Bottom Left */}
            <Link
              href={bottomLeft.link_url}
              className="group relative block aspect-square flex-1 overflow-hidden rounded border border-gold/10 bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-safe:animate-fadeInUp md:aspect-auto"
              style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottomLeft.image_url}
                alt={bottomLeft.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-background/50" />
              {/* Content — bottom left */}
              <div className="absolute bottom-0 left-0 p-3 sm:p-4">
                <h4 className="font-heading text-xs font-normal text-text-base">
                  {bottomLeft.title}
                </h4>
              </div>
            </Link>

            {/* Bottom Right */}
            <Link
              href={bottomRight.link_url}
              className="group relative block aspect-square flex-1 overflow-hidden rounded border border-gold/10 bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-safe:animate-fadeInUp md:aspect-auto"
              style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottomRight.image_url}
                alt={bottomRight.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-background/50" />
              {/* Content — bottom left */}
              <div className="absolute bottom-0 left-0 p-3 sm:p-4">
                <h4 className="font-heading text-xs font-normal text-text-base">
                  {bottomRight.title}
                </h4>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}