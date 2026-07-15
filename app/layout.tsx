import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import './globals.css';

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
  title: '403 — Truy cập bị từ chối | Emerald Vault',
  robots: { index: false, follow: false },
};

/**
 * Root layout cho /403 (Forbidden page).
 * Tách riêng vì cần URL độc lập, nằm ngoài cả (store) và (admin) route groups.
 */
export default function ForbiddenLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="font-sans bg-[#0D1117] text-[#D0C5AF] antialiased">
        {children}
      </body>
    </html>
  );
}
