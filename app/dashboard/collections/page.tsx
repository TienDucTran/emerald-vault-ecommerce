'use client';

import { useState } from 'react';

const collections = [
  { id: 1, name: 'Summer 2026', slug: 'summer-2026', cover: null, products: 12, published: true, order: 1, updated: '2026-07-14' },
  { id: 2, name: 'Vintage Gold', slug: 'vintage-gold', cover: null, products: 8, published: true, order: 2, updated: '2026-07-13' },
  { id: 3, name: 'Silver Classics', slug: 'silver-classics', cover: null, products: 15, published: true, order: 3, updated: '2026-07-12' },
  { id: 4, name: 'Bridal Collection', slug: 'bridal-collection', cover: null, products: 6, published: false, order: 4, updated: '2026-07-10' },
  { id: 5, name: 'Autumn Vibes', slug: 'autumn-vibes', cover: null, products: 3, published: false, order: 5, updated: '2026-07-08' },
];

export default function CollectionsPage() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">Collections</h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">Organize products into collections — {collections.length} total</p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors"
        >
          + Add Collection
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((col) => (
          <div
            key={col.id}
            className="rounded-sm overflow-hidden group cursor-pointer transition-all duration-300 hover:border-gold/30"
            style={{
              background: 'rgba(18, 36, 28, 0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(241, 229, 172, 0.1)',
            }}
          >
            {/* Cover */}
            <div className="h-32 bg-[#1F1B13] flex items-center justify-center border-b border-[#4D4635]/30">
              <span className="text-3xl opacity-30 group-hover:opacity-50 transition-opacity">◆</span>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#EAE1D4]">{col.name}</h3>
                  <p className="text-[10px] text-[#D0C5AF]/40 mt-0.5">/{col.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${col.published ? 'text-success bg-success/10 border border-success/30' : 'text-[#D0C5AF]/50 border border-[#4D4635]/30'}`}>
                    {col.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#4D4635]/20">
                <span className="text-[10px] text-[#D0C5AF]/50">{col.products} products</span>
                <div className="flex items-center gap-2">
                  <button className="text-[9px] text-gold/60 hover:text-gold transition-colors">Edit</button>
                  <button className="text-[9px] text-error/60 hover:text-error transition-colors">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="w-full max-w-md p-6 rounded-sm"
            style={{
              background: '#12241C',
              border: '1px solid rgba(241, 229, 172, 0.1)',
            }}
          >
            <h2 className="font-heading text-lg font-bold text-[#EAE1D4] mb-4">New Collection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1">Name</label>
                <input type="text" className="w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40" placeholder="Collection name" />
              </div>
              <div>
                <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1">Display Order</label>
                <input type="number" defaultValue={collections.length + 1} className="w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#4D4635]/30">
              <button onClick={() => setShowDialog(false)} className="px-4 py-2 text-xs text-[#D0C5AF]/60 hover:text-[#D0C5AF] transition-colors">Cancel</button>
              <button className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}