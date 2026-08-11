'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AccountSidebar, AccountMobileTabs } from '@/components/account/account-sidebar';
import { AccountProvider, type AccountProfile } from '@/lib/store/account-context';
import { createClient } from '@/lib/supabase/client';

const AUTH_PATHS = [
  '/tai-khoan/dang-nhap',
  '/tai-khoan/dang-ky',
  '/tai-khoan/quen-mat-khau',
  '/tai-khoan/dat-lai-mat-khau',
  '/tai-khoan/xac-nhan-email',
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Fetch profile từ API
        const profileRes = await fetch('/api/account/profile', { cache: 'no-store' });
        if (cancelled) return;

        if (profileRes.ok) {
          const json = (await profileRes.json()) as {
            profile: {
              id?: string;
              full_name: string | null;
              phone: string | null;
              avatar_url?: string | null;
              created_at?: string;
            };
          };
          
          // Lấy user email từ auth
          const supabase = createClient();
          const { data: userData } = await supabase.auth.getUser();
          
          if (cancelled) return;
          setProfile({
            id: (json.profile as any)?.id ?? userData.user?.id ?? '',
            full_name: json.profile?.full_name ?? null,
            phone: json.profile?.phone ?? null,
            email: userData.user?.email ?? '',
            avatar_url: json.profile?.avatar_url ?? null,
            created_at: (json.profile as any)?.created_at ?? new Date().toISOString(),
          });
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  if (isAuthPath) {
    return <main className="min-h-[calc(100vh-4rem)]">{children}</main>;
  }

  return (
    <AccountProvider initialProfile={profile}>
      <div className="flex min-h-[calc(100vh-60px)] flex-col md:flex-row">
        <AccountSidebar />
        <AccountMobileTabs />
        <main className="flex-1 px-4 py-8 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8 xl:px-10">{children}</div>
        </main>
      </div>
    </AccountProvider>
  );
}