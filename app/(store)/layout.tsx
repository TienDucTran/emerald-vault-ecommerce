import type { Metadata } from 'next';
import Script from 'next/script';
import { Cinzel, Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MobileFooter } from '@/components/home/mobile/mobile-footer';
import { MobileBottomNav } from '@/components/home/mobile/mobile-bottom-nav';
import { ChatWidget } from '@/components/chatbot/chat-widget';
import { ScrollToTop } from '@/components/layout/scroll-to-top';
import { ConsentBanner } from '@/components/analytics/consent-banner';
import { OrganizationJsonLd } from '@/components/seo/json-ld-organization';
import { Toaster } from '@/components/ui/toast';
import {
  getSiteSettings,
  toSiteSettings,
  DEFAULT_SITE_SETTINGS,
} from '@/lib/supabase/queries/site-content';
import '../globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
  icons: {
    icon: [
      { url: '/images/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/images/icon.png' },
    ],
    shortcut: ['/images/icon.png'],
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Emerald Vault',
    images: [
      {
        url: '/images/logo.png',
        width: 1200,
        height: 630,
        alt: 'Emerald Vault — Trang sức si Nhật vintage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emerald Vault — Trang sức si Nhật vintage',
    description:
      'Tuyển chọn trang sức si Nhật vintage đã qua thẩm định. Nhẫn, dây chuyền, bông tai, vòng tay từ những tiệm kim hoàn cổ điển Tokyo & Kyoto.',
    images: ['/images/logo.png'],
  },
};

// Layout này gọi createClient() (cookies) → bắt buộc dynamic.
export const dynamic = 'force-dynamic';

/**
 * Store root layout — áp dụng cho mọi customer-facing route trong nhóm (store).
 * URL không đổi vì (store) là route group.
 *
 * Cấu trúc: AnnouncementBar + Navbar (desktop/mobile) + main + Footer + MobileBottomNav + ChatWidget.
 * ZaloButton đã được tích hợp vào ChatPanel header + ChatWelcome — bỏ floating button riêng.
 */
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch site settings for Footer + AnnouncementBar — fallback to defaults on error
  let settings = DEFAULT_SITE_SETTINGS;
  try {
    const map = await getSiteSettings();
    settings = toSiteSettings(map);
  } catch {
    // Table might not exist yet — use defaults
  }

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
        {/* Desktop: AnnouncementBar + Navbar dính cùng 1 cụm ở đỉnh viewport.
            Cụm cha `sticky top-0 z-50` — khi scroll, cả 2 cùng cuộn, không bị tách rời. */}
        <div className="sticky top-0 z-[60] hidden lg:block bg-background">
          <AnnouncementBar messages={settings.announcement_messages} />
          <Navbar />
        </div>
        {/* Mobile: AnnouncementBar + Navbar dính cùng cụm.
            Thứ tự: announcement trên, navbar dưới (giống desktop). */}
        <div className="sticky top-0 z-[60] lg:hidden bg-background">
          <AnnouncementBar messages={settings.announcement_messages} />
          <Navbar />
        </div>
        {/* Mobile: pt-[108px] để clear sticky header (announcement 36 + navbar 72).
            Desktop: pt-0 vì header chỉ sticky trên mobile qua class ở trên. */}
        <main className="min-h-[calc(100vh-4.5rem)] pb-20 pt-[108px] lg:pb-0 lg:pt-0">
          {children}
        </main>
        {/* Desktop footer (chỉ hiện >=lg) */}
        <div className="hidden lg:block">
          <Footer settings={settings} />
        </div>
        {/* Mobile footer (chỉ hiện <lg) */}
        <div className="lg:hidden">
          <MobileFooter settings={settings} />
        </div>
        {/* Mobile bottom nav + chatbot */}
        <MobileBottomNav />
        <ChatWidget />
        <ScrollToTop />
        <ConsentBanner />
        <Toaster />
        {/* GA4 — chỉ mount khi NEXT_PUBLIC_GA_ID đã set; nếu trống (dev mới setup)
            thì skip để tránh warning. Default-deny consent ở <head> phía trên
            vẫn chạy để Nghị định 13/2023 VN tuân thủ. */}
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}