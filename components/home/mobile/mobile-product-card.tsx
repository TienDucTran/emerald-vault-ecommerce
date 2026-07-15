// Mobile product card — 2-col grid theo Figma homePage-mobile
// Layout: ảnh 3:4 + gradient bottom + tag era (Cinzel gold 70%) + title (Cormorant) + price (Inter bold) + tier badge góc trên
// Overlay "ĐÃ SƯU TẦM" nếu status === 'SOLD_OUT'
import Link from 'next/link';
import type { ProductCategory, Material, ProductStatus, QualityTier } from '@/lib/types';

interface ProductCardMobileProps {
  product: {
    id: string;
    title: string;
    slug: string;
    image_url: string;
    price: number;
    status: ProductStatus | string;
    quality_tier: QualityTier | string;
    era?: string;
    material: Material | string;
  };
}

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  SSS: { bg: 'rgba(13,17,23,0.9)', border: 'rgba(242,202,80,0.3)', text: '#F2CA50' },
  SS:  { bg: 'rgba(13,17,23,0.8)',  border: 'rgba(77,70,53,0.5)',   text: '#D0C5AF' },
  S:   { bg: 'rgba(13,17,23,0.8)',  border: 'rgba(77,70,53,0.5)',   text: '#D0C5AF' },
};

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

function materialLabel(m: string): string {
  const map: Record<string, string> = {
    BAC_925: 'STERLING SILVER',
    MA_VANG_18K: '18K GOLD-PLATED',
    MA_VANG_24K: '24K GOLD-PLATED',
    VANG_18K: '18K GOLD',
    KIM_CUONG: 'DIAMOND',
  };
  return map[m] ?? m;
}

export function ProductCardMobile({ product }: ProductCardMobileProps) {
  const isSoldOut = product.status === 'SOLD_OUT';
  const tier = TIER_STYLES[product.quality_tier] ?? TIER_STYLES.S;
  const era = product.era || materialLabel(product.material);

  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="group relative flex flex-col rounded-sm overflow-hidden border border-[rgba(77,70,53,0.1)] bg-[#231F17] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_0_rgba(242,202,80,0.12)]"
      style={{ aspectRatio: '0.75' }}
    >
      {/* Image */}
      <div
        className="flex-1 bg-center bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: `url('${product.image_url}')` }}
      />

      {/* Gradient overlay bottom */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: 96,
          background: 'linear-gradient(0deg, rgba(13,17,23,0.95) 0%, rgba(13,17,23,0) 100%)',
        }}
      />

      {/* Tier badge — top-left */}
      <div
        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-sm border"
        style={{ background: tier.bg, borderColor: tier.border }}
      >
        <span
          className="font-sans font-bold text-[9px] tracking-wider uppercase"
          style={{ color: tier.text }}
        >
          TIER {product.quality_tier}
        </span>
      </div>

      {/* Sold-out overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(13,17,23,0.85)] backdrop-blur-sm">
          <div className="px-4 py-1 border border-[#F1E5AC]">
            <span className="font-heading text-sm tracking-[0.2em] uppercase text-[#F1E5AC]">
              Đã sưu tầm
            </span>
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-2 flex flex-col gap-1">
        <span className="font-heading text-[9px] tracking-[0.15em] uppercase text-[rgba(242,202,80,0.7)] truncate">
          {era}
        </span>
        <h3 className="font-serif text-[13px] leading-tight text-[#EAE1D4] line-clamp-2">
          {product.title}
        </h3>
        <span className="font-sans font-bold text-[14px] text-[#F2CA50] mt-1">
          {formatVND(product.price)}
        </span>
      </div>
    </Link>
  );
}
