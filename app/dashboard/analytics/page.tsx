'use client';

const funnelSteps = [
  { label: 'Total Visitors', value: '12,847', percentage: 100, color: 'from-gold to-gold-champagne' },
  { label: 'Product Views', value: '8,234', percentage: 64, color: 'from-gold/80 to-gold/40' },
  { label: 'Add to Cart', value: '3,456', percentage: 27, color: 'from-gold/60 to-gold/30' },
  { label: 'Checkout Initiated', value: '1,234', percentage: 10, color: 'from-gold/40 to-gold/20' },
  { label: 'Completed Orders', value: '412', percentage: 3.2, color: 'from-gold/30 to-gold/10' },
];

const trafficSources = [
  { source: 'Direct', percentage: 32, value: '4,112', color: '#F2CA50' },
  { source: 'Social', percentage: 28, value: '3,597', color: '#10B981' },
  { source: 'Organic Search', percentage: 22, value: '2,826', color: '#3B82F6' },
  { source: 'Referral', percentage: 12, value: '1,542', color: '#8B5CF6' },
  { source: 'Email', percentage: 6, value: '771', color: '#F59E0B' },
];

const topProducts = [
  { rank: 1, name: 'Gold Necklace SSS', category: 'Necklace', tier: 'SSS', revenue: '₫32,800,000', units: 5, conversion: '4.8%' },
  { rank: 2, name: 'Emerald Ring SSS', category: 'Ring', tier: 'SSS', revenue: '₫28,900,000', units: 3, conversion: '3.2%' },
  { rank: 3, name: 'Diamond Pendant SSS', category: 'Pendant', tier: 'SSS', revenue: '₫24,000,000', units: 2, conversion: '2.1%' },
  { rank: 4, name: 'Silver Ring SS', category: 'Ring', tier: 'SS', revenue: '₫12,250,000', units: 8, conversion: '6.7%' },
  { rank: 5, name: 'Vintage Bracelet S', category: 'Bracelet', tier: 'S', revenue: '₫10,400,000', units: 4, conversion: '3.5%' },
];

