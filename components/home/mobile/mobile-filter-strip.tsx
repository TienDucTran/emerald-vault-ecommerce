// Horizontal filter strip cho mobile (trượt ngang, dưới hero)
import { ChevronDown } from 'lucide-react';

const FILTERS = ['TẤT CẢ', 'NHẪN', 'DÂY CHUYỀN', 'BÔNG TAI', 'VÒNG TAY', 'MẶT DÂY', 'SI MỚI VỀ'] as const;

interface MobileFilterStripProps {
  totalProducts: number;
  displayedProducts: number;
}

export function MobileFilterStrip({ totalProducts, displayedProducts }: MobileFilterStripProps) {
  return (
    <div className="border-b border-[#c9a961]/20 bg-black/40">
      <div className="flex items-center justify-between px-4 py-2.5 text-[11px] tracking-wider text-[#c9a961]/70">
        <span>
          HIỂN THỊ <span className="text-[#c9a961]">{displayedProducts}</span> / {totalProducts} SẢN PHẨM
        </span>
        <button
          type="button"
          className="flex items-center gap-1 text-[#c9a961] hover:text-[#c9a961]/80"
        >
          SẮP XẾP
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            type="button"
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[10px] tracking-wider border transition-colors ${
              i === 0
                ? 'bg-[#c9a961] text-black border-[#c9a961]'
                : 'border-[#c9a961]/30 text-[#c9a961]/80 hover:border-[#c9a961] hover:text-[#c9a961]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
