import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import { AdminShell } from '@/components/layout/admin-shell';
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
 *
 * Logic ẩn/hiện AdminSidebar + AdminHeader theo pathname được tách sang `AdminShell`
 * (client component) để giữ `export const metadata` hoạt động ở server component này.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="font-sans bg-[#0D1117]">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
