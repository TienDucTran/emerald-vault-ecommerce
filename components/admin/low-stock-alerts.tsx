'use client';

import { tierBadgeClass } from '@/lib/utils';

const lowStockItems = [
  { name: 'Silver Ring SS', sku: 'SR-001', stock: 2, threshold: 5, tier: 'SS' },
  { name: 'Gold Necklace SSS', sku: 'GN-023', stock: 1, threshold: 3, tier: 'SSS' },
  { name: 'Vintage Bracelet S', sku: 'VB-045', stock: 3, threshold: 10, tier: 'S' },
  { name: 'Pearl Earrings SS', sku: 'PE-012', stock: 0, threshold: 5, tier: 'SS' },
  { name: 'Emerald Ring SSS', sku: 'ER-007', stock: 1, threshold: 4, tier: 'SSS' },
];

export function LowStockAlerts() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#4D4635] gap-2">
        <div>
          <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
            Inventory Alerts
          </h3>
          <p className="text-[10px] text-[#D0C5AF]/50 mt-0.5">Low stock & expiring locks</p>
        </div>
      </div>

      {/* Alert Items */}
      <div className="divide-y divide-[#4D4635]/10">
        {lowStockItems.map((item, i) => {
          const isOutOfStock = item.stock === 0;
          const isCritical = item.stock <= item.threshold / 3 && item.stock > 0;

          return (
            <div
              key={item.sku}
              className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-[rgba(56,52,43,0.1)] transition-colors gap-2 min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Status indicator */}
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isOutOfStock
                      ? 'bg-error'
                      : isCritical
                      ? 'bg-warning'
                      : 'bg-gold/50'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs text-[#D0C5AF] truncate">{item.name}</p>
                  <p className="text-[10px] text-[#D0C5AF]/40">SKU: {item.sku}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Tier badge */}
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${tierBadgeClass(item.tier)}`}
                >
                  {item.tier}
                </span>

                {/* Stock count */}
                <span
                  className={`text-xs font-bold ${
                    isOutOfStock ? 'text-error' : isCritical ? 'text-warning' : 'text-gold/80'
                  }`}
                >
                  {item.stock}
                </span>

                {/* Threshold */}
                <span className="text-[10px] text-[#D0C5AF]/30 hidden sm:inline">/ {item.threshold}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-3 border-t border-[#4D4635]/30">
        <button className="text-[10px] text-gold hover:text-gold/80 transition-colors font-heading tracking-[0.1em] uppercase">
          View Inventory →
        </button>
      </div>
    </div>
  );
}