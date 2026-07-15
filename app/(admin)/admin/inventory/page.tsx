'use client';

import { useState } from 'react';

const inventoryItems = [
  { id: 'SR-001', name: 'Silver Ring SS', category: 'Ring', tier: 'SS', stock: 5, locked: 2, status: 'Low Stock', threshold: 5 },
  { id: 'GN-023', name: 'Gold Necklace SSS', category: 'Necklace', tier: 'SSS', stock: 3, locked: 1, status: 'Available', threshold: 3 },
  { id: 'VB-045', name: 'Vintage Bracelet S', category: 'Bracelet', tier: 'S', stock: 10, locked: 0, status: 'Available', threshold: 10 },
  { id: 'PE-012', name: 'Pearl Earrings SS', category: 'Earrings', tier: 'SS', stock: 0, locked: 0, status: 'Out of Stock', threshold: 5 },
  { id: 'ER-007', name: 'Emerald Ring SSS', category: 'Ring', tier: 'SSS', stock: 4, locked: 1, status: 'Available', threshold: 4 },
  { id: 'LB-089', name: 'Leather Band Watch', category: 'Watch', tier: 'S', stock: 7, locked: 3, status: 'Available', threshold: 6 },
  { id: 'DP-034', name: 'Diamond Pendant SSS', category: 'Pendant', tier: 'SSS', stock: 2, locked: 0, status: 'Low Stock', threshold: 4 },
  { id: 'CF-001', name: 'Cufflinks SS', category: 'Accessories', tier: 'SS', stock: 0, locked: 0, status: 'Out of Stock', threshold: 3 },
];

const statusColors: Record<string, string> = {
  'Available': 'text-success border-success/30 bg-success/10',
  'Low Stock': 'text-warning border-warning/30 bg-warning/10',
  'Out of Stock': 'text-error border-error/30 bg-error/10',
};

const tierBadge = (tier: string) => {
  if (tier === 'SSS') return 'bg-gradient-to-r from-gold to-gold-champagne text-background';
  if (tier === 'SS') return 'bg-gold/20 text-gold border border-gold/40';
  return 'bg-surface text-gold/80 border border-gold/20';
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('Inventory');
  const tabs = ['Overview', 'Inventory', 'Reports'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub-header Tabs — matches Figma node 35:200 */}
      <div
        className="flex items-center justify-between px-6 py-0 rounded-sm"
        style={{
          background: 'rgba(13, 17, 23, 0.8)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(77, 70, 53, 0.3)',
        }}
      >
        <div className="flex items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-3 text-sm font-heading tracking-[0.02em] transition-colors relative"
              style={{
                color: activeTab === tab ? '#F2CA50' : '#D0C5AF',
                borderBottom: activeTab === tab ? '2px solid #F2CA50' : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right icons (notification bell + avatar) */}
        <div className="flex items-center gap-4">
          <div className="relative p-2">
            <svg className="w-4 h-5 text-[#F1E5AC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-1.5 w-2 h-2 bg-[#F2CA50] rounded-full" />
          </div>
          <div className="flex items-center gap-3 pl-3 border-l border-[rgba(242,202,80,0.3)]">
            <div className="w-8 h-8 rounded-xl border border-[rgba(242,202,80,0.3)] flex items-center justify-center">
              <span className="text-xs font-bold text-[#D0C5AF]">A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Page Header & Actions — matches Figma node 35:5 */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">Inventory</h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">Track stock levels and active locks across all products</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors"
            style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)' }}
          >
            📤 Export
          </button>
        </div>
      </div>

      {/* Search & Filters Bento Bar — matches Figma node 35:21 (12-col grid) */}
      <div
        className="p-4 rounded-sm"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <div className="grid grid-cols-12 gap-4">
          {/* Search — span 7 */}
          <div className="col-span-12 md:col-span-7">
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              className="w-full px-4 py-2.5 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Filters — span 2 */}
          <div className="col-span-6 md:col-span-2">
            <select className="w-full px-3 py-2.5 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40">
              <option value="">All Categories</option>
              <option>Ring</option>
              <option>Necklace</option>
              <option>Bracelet</option>
              <option>Earrings</option>
              <option>Watch</option>
              <option>Pendant</option>
            </select>
          </div>

          {/* Status filter — span 3 */}
          <div className="col-span-6 md:col-span-3">
            <select className="w-full px-3 py-2.5 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40">
              <option value="">All Status</option>
              <option>Available</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container — matches Figma node 35:42 */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background: '#12241C',
          border: '1px solid rgba(77, 70, 53, 0.3)',
          boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(77,70,53,0.3)]">
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">SKU</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Product</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Category</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Tier</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Stock</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Locked</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Available</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map((item) => {
                const available = item.stock - item.locked;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-[rgba(77,70,53,0.1)] hover:bg-[rgba(56,52,43,0.1)] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="text-xs text-gold font-heading">{item.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#1F1B13] border border-[rgba(77,70,53,0.3)] flex items-center justify-center">
                          <span className="text-[8px] text-[#D0C5AF]/30">◆</span>
                        </div>
                        <span className="text-xs text-[#D0C5AF]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[#D0C5AF]/70">{item.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${tierBadge(item.tier)}`}>
                        {item.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[#D0C5AF]">{item.stock}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[#D0C5AF]/70">{item.locked}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${
                        available <= 0 ? 'text-error' : available <= item.threshold / 2 ? 'text-warning' : 'text-success'
                      }`}>
                        {available}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${statusColors[item.status] || ''}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination — matches Figma node 35:180 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: '#1F1B13',
            borderTop: '1px solid rgba(77, 70, 53, 0.3)',
          }}
        >
          <span className="text-[10px] text-[#D0C5AF]/40">Showing 1-8 of 8 items</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-[10px] text-[#D0C5AF]/50 border border-[rgba(77,70,53,0.3)] rounded hover:text-gold transition-colors" disabled>← Prev</button>
            <button className="px-3 py-1 text-[10px] bg-gold/20 text-gold border border-gold/40 rounded">1</button>
            <button className="px-3 py-1 text-[10px] text-[#D0C5AF]/50 border border-[rgba(77,70,53,0.3)] rounded hover:text-gold transition-colors" disabled>Next →</button>
          </div>
        </div>
      </div>

      {/* FAB Button — matches Figma node 35:276 (gold 64x64 round) */}
      <button
        className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-xl bg-gold flex items-center justify-center shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] hover:bg-gold/90 transition-colors"
        style={{ bottom: '8vh', right: '2rem' }}
      >
        <svg className="w-5 h-5 text-[#3C2F00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
