import { ProductCardMobile } from './mobile-product-card';

interface MobileProductGridProps {
  products: Array<{
    id: string;
    title: string;
    slug: string;
    image_url: string;
    price: number;
    status: string;
    quality_tier: string;
    era?: string;
    material: string;
  }>;
}

export function MobileProductGrid({ products }: MobileProductGridProps) {
  return (
    <section className="px-2 py-4">
      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-2">
        {products.map((product) => (
          <ProductCardMobile key={product.id} product={product} />
        ))}
      </div>

      {/* Infinite Scroll Signal */}
      <div className="flex flex-col items-center gap-4 py-12">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-[#c9a961] border-[rgba(242,202,80,0.2)] animate-spin"
        />
        <p className="font-heading text-[10px] uppercase tracking-[0.2em] text-text-muted">
          ĐANG TẢI THÊM TUYỆT TÁC
        </p>
      </div>
    </section>
  );
}