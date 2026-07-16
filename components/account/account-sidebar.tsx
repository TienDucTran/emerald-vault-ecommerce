'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  User,
  Package,
  MapPin,
  Heart,
  Star,
  Lock,
  LogOut,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useWishlistStore } from '@/lib/store/wishlist';

const NAV_ITEMS = [
  { label: 'Hồ sơ', href: '/tai-khoan/ho-so', icon: User },
  { label: 'Đơn hàng', href: '/tai-khoan/don-hang', icon: Package },
  { label: 'Địa chỉ', href: '/tai-khoan/dia-chi', icon: MapPin },
  { label: 'Yêu thích', href: '/tai-khoan/yeu-thich', icon: Heart },
  { label: 'Đánh giá', href: '/tai-khoan/danh-gia', icon: Star },
  { label: 'Bảo mật', href: '/tai-khoan/bao-mat', icon: Lock },
];

interface SidebarProfile {
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

function getInitials(name?: string | null, fallback?: string | null): string {
  const source = (name && name.trim()) || fallback || '?';
  const parts = source.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  return parts[parts.length - 1].charAt(0).toUpperCase();
}

function useProfile(): {
  profile: SidebarProfile | null;
  loading: boolean;
} {
  const [profile, setProfile] = useState<SidebarProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/profile', {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const json = (await res.json()) as {
          profile: {
            full_name: string | null;
            phone: string | null;
          };
        };
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (cancelled) return;
        setProfile({
          full_name: json.profile?.full_name ?? null,
          email: userData.user?.email ?? '',
          phone: json.profile?.phone ?? null,
          avatar_url: null,
        });
      } catch (err) {
        console.error('[AccountSidebar] fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading };
}

function useLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AccountSidebar] logout error:', err);
    } finally {
      // Clear in-memory wishlist cache để user tiếp theo trên cùng browser
      // không thấy trạng thái heart của user trước.
      useWishlistStore.getState().clear();
      setBusy(false);
      router.push('/tai-khoan/dang-nhap');
      router.refresh();
    }
  };

  return { handleLogout, busy };
}

export function AccountSidebar() {
  const pathname = usePathname() || '';
  const { profile, loading } = useProfile();
  const { handleLogout, busy } = useLogout();
  const displayName = profile?.full_name || 'Khách hàng';
  const displayPhone = profile?.phone || (loading ? '…' : 'Chưa cập nhật');

  return (
    <aside className="sticky top-[60px] hidden h-[calc(100vh-60px)] w-[288px] shrink-0 flex-col border-r border-gold/10 bg-surface-emerald p-8 md:flex">
      <div className="mb-10 flex flex-col items-center">
        <div className="mb-3 h-24 w-24 overflow-hidden rounded-xl border-2 border-gold bg-surface">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-3xl font-bold text-gold">
              {getInitials(profile?.full_name, profile?.email ?? '')}
            </div>
          )}
        </div>
        <h2 className="text-center font-heading text-sm font-bold uppercase tracking-[0.15em] text-gold">
          {displayName}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{displayPhone}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-4 rounded-md px-6 py-4 text-base font-normal transition-colors',
                active
                  ? 'bg-[#344C3F] border-l-2 border-gold text-gold'
                  : 'text-text-muted hover:bg-surface-emeraldAlt hover:text-text-base'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-gold/10 pt-8">
        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="flex w-full items-center gap-4 rounded-md border border-gold/20 px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-emeraldAlt hover:text-text-base disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5 shrink-0" />
          )}
          <span className="font-heading uppercase tracking-[0.15em]">
            Đăng xuất
          </span>
        </button>
      </div>
    </aside>
  );
}

export function AccountMobileTabs() {
  const pathname = usePathname() || '';
  const { profile, loading } = useProfile();
  const { handleLogout, busy } = useLogout();
  const displayName = profile?.full_name || 'Khách hàng';
  const displayPhone = profile?.phone || (loading ? '…' : 'Chưa cập nhật');

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-3 border-b border-gold/10 bg-surface-emerald px-4 py-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gold bg-surface">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-lg font-bold text-gold">
              {getInitials(profile?.full_name, profile?.email ?? '')}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-heading text-sm font-bold text-gold">
            {displayName}
          </p>
          <p className="truncate text-xs text-text-muted">{displayPhone}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="grid h-9 w-9 place-items-center rounded-md border border-gold/20 text-text-muted disabled:opacity-50"
          aria-label="Đăng xuất"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-gold/10 bg-surface-emerald px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-gold text-background'
                  : 'border border-gold/20 text-text-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
