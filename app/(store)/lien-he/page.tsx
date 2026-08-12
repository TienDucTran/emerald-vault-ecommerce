'use client';

import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Clock, Radio, MessageCircle } from 'lucide-react';
import { DEFAULT_SITE_SETTINGS } from '@/lib/supabase/queries/site-content-defaults';
import type { SiteSettings } from '@/lib/types';

const trustItems = [
  { icon: '🔒', title: 'Bảo mật thông tin', desc: 'Cam kết không chia sẻ dữ liệu' },
  { icon: '✅', title: 'Đã qua thẩm định', desc: 'Kiểm định chất lượng từng món' },
  { icon: '🚚', title: 'Freeship > 500k', desc: 'Cho đơn hàng từ ₫500,000' },
  { icon: '♻', title: 'Đổi trả trong 7 ngày', desc: 'Hoàn tiền nếu không đúng mô tả' },
];

/** Build Google Maps embed URL từ địa chỉ (URL-encode). */
function buildMapEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`;
}

/** Build Google Maps link (mở app/browser) từ địa chỉ. */
function buildMapLinkUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Normalize phone → tel: href (strip spaces, dots, dashes). */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[\s.\-()]/g, '')}`;
}

/** Normalize Zalo id → zalo.me link. */
function zaloHref(zalo: string): string {
  const id = zalo.replace(/[\s.\-]/g, '');
  return `https://zalo.me/${id}`;
}

/**
 * Normalize input Google Maps → URL embed cho iframe.
 * Chấp nhận nhiều định dạng admin có thể dán:
 *  - URL embed trực tiếp: https://www.google.com/maps/embed?pb=...
 *  - URL có output=embed: https://www.google.com/maps?q=...&output=embed
 *  - Toàn bộ mã <iframe src="..."> → tự trích src
 * Trả '' nếu không phải URL embed (link chia sẻ/place URL không nhúng iframe được).
 */
function normalizeMapEmbedUrl(input: string | undefined | null): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';
  // Trích src từ <iframe src="...">
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  const url = (iframeMatch ? iframeMatch[1] : raw).trim();
  if (/\/maps\/embed(\?|$|&)/i.test(url) || /output=embed/i.test(url)) {
    return url;
  }
  return '';
}

/**
 * Normalize input Google Maps → clickable link (mở Maps app/browser).
 * Dùng cho link text "xem trên bản đồ". Accept:
 *  - Link chia sẻ (maps.app.goo.gl) → mở Maps app đúng vị trí
 *  - Place URL (/maps/place/...) → mở trang place
 *  - Search URL (/maps/search/... hoặc /maps?q=...) → mở search
 * Embed URL (/maps/embed?pb=...) KHÔNG dùng được làm link click (Google báo
 * "must be used in an iframe") → trả '' để fallback address query.
 */
