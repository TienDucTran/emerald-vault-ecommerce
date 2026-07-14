'use client';

import { cn } from '@/lib/utils';

// Sample data - in production, this would come from an API
const revenueData = [
  { day: 'Mon', amount: 3200000 },
  { day: 'Tue', amount: 4500000 },
  { day: 'Wed', amount: 2800000 },
  { day: 'Thu', amount: 5100000 },
  { day: 'Fri', amount: 4200000 },
  { day: 'Sat', amount: 6800000 },
  { day: 'Sun', amount: 5900000 },
];

const maxRevenue = Math.max(...revenueData.map((d) => d.amount));

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function shortenVND(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
}

export function RevenueChart() {
  return (
    <div className="relative h-full flex flex-col">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
            Revenue Trend
          </h3>
          <p className="text-xs text-[#D0C5AF]/50 mt-0.5">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-heading font-bold text-gold">
            {formatVND(revenueData.reduce((sum, d) => sum + d.amount, 0))}
          </p>
          <p className="text-[10px] text-success">↑ 12.5% vs last week</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex-1 flex items-end gap-3 pb-1">
        {revenueData.map((item, i) => {
          const heightPercent = (item.amount / maxRevenue) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[10px] text-[#D0C5AF]/40 font-medium">
                {shortenVND(item.amount)}
              </span>
              <div
                className="w-full rounded-sm relative group cursor-pointer"
                style={{
                  height: `${Math.max(heightPercent, 8)}%`,
                  background: `linear-gradient(180deg, rgba(242, 202, 80, 0.6) 0%, rgba(242, 202, 80, 0.15) 100%)`,
                  minHeight: '24px',
                }}
              >
                <div
                  className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(180deg, rgba(242, 202, 80, 0.8) 0%, rgba(242, 202, 80, 0.3) 100%)`,
                  }}
                />
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1F1B13] border border-[#4D4635] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  <span className="text-[10px] text-gold">{formatVND(item.amount)}</span>
                </div>
              </div>
              <span className="text-[10px] text-[#D0C5AF]/50">{item.day}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom Labels */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#4D4635]/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gold/60" />
            <span className="text-[10px] text-[#D0C5AF]/50">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gold/20 border border-gold/40" />
            <span className="text-[10px] text-[#D0C5AF]/50">Target</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="text-[10px] bg-transparent text-[#D0C5AF]/50 border border-[#4D4635] rounded px-2 py-0.5">
            <option>7 days</option>
            <option>30 days</option>
            <option>90 days</option>
          </select>
        </div>
      </div>
    </div>
  );
}