'use client';

import { usePathname } from 'next/navigation';
import { AccountSidebar, AccountMobileTabs } from '@/components/account/account-sidebar';

const AUTH_PATHS = [
  '/tai-khoan/dang-nhap',
  '/tai-khoan/dang-ky',
  '/tai-khoan/quen-mat-khau',
  '/tai-khoan/dat-lai-mat-khau',
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthPath) {
    return <main className="min-h-[calc(100vh-4rem)]">{children}</main>;
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col md:flex-row">
      <AccountSidebar />
      <AccountMobileTabs />
      <main className="flex-1 px-4 py-8 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
