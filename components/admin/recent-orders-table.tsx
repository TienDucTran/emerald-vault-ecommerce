'use client';

import { getOrderStatusPill, getOrderStatusMeta } from '@/lib/order/status';

const recentOrders = [
  {
    id: '#EV-2026-001',
    customer: 'Nguyễn Thị Hương',
    product: 'Silver Ring SS',
    amount: '₫2,450,000',
    status: 'NEW',
    payment: 'COD',
    date: '2 min ago',
  },
  {
    id: '#EV-2026-002',
    customer: 'Trần Văn Minh',
    product: 'Gold Necklace SSS',
    amount: '₫12,800,000',
    status: 'CONFIRMED',
    payment: 'MOMO',
    date: '15 min ago',
  },
  {
    id: '#EV-2026-003',
    customer: 'Lê Thị Mai',
    product: 'Vintage Bracelet S',
    amount: '₫5,200,000',
    status: 'SHIPPING',
    payment: 'COD',
    date: '1 hour ago',
  },
  {
    id: '#EV-2026-004',
    customer: 'Phạm Hoàng Anh',
    product: 'Pearl Earrings SS',
    amount: '₫3,600,000',
    status: 'NEW',
    payment: 'MOMO',
    date: '2 hours ago',
  },
  {
    id: '#EV-2026-005',
    customer: 'Đặng Thị Thu',
    product: 'Emerald Ring SSS',
    amount: '₫18,900,000',
    status: 'DONE',
    payment: 'MOMO',
    date: '3 hours ago',
  },
];

export function RecentOrdersTable() {
  return (
    <div>
      {/* Table Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#4D4635] gap-2">
        <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
          Recent Orders
        </h3>
        <button className="text-[10px] text-gold hover:text-gold/80 transition-colors font-heading tracking-[0.1em] uppercase shrink-0">
          View All →
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#4D4635]/30">
              <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Order</th>
              <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Customer</th>
              <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Product</th>
              <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Amount</th>
              <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Status</th>
              <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Payment</th>
              <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Date</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order, i) => (
              <tr
                key={order.id}
                className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors cursor-pointer"
              >
                <td className="px-6 py-3">
                  <span className="text-xs text-gold font-heading">{order.id}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-[#D0C5AF]">{order.customer}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-[#D0C5AF]/70">{order.product}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-[#EAE1D4] font-medium">{order.amount}</span>
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${getOrderStatusPill(order.status)}`}
                  >
                    {getOrderStatusMeta(order.status).label}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-[#D0C5AF]/70">{order.payment}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-[10px] text-[#D0C5AF]/40">{order.date}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}