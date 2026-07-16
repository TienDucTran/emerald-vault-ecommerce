'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', href: '/admin', icon: '◈' },
  { label: 'Products', href: '/admin/products', icon: '◇' },
  { label: 'Collections', href: '/admin/collections', icon: '◆' },
  { label: 'Media', href: '/admin/media', icon: '🖼' },
  { label: 'Inventory', href: '/admin/inventory', icon: '📋' },
  { label: 'Orders', href: '/admin/orders', icon: '📦' },
  { label: 'Payments', href: '/admin/payments', icon: '💳' },
  { label: 'Newsletter', href: '/admin/newsletter', icon: '✉' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📊' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙' },
];

const bottomLinks = [
  { label: 'Help Center', href: '#' },
  { label: 'Documentation', href: '#' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#12241C] border-r border-[#4D4635] flex flex-col justify-between overflow-y-auto">
      {/* Logo + Brand */}
      <div className="px-6 pt-8 pb-10">
        <div className="flex flex-col gap-1">
          <Link href="/admin" className="font-heading text-lg font-bold text-gold tracking-wider">
            EMERALD
          </Link>
          <span className="text-xs text-[#D0C5AF]/70 tracking-[0.1em] uppercase font-heading">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          // Overview chỉ active khi pathname === '/admin' chính xác.
          // Các mục khác active khi pathname khớp chính xác HOẶC nằm trong sub-path
          // (vd /admin/products/new vẫn highlight 'Products').
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-sm text-sm transition-all duration-200',
                isActive
                  ? 'bg-[rgba(56,52,43,0.3)] text-gold border-l-2 border-gold'
                  : 'text-[#D0C5AF]/70 hover:text-[#D0C5AF] hover:bg-[rgba(56,52,43,0.15)] border-l-2 border-transparent'
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="font-heading text-xs tracking-[0.08em] uppercase">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 pb-6 pt-6 border-t border-[#4D4635] mt-6">
        {/* New Product Button */}
        <Link
          href="/admin/products/new"
          className="flex items-center justify-center w-full py-3 bg-gold text-[#3C2F00] rounded-sm font-heading text-xs tracking-[0.15em] uppercase font-bold shadow-[0_4px_6px_-4px_rgba(242,202,80,0.1),0_10px_15px_-3px_rgba(242,202,80,0.1)] hover:bg-gold/90 transition-colors"
        >
          + New Product
        </Link>

        {/* Bottom Links */}
        <div className="mt-4 space-y-1">
          {bottomLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center px-4 py-2 text-xs text-[#D0C5AF]/50 hover:text-[#D0C5AF]/80 transition-colors font-heading tracking-[0.05em]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}