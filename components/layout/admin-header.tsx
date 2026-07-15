'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const navItems: Array<{ label: string; href: string }> = [
  { label: 'Overview', href: '/admin' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Collections', href: '/admin/collections' },
  { label: 'Inventory', href: '/admin/inventory' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Newsletter', href: '/admin/newsletter' },
  { label: 'Analytics', href: '/admin/analytics' },
  { label: 'Settings', href: '/admin/settings' },
];

type Crumb = { label: string; href: string };

function buildCrumbs(pathname: string, items: Array<{ label: string; href: string }>): Crumb[] {
  const match = items
    .filter((it) => pathname === it.href || pathname.startsWith(it.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!match) {
    return [{ label: 'Admin', href: '/admin' }];
  }

  const crumbs: Crumb[] = [{ label: match.label, href: match.href }];

  if (pathname !== match.href) {
    const remainder = pathname.slice(match.href.length).replace(/^\/+/, '');
    if (remainder) {
      const segments = remainder.split('/').filter(Boolean);
      const leaf = segments[segments.length - 1];
      if (leaf && !/^[0-9a-f]{8}-/i.test(leaf) && leaf !== '[id]') {
        const label = leaf
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        crumbs.push({ label, href: pathname });
      } else {
        crumbs.push({ label: 'Chi tiết', href: pathname });
      }
    }
  }

  return crumbs;
}

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);

  const crumbs = buildCrumbs(pathname, navItems);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        let name = user.email?.split('@')[0] ?? 'Admin';
        try {
          const res = await fetch('/api/admin/profile');
          if (res.ok) {
            const json = await res.json();
            if (json?.profile?.full_name) {
              name = json.profile.full_name;
            }
          }
        } catch {
          // ignore — fall back to email-derived name
        }

        if (!cancelled) {
          setProfile({ name, email: user.email ?? '' });
        }
      } catch {
        // ignore — keep profile null and render defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore — server-side logout endpoint vẫn sẽ clear cookies khi navigate.
    }
    router.push('/admin/login');
    router.refresh();
  }

  const displayName = profile?.name ?? 'Admin';
  const displayEmail = profile?.email ?? 'admin@emerald-vault.vn';
  const avatarLetter = (displayName?.[0] ?? 'A').toUpperCase();

  return (
    <header
      className="fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 bg-[rgba(13,17,23,0.8)] backdrop-blur-[6px] border-b border-[#4D4635]"
      style={{ left: '256px' }}
    >
      {/* Left: Breadcrumb / Page Title */}
      <div className="flex items-center gap-3">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <Fragment key={c.href}>
              {i > 0 && <span className="text-xs text-[#D0C5AF]/40">/</span>}
              {isLast ? (
                <span className="font-heading text-xs font-bold text-gold tracking-[0.1em] uppercase">
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="font-heading text-xs font-bold text-[#D0C5AF]/60 hover:text-gold tracking-[0.1em] uppercase transition-colors"
                >
                  {c.label}
                </Link>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Right: Search + Notifications + Profile */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D0C5AF]/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-10 pr-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-xl text-xs text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-[#D0C5AF]/60 hover:text-gold transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#4D4635]">
          <div className="text-right">
            <p className="text-xs font-medium text-[#D0C5AF]">{displayName}</p>
            <p className="text-[10px] text-[#D0C5AF]/50">{displayEmail}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
            <span className="text-xs font-bold text-gold">{avatarLetter}</span>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-2 pl-4 border-l border-[#4D4635] text-[#D0C5AF]/60 hover:text-gold transition-colors disabled:opacity-50"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[10px] font-heading tracking-[0.1em] uppercase">
            {signingOut ? 'Đang thoát...' : 'Đăng xuất'}
          </span>
        </button>
      </div>
    </header>
  );
}
