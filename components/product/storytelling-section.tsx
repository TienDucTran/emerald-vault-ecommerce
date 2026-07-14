import Image from 'next/image';
import type { Product } from '@/lib/types';

interface StorytellingSectionProps {
  product: Product;
}

export function StorytellingSection({ product }: StorytellingSectionProps) {
  if (!product.story_quote && !product.story_body && !product.highlight_title) {
    return null;
  }

  return (
    <section className="border-t border-gold/10 pt-24">
      <div className="mx-auto max-w-4xl">
        {/* Section heading — center */}
        <h2 className="mb-12 text-center font-heading text-4xl font-bold tracking-tight text-text-base sm:text-5xl">
          CÂU CHUYỆN MÔN ĐỒ
        </h2>

        {/* Two-column: quote (left) + body (right) */}
        <div className="flex flex-col gap-16 lg:flex-row lg:items-start lg:gap-16">
          {/* Quote with decorative L-border */}
          {product.story_quote && (
            <div className="relative lg:w-2/5">
              {/* Decorative top-left border */}
              <div className="absolute -left-4 -top-4 h-24 w-24 border-l-2 border-t-2 border-gold/30" />
              <p className="font-heading text-lg font-semibold italic leading-relaxed text-text-base">
                {product.story_quote}
              </p>
            </div>
          )}

          {/* Body paragraphs */}
          {product.story_body && product.story_body.length > 0 && (
            <div className="flex flex-col gap-6 lg:w-3/5">
              {product.story_body.map((paragraph, i) => (
                <p key={i} className="text-base leading-relaxed text-text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Highlight card — image with blur overlay */}
        {product.highlight_title && product.highlight_image && (
          <div className="mt-16 flex justify-center">
            <div className="relative w-full max-w-md overflow-hidden rounded-sm border border-gold/20 bg-surface-emerald">
              {/* Background image */}
              <div className="relative aspect-[5/4] w-full">
                <Image
                  src={product.highlight_image}
                  alt={product.highlight_title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover opacity-40"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              </div>

              {/* Content overlay — centered */}
              <div className="absolute inset-0 flex flex-col justify-center gap-4 p-8 backdrop-blur-sm">
                <h3 className="font-heading text-2xl text-gold">
                  {product.highlight_title}
                </h3>
                {product.highlight_body && (
                  <p className="text-base leading-relaxed text-text-muted">
                    {product.highlight_body}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}