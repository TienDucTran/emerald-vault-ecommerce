/**
 * ProductUnavailableOverlay — Vintage "ĐÃ ĐƯỢC SƯU TẦM" stamp style.
 *
 * Áp dụng cho 2 status: SOLD_OUT và RESERVED.
 *   - SOLD_OUT → "ĐÃ ĐƯỢC SƯU TẦM" (vĩnh viễn)
 *   - RESERVED → "ĐANG CHỜ SƯU TẦM" (tạm thời — sẽ về AVAILABLE nếu order cancel)
 *
 * Lý do dùng chung UI:
 *   - Đồ si Nhật vintage là độc bản, 1 cái duy nhất
 *   - Đã reserve = đã có người "chốt" mua = user khác không nên click "Giữ hàng"
 *   - UX thống nhất, tránh hụt hẫng khi cancel order → tự động quay lại AVAILABLE
 *
 * Visual: dark overlay + gold uppercase text + 2 gạch chéo (top-left & bottom-right)
 * giống stamp/seal vintage trên giấy da.
 *
 * Props:
 *   - status: 'SOLD_OUT' | 'RESERVED' — chọn text
 *   - variant: 'full' (overlay toàn image) | 'badge' (badge góc) — default 'full'
 *   - className: thêm class ngoài
 */
import { cn } from '@/lib/utils';
import type { ProductStatus } from '@/lib/types';

interface ProductUnavailableOverlayProps {
  status: 'SOLD_OUT' | 'RESERVED';
  variant?: 'full' | 'badge';
  className?: string;
}

const TEXT: Record<'SOLD_OUT' | 'RESERVED', string[]> = {
  SOLD_OUT: ['ĐÃ ĐƯỢC', 'SƯU TẦM'],
  RESERVED: ['ĐANG CHỜ', 'SƯU TẦM'],
};

export function ProductUnavailableOverlay({
  status,
  variant = 'full',
  className,
}: ProductUnavailableOverlayProps) {
  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-background/80 px-2.5 py-1 font-heading text-[10px] font-semibold tracking-[0.15em] text-gold uppercase backdrop-blur-sm',
          className
        )}
        role="status"
        aria-label={TEXT[status].join(' ')}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
        {TEXT[status].join(' ')}
      </span>
    );
  }

  return (
    <div
      className={cn(
        // Overlay phủ toàn image
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center',
        'bg-background/65 backdrop-blur-[1px]',
        className
      )}
      role="status"
      aria-label={TEXT[status].join(' ')}
    >
      {/* 2 đường gạch chéo (top-left → bottom-right) tạo cảm giác stamp vintage */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent 0, transparent 8px, rgba(212, 175, 55, 0.04) 8px, rgba(212, 175, 55, 0.04) 9px)',
        }}
      />
      {/* 2 đường viền gạch chéo nổi bật (top + bottom của text) — cách xa nhau hơn để cân với text 2 dòng */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 h-[1px] w-[180%] -translate-x-1/2 -translate-y-[calc(50%+44px)] rotate-[-12deg] bg-gradient-to-r from-transparent via-gold/70 to-transparent"
      />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 h-[1px] w-[180%] -translate-x-1/2 -translate-y-[calc(50%-44px)] rotate-[-12deg] bg-gradient-to-r from-transparent via-gold/70 to-transparent"
      />

      {/* Text chính — 2 dòng, xoay nhẹ theo gạch chéo */}
      <div className="relative -rotate-[12deg] text-center">
        <p
          className="font-heading text-2xl font-bold leading-[1.1] tracking-[0.15em] text-gold uppercase sm:text-3xl"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
        >
          {TEXT[status].map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

/**
 * Helper: check xem product status có cần hiển thị overlay không.
 * Dùng trong ProductCard, ProductGallery, ... để tránh lặp logic.
 */
export function isUnavailableStatus(
  status: ProductStatus | string
): status is 'SOLD_OUT' | 'RESERVED' {
  return status === 'SOLD_OUT' || status === 'RESERVED';
}
