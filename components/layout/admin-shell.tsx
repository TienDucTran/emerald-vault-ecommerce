'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { Toaster } from '@/components/ui/toast';

const AUTH_PATHS = ['/admin/login'];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthPath) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <AdminHeader />
      <main
        className="min-h-screen"
        style={{ marginLeft: '256px', paddingTop: '64px' }}
      >
        <div className="p-8">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
