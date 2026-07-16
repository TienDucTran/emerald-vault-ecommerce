'use client';

import { usePathname } from 'next/navigation';
import { AdminShellProvider, useAdminShell } from './admin-shell-context';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { Toaster } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const AUTH_PATHS = ['/admin/login'];

const DESKTOP_EXPANDED_WIDTH = 256;
const DESKTOP_COLLAPSED_WIDTH = 72;
const HEADER_HEIGHT = 64;

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed, isMobile } = useAdminShell();

  const marginLeft = isMobile
    ? 0
    : collapsed
      ? DESKTOP_COLLAPSED_WIDTH
      : DESKTOP_EXPANDED_WIDTH;

  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <AdminHeader />
      <main
        className="min-h-screen transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft, paddingTop: HEADER_HEIGHT }}
      >
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      <Toaster />
      <ConfirmDialog />
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthPath) {
    return <>{children}</>;
  }

  return (
    <AdminShellProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminShellProvider>
  );
}
