'use client';

import { useState } from 'react';
import Link from 'next/link';

const orders = [
  { code: '#EV-2026-001', customer: 'Nguyễn Thị Hương', phone: '0901 234 567', items: 2, total: '₫4,850,000', payment: 'COD', status: 'NEW', date: '2026-07-15', time: '2 min ago' },
  { code: '#EV-2026-002', customer: 'Trần Văn Minh', phone: '0912 345 678', items: 1, total: '₫12,800,000', payment: 'MOMO', status: 'CONFIRMED', date: '2026-07-15', time: '15 min ago' },
  { code: '#EV-2026-003', customer: 'Lê Thị Mai', phone: '0908 765 432', items: 3, total: '₫7,600,000', payment: 'COD', status: 'SHIPPING', date: '2026-07-15', time: '1 hour ago' },
  { code: '#EV-2026-004', customer: 'Phạm Hoàng Anh', phone: '0933 456 789', items: 1, total: '₫3,600,000', payment: 'MOMO', status: 'NEW', date: '2026-07-14', time: '2 hours ago' },
  { code: '#EV-2026-005', customer: 'Đặng Thị Thu', phone: '0977 654 321', items: 2, total: '₫24,500,000', payment: 'MOMO', status: 'DONE', date: '2026-07-14', time: '3 hours ago' },
  { code: '#EV-2026-006', customer: 'Hoàng Văn Nam', phone: '0966 789 012', items: 1, total: '₫5,200,000', payment: 'COD', status: 'CANCELLED', date: '2026-07-14', time: '5 hours ago' },
  { code: '#EV-2026-007', customer: 'Vũ Thị Lan', phone: '0944 567 890', items: 4, total: '₫15,300,000', payment: 'MOMO', status: 'SHIPPING', date: '2026-07-13', time: '1 day ago' },
  { code: '#EV-2026-008', customer: 'Ngô Văn Hải', phone: '0903 210 987', items: 1, total: '₫1,800,000', payment: 'COD', status: 'DONE', date: '2026-07-13', time: '1 day ago' },
  { code: '#EV-2026-009', customer: 'Bùi Thị Hoa', phone: '0919 876 543', items: 2, total: '₫9,400,000', payment: 'MOMO', status: 'CONFIRMED', date: '2026-07-12', time: '2 days ago' },
  { code: '#EV-2026-010', customer: 'Đỗ Văn Tùng', phone: '0978 123 456', items: 1, total: '₫32,000,000', payment: 'MOMO', status: 'DONE', date: '2026-07-11', time: '3 days ago' },
];

const statusColors: Record<string, string> = {
  NEW: 'text-info border-info/30 bg-info/10',
  CONFIRMED: 'text-warning border-warning/30 bg-warning/10',
  SHIPPING: 'text-gold border-gold/30 bg-gold/10',
  DONE: 'text-success border-success/30 bg-success/10',
  CANCELLED: 'text-error border-error/30 bg-error/10',
};

const paymentColors: Record<string, string> = {
  MOMO: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  COD: 'text-[#D0C5AF]/70 border-[#4D4635]/30 bg-transparent',
};

export default function OrdersPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">Orders</h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">Track and manage all orders — {orders.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors"
            style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)' }}
          >
            📤 Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-sm flex flex-wrap items-center gap-3"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <input
          type="text"
          placeholder="Search order code or phone..."
          className="flex-1 min-w-[180px] px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/40"
        />
        <select className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40">
          <option value="">All Status</option>
          <option>NEW</option>
          <option>CONFIRMED</option>
          <option>SHIPPING</option>
          <option>DONE</option>
          <option>CANCELLED</option>
        </select>
        <select className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40">
          <option value="">All Payment</option>
          <option>MOMO</option>
          <option>COD</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        />
        <span className="text-[10px] text-[#D0C5AF]/30">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        />
        <button className="px-4 py-2 text-[10px] text-gold/60 hover:text-gold font-heading tracking-[0.1em] uppercase transition-colors">
          Clear
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#4D4635]">
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Order Code</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Customer</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Phone</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Items</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Total</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Payment</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.code}
                  className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <Link href={`/admin/orders/${order.code.replace('#', '')}`} className="text-xs text-gold font-heading hover:text-gold/80">
                      {order.code}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#D0C5AF]">{order.customer}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#D0C5AF]/70">{order.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#D0C5AF]/70">{order.items}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#EAE1D4] font-medium">{order.total}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${paymentColors[order.payment] || ''}`}>
                      {order.payment}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${statusColors[order.status] || ''}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="text-[10px] text-[#D0C5AF]/40 block">{order.date}</span>
                      <span className="text-[9px] text-[#D0C5AF]/30">{order.time}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#4D4635]/30">
          <span className="text-[10px] text-[#D0C5AF]/40">Showing 1-10 of 10 orders</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-[10px] text-[#D0C5AF]/50 border border-[#4D4635]/30 rounded hover:text-gold transition-colors" disabled>← Prev</button>
            <button className="px-3 py-1 text-[10px] bg-gold/20 text-gold border border-gold/40 rounded">1</button>
            <button className="px-3 py-1 text-[10px] text-[#D0C5AF]/50 border border-[#4D4635]/30 rounded hover:text-gold transition-colors" disabled>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
