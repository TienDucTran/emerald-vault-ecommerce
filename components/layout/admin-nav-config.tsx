'use client';

export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

export const adminNavItems: readonly AdminNavItem[] = [
  { id: 'overview', label: 'Overview', href: '/admin', icon: 'LayoutDashboard' },
  { id: 'products', label: 'Products', href: '/admin/products', icon: 'Package' },
  { id: 'collections', label: 'Collections', href: '/admin/collections', icon: 'Gem' },
  { id: 'media', label: 'Media', href: '/admin/media', icon: 'Image' },
  { id: 'inventory', label: 'Inventory', href: '/admin/inventory', icon: 'ClipboardList' },
  { id: 'orders', label: 'Orders', href: '/admin/orders', icon: 'ShoppingBag' },
  { id: 'payments', label: 'Payments', href: '/admin/payments', icon: 'CreditCard' },
  { id: 'newsletter', label: 'Newsletter', href: '/admin/newsletter', icon: 'Mail' },
  { id: 'analytics', label: 'Analytics', href: '/admin/analytics', icon: 'BarChart3' },
  { id: 'settings', label: 'Settings', href: '/admin/settings', icon: 'Settings' },
] as const;

export type AdminBottomLink = {
  label: string;
  href: string;
};

export const bottomLinks: readonly AdminBottomLink[] = [
  { label: 'Help Center', href: '#' },
  { label: 'Documentation', href: '#' },
] as const;
