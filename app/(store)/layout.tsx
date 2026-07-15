import type { Metadata } from 'next';
import Script from 'next/script';
import { Cinzel, Inter } from 'next/font/google';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/home/mobile/mobile-bottom-nav';
import { MobileChatbotBubble } from '@/components/home/mobile/mobile-chatbot-bubble';
import { ConsentBanner } from '@/components/analytics/consent-banner';
import { OrganizationJsonLd } from '@/components/seo/json-ld-organization';
import '../globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
  metadataBase: new URL(SITE_URL),
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

/**
 * Store root layout — áp dụng cho mọi customer-facing route trong nhóm (store).
 * URL không đổi vì (store) là route group.
 *
 * Cấu trúc: AnnouncementBar + Navbar (desktop/mobile) + main + Footer + MobileBottomNav + ChatbotBubble.
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${cinzel.variable} ${inter.variable}`}>
      <head>
        <Script id="ga-consent-default" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', wait_for_update: 500 });`}
        </Script>
      </head>
      <body className="font-sans">
        <OrganizationJsonLd />
        {/* Desktop header: AnnouncementBar (sticky top-0) + Navbar (sticky top-9).
            Cả 2 dính đỉnh viewport. Khi scroll, cả 2 đều hiện, không bị ẩn. */}
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
        <ConsentBanner />
      </body>
    </html>
  );
}
