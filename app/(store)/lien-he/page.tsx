'use client';

import { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const contactInfo = [
  { icon: MapPin, label: 'Showroom', value: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', sub: 'By appointment only' },
  { icon: Phone, label: 'Hotline', value: '1900 6868', sub: '9:00 AM — 9:00 PM daily' },
  { icon: Mail, label: 'Email', value: 'hello@emerald-vault.vn', sub: 'We reply within 24 hours' },
  { icon: Clock, label: 'Giờ làm việc', value: 'Thứ 2 — Thứ 7', sub: '9:00 AM — 9:00 PM' },
];

const trustItems = [
  { icon: '🔒', title: 'Bảo mật thông tin', desc: 'Cam kết không chia sẻ dữ liệu' },
  { icon: '✅', title: 'Đã qua thẩm định', desc: 'Kiểm định chất lượng từng món' },
  { icon: '🚚', title: 'Freeship > 500k', desc: 'Cho đơn hàng từ ₫500,000' },
  { icon: '♻', title: 'Đổi trả trong 7 ngày', desc: 'Hoàn tiền nếu không đúng mô tả' },
];

// Google Maps embed URL — 12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh
// Dùng format !1m18!1m12 chuẩn — tương thích CSP frame-src https://www.google.com/maps
const MAP_EMBED_URL =
  'https://www.google.com/maps?q=12+Nguy%E1%BB%85n+Hu%E1%BB%87,+Qu%E1%BA%ADn+1,+H%E1%BB%93+Ch%C3%AD+Minh&z=16&output=embed';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

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
                  đội ngũ Emerald Vault luôn sẵn sàng hỗ trợ bạn.
                </p>
              </div>

              {/* Contact details */}
              <div className="flex flex-col gap-6">
                {contactInfo.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-4 motion-safe:animate-fadeInUp"
                      style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/5">
                        <Icon className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-xs font-heading tracking-[0.1em] uppercase text-gold/80">{item.label}</p>
                        <p className="mt-0.5 text-sm text-text-base">{item.value}</p>
                        <p className="mt-0.5 text-xs text-text-muted/60">{item.sub}</p>
                      </div>
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

      {/* Map Section — Google Maps embed */}
      <section className="overflow-hidden border-y border-gold/10">
        <div className="mx-auto w-full max-w-store px-4 py-12 sm:px-6 lg:px-8 xl:px-10">
          <div className="mb-6 text-center">
            <p className="mb-2 text-xs font-heading tracking-[0.3em] uppercase text-gold">✦ VỊ TRÍ</p>
            <h2 className="font-heading text-2xl font-bold text-text-base sm:text-3xl">
              Tìm chúng tôi trên <span className="text-gradient-gold">bản đồ</span>
            </h2>
            <p className="mt-2 text-sm text-text-muted">12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</p>
          </div>
          <div className="relative h-[400px] w-full overflow-hidden rounded-lg border border-gold/20 shadow-2xl sm:h-[500px]">
            <iframe
              src={MAP_EMBED_URL}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              title="Bản đồ — Emerald Vault Showroom"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
