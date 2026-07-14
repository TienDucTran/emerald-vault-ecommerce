'use client';

import Link from 'next/link';
import { Search, Menu, X, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { CartBadge } from './cart-badge';

const NAV_ITEMS = [
  { label: 'Sưu Tập', href: '/bo-suu-tap', active: true },
  { label: 'Trang Sức', href: '/san-pham' },
  { label: 'Về Chúng Tôi', href: '/cau-chuyen' },
  { label: 'Liên Hệ', href: '/lien-he' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gold/10 bg-background/90 backdrop-blur-2xl">
      <div className="flex h-[60px] items-center justify-between px-8">
        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-3xl font-bold tracking-tight text-gold"
        >
          EMERALD VAULT
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`font-heading text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:text-gold ${
                item.active
                  ? 'border-b border-gold text-gold pb-1'
                  : 'text-text-muted'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-6">
          {/* Search bar */}
          <div className="hidden items-center rounded-xl border border-gold/30 bg-[#1F1B13] px-4 py-2 md:flex">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Tìm kho báu..."
              className="ml-2 w-32 bg-transparent text-sm text-text-muted placeholder:text-text-disabled/50 focus:outline-none"
            />
          </div>

          {/* Cart icon */}
          <Link
            href="/gio-hang"
            className="relative grid h-8 w-8 place-items-center text-gold transition-colors hover:text-gold-champagne"
            aria-label="Giỏ hàng"
          >
            <ShoppingBag className="h-5 w-5" />
            <CartBadge />
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center text-gold lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gold/10 bg-background lg:hidden">
          <nav className="flex flex-col px-8 py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="border-b border-surface-emerald/50 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-base hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}