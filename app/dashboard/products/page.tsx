'use client';

import Link from 'next/link';
import { useState } from 'react';

const products = [
  { id: 1, name: 'Silver Ring SS', slug: 'silver-ring-ss', category: 'Ring', material: 'Silver 925', tier: 'SS', price: '₫2,450,000', status: 'AVAILABLE', featured: true, image: null, updated: '2026-07-14' },
  { id: 2, name: 'Gold Necklace SSS', slug: 'gold-necklace-sss', category: 'Necklace', material: 'Gold 18K', tier: 'SSS', price: '₫12,800,000', status: 'AVAILABLE', featured: true, image: null, updated: '2026-07-13' },
  { id: 3, name: 'Vintage Bracelet S', slug: 'vintage-bracelet-s', category: 'Bracelet', material: 'Silver 925', tier: 'S', price: '₫5,200,000', status: 'AVAILABLE', featured: false, image: null, updated: '2026-07-12' },
  { id: 4, name: 'Pearl Earrings SS', slug: 'pearl-earrings-ss', category: 'Earrings', material: 'Freshwater Pearl', tier: 'SS', price: '₫3,600,000', status: 'SOLD_OUT', featured: false, image: null, updated: '2026-07-10' },
  { id: 5, name: 'Emerald Ring SSS', slug: 'emerald-ring-sss', category: 'Ring', material: 'Emerald + Gold', tier: 'SSS', price: '₫18,900,000', status: 'AVAILABLE', featured: true, image: null, updated: '2026-07-09' },
  { id: 6, name: 'Leather Band Watch', slug: 'leather-band-watch', category: 'Watch', material: 'Leather + Steel', tier: 'S', price: '₫4,800,000', status: 'AVAILABLE', featured: false, image: null, updated: '2026-07-08' },
  { id: 7, name: 'Diamond Pendant SSS', slug: 'diamond-pendant-sss', category: 'Pendant', material: 'Diamond + Gold', tier: 'SSS', price: '₫32,000,000', status: 'AVAILABLE', featured: true, image: null, updated: '2026-07-07' },
  { id: 8, name: 'Cufflinks SS', slug: 'cufflinks-ss', category: 'Accessories', material: 'Silver 925', tier: 'SS', price: '₫1,800,000', status: 'SOLD_OUT', featured: false, image: null, updated: '2026-07-05' },
];

const statusColors: Record<string, string> = {
  AVAILABLE: 'text-success border-success/30 bg-success/10',
  SOLD_OUT: 'text-error border-error/30 bg-error/10',
  DRAFT: 'text-[#D0C5AF]/50 border-[#4D4635]/30 bg-transparent',
};

const tierBadge = (tier: string) => {
  if (tier === 'SSS') return 'bg-gradient-to-r from-gold to-gold-champagne text-background';
  if (tier === 'SS') return 'bg-gold/20 text-gold border border-gold/40';
  return 'bg-surface text-gold/80 border border-gold/20';
};

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">Products</h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">Manage your inventory — {products.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products/bulk-upload"
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors"
            style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)' }}
          >
            📥 Bulk Upload
          </Link>
          <Link
            href="/dashboard/products/new"
            className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors"
          >
            + Add Product
          </Link>
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
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/40 transition-colors"
        />
        <select className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40">
          <option value="">All Categories</option>
          <option>Ring</option>
          <option>Necklace</option>
          <option>Bracelet</option>
          <option>Earrings</option>
          <option>Watch</option>
          <option>Pendant</option>
          <option>Accessories</option>
        </select>
        <select className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40">
          <option value="">All Tiers</option>
          <option>SSS</option>
          <option>SS</option>
          <option>S</option>
          <option>A</option>
        </select>
        <select className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40">
          <option value="">All Status</option>
          <option>AVAILABLE</option>
          <option>SOLD_OUT</option>
          <option>DRAFT</option>
        </select>
        <button className="px-4 py-2 text-[10px] text-gold/60 hover:text-gold font-heading tracking-[0.1em] uppercase transition-colors">
          Clear Filters
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
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 w-12">
                  <input type="checkbox" className="rounded border-[#4D4635] bg-[#1F1B13]" />
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Product</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Category</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Material</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Tier</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Price</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Featured</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Updated</th>
                <th className="text-right px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-[#4D4635] bg-[#1F1B13] accent-gold"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#1F1B13] border border-[#4D4635]/30 flex items-center justify-center">
                        <span className="text-[10px] text-[#D0C5AF]/30">🖼</span>
                      </div>
                      <div>
                        <p className="text-xs text-[#D0C5AF] font-medium">{product.name}</p>
                        <p className="text-[10px] text-[#D0C5AF]/40">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#D0C5AF]/70">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#D0C5AF]/70">{product.material}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${tierBadge(product.tier)}`}>
                      {product.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#EAE1D4] font-medium">{product.price}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${statusColors[product.status] || ''}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs ${product.featured ? 'text-gold' : 'text-[#D0C5AF]/30'}`}>
                      {product.featured ? '★' : '☆'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-[#D0C5AF]/40">{product.updated}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="text-[10px] text-gold/60 hover:text-gold transition-colors">Edit</button>
                      <button className="text-[10px] text-error/60 hover:text-error transition-colors">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#4D4635]/30">
          <span className="text-[10px] text-[#D0C5AF]/40">Showing 1-8 of 8 products</span>
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