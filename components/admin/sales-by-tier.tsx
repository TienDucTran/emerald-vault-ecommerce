'use client';

const tierData = [
  { tier: 'SSS', percentage: 35, value: '₫45.2M', color: 'from-gold to-gold-champagne' },
  { tier: 'SS', percentage: 28, value: '₫36.1M', color: 'from-gold/60 to-gold/20' },
  { tier: 'S', percentage: 22, value: '₫28.4M', color: 'from-gold/40 to-gold/10' },
  { tier: 'A', percentage: 15, value: '₫19.3M', color: 'from-gold/20 to-gold/5' },
];

export function SalesByTier() {
  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="mb-6">
        <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
          Sales by Tier
        </h3>
        <p className="text-xs text-[#D0C5AF]/50 mt-0.5">Revenue distribution by quality tier</p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4">
        {tierData.map((item) => (
          <div key={item.tier} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                    item.tier === 'SSS'
                      ? 'bg-gradient-to-r from-gold to-gold-champagne text-background'
                      : item.tier === 'SS'
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'bg-surface text-gold/80 border border-gold/20'
                  }`}
                >
                  {item.tier}
                </span>
                <span className="text-xs text-[#D0C5AF]/70">{item.value}</span>
              </div>
              <span className="text-[10px] text-[#D0C5AF]/50">{item.percentage}%</span>
            </div>
            <div className="h-1.5 bg-[rgba(18,36,28,0.8)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold/20 transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-[#4D4635]/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#D0C5AF]/50">Total Revenue</span>
          <span className="text-gold font-heading font-bold">₫129.0M</span>
        </div>
      </div>
    </div>
  );
}