'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, ShoppingBag, User } from 'lucide-react';
import { useState } from 'react';
import { CartBadge } from './cart-badge';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Sưu Tập', href: '/bo-suu-tap' },
  { label: 'Trang Sức', href: '/san-pham' },
  { label: 'Về Chúng Tôi', href: '/cau-chuyen' },
  { label: 'Liên Hệ', href: '/lien-he' },
];

/**
 * Đánh dấu item active dựa trên URL hiện tại.
 * - Active nếu pathname khớp href (vd /san-pham)
 * - Hoặc pathname bắt đầu bằng href + '/' (vd /san-pham/nhan-abc)
 */
function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() || '/';

  return (
    <header className="w-full border-b border-gold/10 bg-background/90 backdrop-blur-2xl">
      <div className="flex h-[60px] items-center justify-between px-8">
        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-3xl font-bold tracking-tight text-gold transition-transform duration-200 hover:scale-105"
        >
          EMERALD VAULT
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative font-heading text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:text-gold',
                  active ? 'text-gold' : 'text-text-muted'
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -bottom-1 left-0 h-px bg-gold transition-all duration-300 ease-out',
                    active ? 'w-full' : 'w-0 group-hover:w-full'
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-6">
          {/* Search bar */}
          <div className="hidden items-center rounded-xl border border-gold/30 bg-[#1F1B13] px-4 py-2 transition-colors focus-within:border-gold md:flex">
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
            className="hidden lg:grid h-8 w-8 place-items-center text-gold transition-colors hover:text-gold-champagne active:scale-90"
            aria-label="Giỏ hàng"
          >
            <ShoppingBag className="h-5 w-5" />
            <CartBadge />
          </Link>

          {/* Account icon */}
          <Link
            href="/tai-khoan"
            className="hidden lg:grid h-8 w-8 place-items-center text-gold transition-colors hover:text-gold-champagne active:scale-90"
            aria-label="Tài khoản"
          >
            <User className="h-5 w-5" />
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center text-gold transition-transform active:scale-90 lg:hidden"
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        data-open={mobileOpen}
        className={cn(
          'overflow-hidden border-gold/10 bg-background transition-all duration-300 ease-out lg:hidden',
          'border-t',
          mobileOpen
            ? 'max-h-[500px] opacity-100'
            : 'pointer-events-none max-h-0 opacity-0'
        )}
      >
        <nav className="flex flex-col px-8 py-4">
          {NAV_ITEMS.map((item, i) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                style={{ animationDelay: mobileOpen ? `${i * 50}ms` : undefined }}
                className={cn(
                  'border-b border-surface-emerald/50 py-3 font-heading text-sm font-semibold uppercase tracking-wider transition-colors hover:text-gold motion-safe:animate-slideInLeft',
                  active ? 'text-gold' : 'text-text-base'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
