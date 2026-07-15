'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/admin/stat-card';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { SalesByTier } from '@/components/admin/sales-by-tier';
import { RecentOrdersTable } from '@/components/admin/recent-orders-table';
import { LowStockAlerts } from '@/components/admin/low-stock-alerts';

export default function DashboardPage() {
  // Render giờ phía client để tránh hydration mismatch (server và client có thể
  // lệch vài giây khi dùng new Date() trong JSX).
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(new Date().toLocaleTimeString('vi-VN'));
    const t = setInterval(() => {
      setNow(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section — matches Figma node 31:4 */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">
            Welcome back, Admin. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date filter */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs text-[#D0C5AF]/80 font-heading tracking-[0.05em]"
            style={{
              background: 'rgba(18, 36, 28, 0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(242, 202, 80, 0.2)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Today</span>
            <svg className="w-3 h-3 text-[#D0C5AF]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Export button */}
          <button
            className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase font-bold transition-colors"
            style={{
              background: 'rgba(18, 36, 28, 0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(242, 202, 80, 0.2)',
              color: '#F2CA50',
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Stat Cards Bento — matches Figma node 31:23 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Revenue"
          value="₫32.5M"
          subtitle="Total revenue today"
          trend={{ value: '8.2% vs yesterday', isPositive: true }}
          icon="₫"
          gradient="rgba(242, 202, 80, 1) 100%, rgba(241, 229, 172, 0.1) 100%"
          className="border-[rgba(242,202,80,0.3)]"
        />
        <StatCard
          title="New Orders"
          value="24"
          subtitle="Orders placed today"
          trend={{ value: '12% vs yesterday', isPositive: true }}
          icon="📋"
          gradient="rgba(178, 205, 188, 0.3) 100%, rgba(241, 229, 172, 0.1) 100%"
          className="border-[rgba(178,205,188,0.2)]"
        />
        <StatCard
          title="Active Locks"
          value="8"
          subtitle="Items currently locked"
          trend={{ value: '3 expiring soon', isPositive: false }}
          icon="🔒"
          gradient="rgba(255, 180, 171, 0.5) 100%, rgba(241, 229, 172, 0.1) 100%"
          className="border-[rgba(255,180,171,0.3)]"
        />
        <StatCard
          title="Site Sessions"
          value="1,284"
          subtitle="Visitors today"
          trend={{ value: '5.7% vs yesterday', isPositive: true }}
          icon="👁"
          gradient="rgba(37, 65, 136, 0.3) 100%, rgba(241, 229, 172, 0.1) 100%"
          className="border-[rgba(37,65,136,0.3)]"
        />
      </div>

      {/* Charts Section — matches Figma node 31:67 (grid: 3 cols, row 400px) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Trend — spans 2 cols, matches Figma node 31:68 */}
        <div
          className="lg:col-span-2 p-8 rounded-sm min-h-[400px]"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <RevenueChart />
        </div>

        {/* Sales by Tier — matches Figma node 31:116 */}
        <div
          className="p-8 rounded-sm"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <SalesByTier />
        </div>
      </div>

      {/* Tables Section — matches Figma node 31:154 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders — matches Figma node 31:155 */}
        <div
          className="rounded-sm overflow-hidden"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <RecentOrdersTable />
        </div>

        {/* Low Stock / Active Locks — matches Figma node 31:236 */}
        <div
          className="rounded-sm overflow-hidden"
          style={{
            background: 'rgba(18, 36, 28, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(241, 229, 172, 0.1)',
          }}
        >
          <LowStockAlerts />
        </div>
      </div>

      {/* Footer / System Health — matches Figma node 31:312 */}
      <div
        className="flex items-center justify-between py-8 border-t border-[#4D4635]"
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-[#D0C5AF]/60">All systems operational</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[#D0C5AF]/30">
            <span>Uptime: 99.9%</span>
            <span>Response: 45ms</span>
            <span>DB: Healthy</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#D0C5AF]/30" suppressHydrationWarning>
            Last updated: {now ?? '--:--:--'}
          </p>
        </div>
      </div>
    </div>
  );
}