const tierBadge = (tier: string) => {
  if (tier === 'SSS') return 'bg-gradient-to-r from-gold to-gold-champagne text-background';
  if (tier === 'SS') return 'bg-gold/20 text-gold border border-gold/40';
  return 'bg-surface text-gold/80 border border-gold/20';
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header Section — matches Figma node 35:283 */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">Analytics</h1>
          <p className="text-sm text-[#D0C5AF]/60">Track performance metrics and conversion data</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="px-6 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-gold text-gold hover:bg-gold/10 transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics Cards — matches Figma node 35:296 (4 cards, 24px gap) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* AOV Card */}
        <div
          className="relative flex flex-col gap-4 p-6 rounded-sm overflow-hidden"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-0"
            style={{
              background: 'linear-gradient(90deg, rgba(241, 229, 172, 0) 0%, rgba(241, 229, 172, 0.05) 50%, rgba(241, 229, 172, 0) 100%)'
            }}
          />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-heading tracking-[0.08em] uppercase text-[#D0C5AF]/70">AOV</span>
            <span className="text-gold/60 text-lg">₫</span>
          </div>
          <div className="relative z-10">
            <span className="text-3xl font-heading font-bold text-[#EAE1D4]">₫4,850,000</span>
            <p className="text-[10px] text-success mt-1">↑ 8.4% vs last period</p>
          </div>
          <div className="h-1 bg-[#38342B] rounded-full relative z-10 overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-gold to-gold-champagne rounded-full" />
          </div>
        </div>

        {/* Conversion Rate */}
        <div
          className="flex flex-col gap-4 p-6 rounded-sm"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading tracking-[0.08em] uppercase text-[#D0C5AF]/70">Conversion</span>
            <span className="text-gold/60 text-lg">↗</span>
          </div>
          <div>
            <span className="text-3xl font-heading font-bold text-[#EAE1D4]">3.2%</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#D0C5AF]/50 pt-1 border-t border-[#4D4635]/20">
            <span className="text-warning">↓ 0.5%</span>
            <span>vs last period</span>
          </div>
        </div>

        {/* Bounce Rate */}
        <div
          className="flex flex-col gap-2 p-6 rounded-sm"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading tracking-[0.08em] uppercase text-[#D0C5AF]/70">Bounce Rate</span>
            <span className="text-gold/60 text-lg">⬇</span>
          </div>
          <div>
            <span className="text-3xl font-heading font-bold text-[#EAE1D4]">42.3%</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#D0C5AF]/40">
            <span>Industry avg: 55%</span>
            <span className="text-success">↓ 3.1%</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div
          className="flex flex-col gap-4 p-6 rounded-sm"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(242, 202, 80, 0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading tracking-[0.08em] uppercase text-[#D0C5AF]/70">Total Revenue</span>
            <span className="text-gold text-lg">₫</span>
          </div>
          <div>
            <span className="text-3xl font-heading font-bold text-gold">₫129.0M</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#D0C5AF]/40">This period</span>
            <span className="text-success">↑ 15.2%</span>
          </div>
        </div>
      </div>

      {/* Conversion Funnel & Traffic Sources Grid — matches Figma node 35:330 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ gridTemplateRows: '507.59px' }}>
        {/* Large Conversion Funnel — spans 2 cols */}
        <div
          className="lg:col-span-2 p-8 rounded-sm flex flex-col"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
                Conversion Funnel
              </h3>
              <p className="text-xs text-[#D0C5AF]/50 mt-0.5">Last 30 days</p>
            </div>
            <select className="text-[10px] bg-transparent text-[#D0C5AF]/50 border border-[#4D4635] rounded px-2 py-0.5">
              <option>30 days</option>
              <option>7 days</option>
              <option>90 days</option>
            </select>
          </div>

          {/* Funnel Steps */}
          <div className="flex-1 flex flex-col justify-center gap-8">
            {funnelSteps.map((step, i) => (
              <div key={step.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[9px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-xs text-[#D0C5AF]">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[#EAE1D4] font-medium">{step.value}</span>
                    <span className="text-[10px] text-[#D0C5AF]/50 w-10 text-right">{step.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 bg-[rgba(18,36,28,0.8)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${step.color} transition-all duration-500`}
                    style={{ width: `${step.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div
          className="p-8 rounded-sm flex flex-col"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <div>
            <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
              Traffic Sources
            </h3>
            <p className="text-xs text-[#D0C5AF]/50 mt-0.5">Where visitors come from</p>
          </div>

          {/* Donut chart */}
          <div className="flex-1 flex flex-col justify-center gap-6 pb-4">
            {/* Visual donut representation */}
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {trafficSources.map((source, i) => {
                    const circumference = 2 * Math.PI * 40;
                    const total = trafficSources.reduce((s, t) => s + t.percentage, 0);
                    const offset = trafficSources.slice(0, i).reduce((s, t) => s + (t.percentage / total) * circumference, 0);
                    const length = (source.percentage / total) * circumference;
                    return (
                      <circle
                        key={source.source}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={source.color}
                        strokeWidth="12"
                        strokeDasharray={`${length} ${circumference - length}`}
                        strokeDashoffset={-offset}
                        className="transition-all duration-500"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-xl font-heading font-bold text-[#EAE1D4]">12.8K</span>
                    <p className="text-[9px] text-[#D0C5AF]/40">Total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Source list */}
            <div className="space-y-3">
              {trafficSources.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: source.color }} />
                    <span className="text-[10px] text-[#D0C5AF]/70">{source.source}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#D0C5AF]/50">{source.value}</span>
                    <span className="text-[10px] text-[#D0C5AF]/70 w-8 text-right">{source.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-[#4D4635] flex items-center justify-center gap-6">
            <span className="text-[10px] text-[#D0C5AF]/30">Direct</span>
            <span className="text-[10px] text-[#D0C5AF]/30">Social</span>
            <span className="text-[10px] text-[#D0C5AF]/30">Search</span>
          </div>
        </div>
      </div>

      {/* Top Performing Products Table — matches Figma node 35:453 */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        {/* Table Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#4D4635]">
          <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
            Top Performing Products
          </h3>
          <button className="text-[10px] text-gold hover:text-gold/80 transition-colors font-heading tracking-[0.1em] uppercase">
            View Report →
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(31, 27, 19, 0.5)' }}>
                <th className="text-left px-8 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">#</th>
                <th className="text-left px-8 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Product</th>
                <th className="text-left px-8 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Category</th>
                <th className="text-left px-8 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Tier</th>
                <th className="text-left px-8 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Revenue</th>
                <th className="text-left px-8 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Units</th>
                <th className="text-left px-8 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">CVR</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr
                  key={product.rank}
                  className="border-b border-[rgba(77,70,53,0.1)] hover:bg-[rgba(56,52,43,0.1)] transition-colors"
                >
                  <td className="px-8 py-4">
                    <span className="text-[10px] text-[#D0C5AF]/50 font-medium">{String(product.rank).padStart(2, '0')}</span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#1F1B13] border border-[rgba(77,70,53,0.3)] flex items-center justify-center">
                        <span className="text-[8px] text-[#D0C5AF]/30">◆</span>
                      </div>
                      <div>
                        <p className="text-xs text-[#D0C5AF]">{product.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xs text-[#D0C5AF]/70">{product.category}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${tierBadge(product.tier)}`}>
                      {product.tier}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xs text-[#EAE1D4] font-medium">{product.revenue}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xs text-[#D0C5AF]/70">{product.units}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xs text-gold">{product.conversion}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Overlay with Show More */}
        <div
          className="px-8 py-6 flex items-center justify-center"
          style={{ background: 'rgba(31, 27, 19, 0.3)' }}
        >
          <button className="text-[10px] text-gold/70 hover:text-gold font-heading tracking-[0.1em] uppercase transition-colors">
            Show All Products →
          </button>
        </div>
      </div>

      {/* Floating Utility: 10-Minute Hold Monitor — matches Figma node 35:625 */}
      <div
        className="fixed bottom-8 right-8 z-50 flex items-center gap-0 px-5 py-3 rounded-xl shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
        style={{
          background: '#12241C',
          border: '1px solid rgba(242, 202, 80, 0.3)',
        }}
      >
        {/* Timer icon */}
        <div className="pr-3">
          <svg className="w-[18px] h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Timer text */}
        <div className="pr-6">
          <p className="text-xs text-[#D0C5AF]/80">Hold Timer</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-heading font-bold text-[#EAE1D4]">08:22</span>
            <span className="text-[9px] text-[#D0C5AF]/50">mins</span>
          </div>
        </div>

        {/* Vertical divider + release info */}
        <div className="pl-6 border-l border-[#4D4635]">
          <span className="text-[9px] text-[#D0C5AF]/50">until release</span>
        </div>
      </div>
    </div>
  );
}