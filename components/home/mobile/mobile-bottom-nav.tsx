'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3x3, Sparkles, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/lib/store/cart';
import { useEffect, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  showCartBadge?: boolean;
};

const ITEMS: readonly NavItem[] = [
  { href: '/',               label: 'Trang chủ',     Icon: Home },
  { href: '/san-pham',       label: 'Sản phẩm',     Icon: Grid3x3 },
  { href: '/bo-suu-tap',     label: 'Bộ sưu tập',   Icon: Sparkles },
  { href: '/gio-hang',       label: 'Giỏ hàng',      Icon: ShoppingBag, showCartBadge: true },
  { href: '/tai-khoan',      label: 'Tài khoản',     Icon: User },
];

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname() || '/';
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const cartCount = mounted ? items.filter((i) => Date.now() < i.expiresAt).length : 0;

  return (
    <nav
      aria-label="Điều hướng chính"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-t border-[#c9a961]/20"
    >
      <ul className="flex justify-around items-center h-16">
        {ITEMS.map(({ href, label, Icon, showCartBadge }) => {
          const active = isActive(href, pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 h-full text-[10px] tracking-wider transition-colors duration-300 active:scale-95',
                  active ? 'text-[#c9a961]' : 'text-[#c9a961]/70 hover:text-[#c9a961]'
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  {showCartBadge && cartCount > 0 && (
                    <span
                      key={cartCount}
                      className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#c9a961] px-1 text-[9px] font-bold text-black motion-safe:animate-pop"
                    >
                      {cartCount}
                    </span>
                  )}
                </span>
                <span className="uppercase">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