function normalizeMapLinkUrl(input: string | undefined | null): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  const url = (iframeMatch ? iframeMatch[1] : raw).trim();
  if (!/^https?:\/\//i.test(url)) return '';
  if (/maps\.app\.goo\.gl/i.test(url)) return url;
  if (/^https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com)/i.test(url)) {
    // Embed URL không click được → fallback address
    if (/\/maps\/embed(\?|$|&)/i.test(url)) return '';
    return url;
  }
  return '';
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  // Fetch site settings từ /api/settings (public) — đồng nhất với admin Site Info tab.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && res.ok && json?.ok) {
          setSettings({ ...DEFAULT_SITE_SETTINGS, ...json.data });
        }
      } catch {
        // ignore — dùng default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const address = settings.address ?? '';
  const phone = settings.contact_phone ?? '';
  const email = settings.contact_email ?? '';
  const zalo = settings.contact_zalo ?? '';
  const liveStreamUrl = settings.live_stream_url ?? '';
  const siteName = settings.site_name ?? 'Emerald Vault';

  // Map URLs — ưu tiên từ admin (normalize mọi định dạng), fallback query theo address.
  // - mapEmbedUrl: cho <iframe> (Embed a map → copy src). CSP cho phép /maps/embed.
  // - mapLinkUrl: cho nút click mở Maps app (Share → Copy link). Embed URL không click được.
  const mapEmbedUrl = normalizeMapEmbedUrl(settings.map_embed_url) || (address ? buildMapEmbedUrl(address) : '');
  const mapLinkUrl = normalizeMapLinkUrl(settings.map_link_url) || (address ? buildMapLinkUrl(address) : '');

  // Build contact info từ settings — mỗi item có thể có href để render link clickable.
  const contactInfo: Array<{
    icon: typeof MapPin;
    label: string;
    value: string;
    sub?: string;
    href?: string;
  }> = [
    {
      icon: MapPin,
      label: 'Showroom',
      value: address || 'Đang cập nhật',
      sub: 'By appointment only',
      href: mapLinkUrl || undefined,
    },
    {
      icon: Phone,
      label: 'Hotline',
      value: phone || 'Đang cập nhật',
      sub: '5:00 PM — 10:00 PM',
      href: phone ? telHref(phone) : undefined,
    },
    {
      icon: Mail,
      label: 'Email',
      value: email || 'Đang cập nhật',
      sub: 'We reply within 24 hours',
      href: email ? `mailto:${email}` : undefined,
    },
    {
      icon: MessageCircle,
      label: 'Zalo',
      value: zalo || 'Đang cập nhật',
      sub: 'Chat nhanh với shop',
      href: zalo ? zaloHref(zalo) : undefined,
    },
    {
      icon: Clock,
      label: 'Giờ bán hàng',
      value: 'Thứ 3, 5, 6, 7',
      sub: '5:00 PM — 10:00 PM',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Contact & Form Grid */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
            {/* Left: Contact Info */}
            <div className="flex flex-col gap-12 lg:col-span-5">
              {/* Intro */}
              <div className="flex flex-col gap-6 motion-safe:animate-fadeInUp">
                <p className="text-xs font-heading tracking-[0.3em] uppercase text-gold">✦ LIÊN HỆ</p>
                <h2 className="font-heading text-3xl font-bold text-text-base sm:text-4xl">
                  Chúng tôi ở đây<br />
                  <span className="text-gradient-gold">để lắng nghe</span>
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-text-muted">
                  Dù bạn có câu hỏi về sản phẩm, cần tư vấn, hay muốn hẹn gặp trực tiếp tại showroom,
                  đội ngũ {siteName} luôn sẵn sàng hỗ trợ bạn.
                </p>
              </div>

              {/* Contact details */}
              <div className="flex flex-col gap-6">
                {contactInfo.map((item, i) => {
                  const Icon = item.icon;
                  const inner = (
                    <>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/5 transition-colors group-hover:border-gold/60 group-hover:bg-gold/10">
                        <Icon className="h-5 w-5 text-gold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-heading tracking-[0.1em] uppercase text-gold/80">{item.label}</p>
                        <p
                          className={`mt-0.5 text-sm text-text-base break-words ${
                            item.href
                              ? 'group-hover:text-gold transition-colors group-hover:underline underline-offset-4 decoration-gold/40'
                              : ''
                          }`}
                        >
                          {item.value}
                        </p>
                        {item.sub && (
                          <p className="mt-0.5 text-xs text-text-muted/60">{item.sub}</p>
                        )}
                      </div>
                    </>
                  );

                  if (item.href) {
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                        className="group flex items-start gap-4 motion-safe:animate-fadeInUp"
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
                      >
                        {inner}
                      </a>
                    );
                  }

                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-4 motion-safe:animate-fadeInUp"
                      style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Contact Form */}
            <div
              className="rounded-lg border border-gold/10 bg-surface-emerald/50 p-8 sm:p-10 lg:col-span-7 motion-safe:animate-fadeInUp"
              style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
            >
              <h3 className="mb-8 font-heading text-xl font-bold text-text-base">
                Gửi tin nhắn
              </h3>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                    <Mail className="h-8 w-8 text-gold" />
                  </div>
                  <p className="font-heading text-lg text-gold">Cảm ơn bạn đã liên hệ!</p>
                  <p className="mt-2 text-sm text-text-muted">
                    Chúng tôi sẽ phản hồi trong vòng 24 giờ.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(true);
                  }}
                  className="flex flex-col gap-6"
                >
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-heading tracking-[0.1em] uppercase text-text-muted/60">
                        Họ tên
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        className="h-12 w-full rounded-md border border-gold/20 bg-background px-4 text-sm text-text-base placeholder-text-muted/30 transition-colors focus:border-gold/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-heading tracking-[0.1em] uppercase text-text-muted/60">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="hello@email.com"
                        className="h-12 w-full rounded-md border border-gold/20 bg-background px-4 text-sm text-text-base placeholder-text-muted/30 transition-colors focus:border-gold/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-heading tracking-[0.1em] uppercase text-text-muted/60">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      placeholder="0901 234 567"
                      className="h-12 w-full rounded-md border border-gold/20 bg-background px-4 text-sm text-text-base placeholder-text-muted/30 transition-colors focus:border-gold/60 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-heading tracking-[0.1em] uppercase text-text-muted/60">
                      Tin nhắn
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Xin chào, tôi muốn tìm hiểu về..."
                      className="w-full resize-none rounded-md border border-gold/20 bg-background px-4 py-3 text-sm text-text-base placeholder-text-muted/30 transition-colors focus:border-gold/60 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-12 w-full rounded-md bg-gradient-gold font-heading text-sm font-bold uppercase tracking-[0.15em] text-background transition-all duration-300 hover:shadow-gold-glow-lg"
                  >
                    Gửi tin nhắn
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Map Section — Google Maps embed (ưu tiên map_embed_url từ admin, fallback query theo address) */}
      {mapEmbedUrl && (
        <section className="overflow-hidden border-y border-gold/10">
          <div className="mx-auto w-full max-w-store px-4 py-12 sm:px-6 lg:px-8 xl:px-10">
            <div className="mb-6 text-center">
              <p className="mb-2 text-xs font-heading tracking-[0.3em] uppercase text-gold">✦ VỊ TRÍ</p>
              <h2 className="font-heading text-2xl font-bold text-text-base sm:text-3xl">
                Tìm chúng tôi trên <span className="text-gradient-gold">bản đồ</span>
              </h2>
              {address && (
                <a
                  href={mapLinkUrl || buildMapLinkUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-text-muted underline-offset-4 transition-colors hover:text-gold hover:underline decoration-gold/40"
                >
                  {address}
                </a>
              )}
            </div>
            <div className="relative h-[400px] w-full overflow-hidden rounded-lg border border-gold/20 shadow-2xl sm:h-[500px]">
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                title={`Bản đồ — ${siteName} Showroom`}
              />
            </div>
          </div>
        </section>
      )}

      {/* Live Stream Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-heading tracking-[0.3em] uppercase text-gold">✦ LIVE STREAM</p>
            <h2 className="font-heading text-2xl font-bold text-text-base sm:text-3xl">
              Xem trực tiếp <span className="text-gradient-gold">sản phẩm</span>
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Tham gia live stream để xem sản phẩm thực tế và đặt hàng trực tiếp.
            </p>
          </div>
          <div className="rounded-lg border border-gold/20 bg-surface-emerald/50 p-8 sm:p-10">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                <Radio className="h-8 w-8 text-gold" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-text-base">Kênh Live Stream</h3>
                <p className="mt-2 text-sm text-text-muted">
                  {liveStreamUrl
                    ? 'Bấm nút bên dưới để xem live stream trực tiếp từ kênh của chúng tôi.'
                    : 'Nhập link live stream của bạn tại đây để khách hàng có thể xem trực tiếp.'}
                </p>
              </div>
              <div className="w-full max-w-lg">
                {liveStreamUrl ? (
                  <a
                    href={liveStreamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-12 w-full items-center justify-center rounded-md bg-gradient-gold font-heading text-sm font-bold uppercase tracking-[0.15em] text-background transition-all duration-300 hover:shadow-gold-glow-lg"
                  >
                    Xem Live Stream
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-md border border-gold/20 bg-background/50 font-heading text-sm font-bold uppercase tracking-[0.15em] text-text-muted/50"
                  >
                    Chưa có link Live Stream
                  </button>
                )}
                <p className="mt-3 text-xs text-text-muted/60">
                  * Liên hệ quản trị viên để cập nhật link live stream mới nhất.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
