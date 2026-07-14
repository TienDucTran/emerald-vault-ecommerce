'use client';

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Header */}
      <AdminHeader />

      {/* Main Content */}
      <main
        className="min-h-screen"
        style={{
          marginLeft: '256px',
          paddingTop: '64px',
        }}
      >
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}