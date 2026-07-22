'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Gem,
  Image,
  ClipboardList,
  ShoppingBag,
  CreditCard,
  Mail,
  Bot,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminShell } from './admin-shell-context';
import { adminNavItems, bottomLinks } from './admin-nav-config';
import { ChatbotAnalyticsWidget } from '@/components/admin/chatbot-analytics-widget';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Package,
  Gem,
  Image,
  ClipboardList,
  ShoppingBag,
  CreditCard,
  Mail,
  Bot,
  BarChart3,
  Settings,
};

const DESKTOP_EXPANDED_WIDTH = 256;
const DESKTOP_COLLAPSED_WIDTH = 72;
const MOBILE_WIDTH = 256;

export function AdminSidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen, isMobile } = useAdminShell();

  const width = isMobile
    ? MOBILE_WIDTH
    : collapsed
      ? DESKTOP_COLLAPSED_WIDTH
      : DESKTOP_EXPANDED_WIDTH;

  const containerClass = cn(
    'fixed left-0 top-0 z-50 h-screen bg-[#12241C] border-r border-[#4D4635] flex flex-col overflow-y-auto',
    isMobile
      ? cn(
          'w-64 transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )
      : cn('z-40 transition-[width] duration-300 ease-in-out')
  );

  const showLabels = isMobile || !collapsed;
  const showCollapsedLayout = !isMobile && collapsed;

  return (
    <>
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={containerClass}
        style={isMobile ? undefined : { width }}
        aria-hidden={isMobile && !mobileOpen}
      >
        {/* Logo + Brand */}
        <div
          className={cn(
            'pt-8 pb-10 border-b border-[#4D4635]',
            showCollapsedLayout ? 'px-2 flex justify-center' : 'px-6'
          )}
        >
          <div className="flex flex-col gap-1">
            {showCollapsedLayout ? (
              <Link
                href="/admin"
                className="font-heading text-2xl font-bold text-gold tracking-wider text-center"
                title="Emerald Admin"
              >
                E
              </Link>
            ) : (
              <Link href="/admin" className="font-heading text-lg font-bold text-gold tracking-wider">
                EMERALD
              </Link>
            )}
            {showLabels && (
              <span className="text-xs text-[#D0C5AF]/70 tracking-[0.1em] uppercase font-heading">
                Admin Panel
              </span>
            )}
          </div>
        </div>

        {/* Mobile close button */}
        {isMobile && mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 p-1 text-[#D0C5AF]/70 hover:text-gold transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Navigation */}
        <nav className={cn('flex-1 space-y-1', showCollapsedLayout ? 'px-2 py-4' : 'px-4 py-4')}>
          {adminNavItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.label}
                onClick={() => {
                  if (isMobile) setMobileOpen(false);
                }}
                className={cn(
                  'flex items-center rounded-sm text-sm transition-all duration-200',
                  showCollapsedLayout ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3',
                  isActive
                    ? 'bg-[rgba(56,52,43,0.3)] text-gold border-l-2 border-gold'
                    : 'text-[#D0C5AF]/70 hover:text-[#D0C5AF] hover:bg-[rgba(56,52,43,0.15)] border-l-2 border-transparent'
                )}
              >
                {Icon ? <Icon className="w-5 h-5 shrink-0" /> : <span className="w-5 h-5" />}
                {showLabels && (
                  <span className="font-heading text-xs tracking-[0.08em] uppercase whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Chatbot Analytics Widget (chỉ hiện khi expanded) */}
        {showLabels && (
          <div className="px-4 pb-4">
            <ChatbotAnalyticsWidget />
          </div>
        )}

        {/* Bottom Section */}
        <div
          className={cn(
            'border-t border-[#4D4635] mt-6',
            showCollapsedLayout ? 'px-2 py-4' : 'px-4 py-6'
          )}
        >
          {/* New Product Button */}
          {showCollapsedLayout ? (
            <Link
              href="/admin/products/new"
              title="New Product"
              className="flex items-center justify-center w-full py-3 bg-gold text-[#3C2F00] rounded-sm font-bold shadow-[0_4px_6px_-4px_rgba(242,202,80,0.1),0_10px_15px_-3px_rgba(242,202,80,0.1)] hover:bg-gold/90 transition-colors"
            >
              +
            </Link>
          ) : (
            <Link
              href="/admin/products/new"
              className="flex items-center justify-center w-full py-3 bg-gold text-[#3C2F00] rounded-sm font-heading text-xs tracking-[0.15em] uppercase font-bold shadow-[0_4px_6px_-4px_rgba(242,202,80,0.1),0_10px_15px_-3px_rgba(242,202,80,0.1)] hover:bg-gold/90 transition-colors"
            >
              + New Product
            </Link>
          )}

          {/* Bottom Links */}
          {showLabels && (
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
          )}

          {/* Desktop collapse/expand toggle */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                'mt-4 flex items-center text-xs text-[#D0C5AF]/50 hover:text-gold transition-colors font-heading tracking-[0.05em] uppercase',
                showCollapsedLayout ? 'justify-center w-full py-2' : 'gap-2 px-4 py-2'
              )}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
