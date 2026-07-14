// Bottom navigation bar cho mobile (fixed dưới màn hình)
// 5 items: Trang chủ, Sản phẩm, Bộ sưu tập, Giỏ hàng, Tài khoản
import Link from 'next/link';
import { Home, Grid3x3, Sparkles, ShoppingBag, User } from 'lucide-react';

const ITEMS = [
  { href: '/',               label: 'Trang chủ',     Icon: Home },
  { href: '/san-pham',       label: 'Sản phẩm',     Icon: Grid3x3 },
  { href: '/bo-suu-tap',     label: 'Bộ sưu tập',   Icon: Sparkles },
  { href: '/gio-hang',       label: 'Giỏ hàng',      Icon: ShoppingBag },
  { href: '/tai-khoan',      label: 'Tài khoản',     Icon: User },
] as const;

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-t border-[#c9a961]/20"
    >
      <ul className="flex justify-around items-center h-16">
        {ITEMS.map(({ href, label, Icon }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 h-full text-[10px] tracking-wider text-[#c9a961]/70 hover:text-[#c9a961] transition-colors"
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="uppercase">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
