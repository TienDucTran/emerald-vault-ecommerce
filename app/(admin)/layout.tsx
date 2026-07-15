import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin-header';
import '../globals.css';

// Cinzel chỉ hỗ trợ latin + latin-ext (không có vietnamese)
const cinzel = Cinzel({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Emerald Vault — Admin',
    template: '%s | Admin | Emerald Vault',
  },
  robots: { index: false, follow: false },
};

/**
 * Admin root layout — áp dụng cho mọi route trong nhóm (admin).
 * URL không đổi vì (admin) là route group.
 *
 * KHÔNG có store chrome (Navbar/Footer/AnnouncementBar) — fix triệt để flicker khi navigate.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="font-sans bg-[#0D1117]">
        <div className="min-h-screen">
          <AdminSidebar />
          <AdminHeader />
          <main
            className="min-h-screen"
            style={{ marginLeft: '256px', paddingTop: '64px' }}
          >
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
