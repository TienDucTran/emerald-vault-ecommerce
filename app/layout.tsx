import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/home/mobile/mobile-bottom-nav';
import { MobileChatbotBubble } from '@/components/home/mobile/mobile-chatbot-bubble';
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
  title: {
    default: 'Emerald Vault — Trang sức si Nhật vintage',
    template: '%s | Emerald Vault',
  },
  description:
    'Tuyển chọn trang sức si Nhật vintage đã qua thẩm định. Nhẫn, dây chuyền, bông tai, vòng tay từ những tiệm kim hoàn cổ điển Tokyo & Kyoto.',
  keywords: [
    'trang sức vintage',
    'đồ si Nhật',
    'antique jewelry',
    'nhẫn bạc 925',
    'Emerald Vault',
  ],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Emerald Vault',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="font-sans">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <AnnouncementBar />
          <Navbar />
        </div>
        {/* Mobile navbar */}
        <div className="lg:hidden">
          <Navbar />
        </div>
        <main className="min-h-[calc(100vh-4rem)] pb-20 lg:pb-0">{children}</main>
        {/* Desktop footer */}
        <div className="hidden lg:block">
          <Footer />
        </div>
        {/* Mobile bottom nav + chatbot */}
        <MobileBottomNav />
        <MobileChatbotBubble />
      </body>
    </html>
  );
}
