'use client';

import { useState } from 'react';

const contactInfo = [
  { icon: '📍', label: 'Showroom', value: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', sub: 'By appointment only' },
  { icon: '📞', label: 'Hotline', value: '1900 6868', sub: '9:00 AM — 9:00 PM daily' },
  { icon: '✉', label: 'Email', value: 'hello@emerald-vault.vn', sub: 'We reply within 24 hours' },
  { icon: '🕐', label: 'Giờ làm việc', value: 'Thứ 2 — Thứ 7', sub: '9:00 AM — 9:00 PM' },
];

const trustItems = [
  { icon: '🔒', title: 'Bảo mật thông tin', desc: 'Cam kết không chia sẻ dữ liệu' },
  { icon: '✅', title: 'Cam kết chính hãng', desc: '100% sản phẩm đã qua thẩm định' },
  { icon: '🚚', title: 'Miễn phí vận chuyển', desc: 'Cho đơn hàng từ ₫3,000,000' },
  { icon: '♻', title: 'Đổi trả trong 30 ngày', desc: 'Hoàn tiền nếu không hài lòng' },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Hero Section — matches Figma node 5:839 (height 480px) */}
      <section className="relative flex items-center justify-center h-[480px] overflow-hidden">
        {/* Background ambient effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.03] to-transparent" />
        <div className="relative z-10 text-center px-8 max-w-3xl">
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold text-gold tracking-[-0.05em] leading-tight">
            EMERALD VAULT
          </h1>
          <p className="mt-4 text-xl sm:text-2xl font-serif italic font-semibold text-[#D0C5AF] leading-relaxed">
            {'\u201CNơi những tuyệt tác vượt thời gian tìm thấy người tri kỷ.\u201D'}
          </p>
        </div>
      </section>

      {/* Contact & Form Grid — matches Figma node 5:722 (12-col grid, 24px gap) */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Contact Info — span 5 */}
          <div className="lg:col-span-5 flex flex-col gap-12">
            {/* Intro */}
            <div className="flex flex-col gap-6">
              <p className="text-xs font-heading tracking-[0.3em] uppercase text-gold">✦ LIÊN HỆ</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#EAE1D4]">
                Chúng tôi ở đây<br />
                <span className="text-gradient-gold">để lắng nghe</span>
              </h2>
              <p className="text-sm text-[#D0C5AF]/70 leading-relaxed max-w-md">
                Dù bạn có câu hỏi về sản phẩm, cần tư vấn, hay muốn hẹn gặp trực tiếp tại showroom, 
                đội ngũ Emerald Vault luôn sẵn sàng hỗ trợ bạn.
              </p>
            </div>

            {/* Contact details */}
            <div className="flex flex-col gap-6">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <span className="text-xl mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs font-heading tracking-[0.1em] uppercase text-gold/80">{item.label}</p>
                    <p className="text-sm text-[#D0C5AF] mt-0.5">{item.value}</p>
                    <p className="text-xs text-[#D0C5AF]/50 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Contact Form — span 7, matches Figma node 5:776 */}
          <div
            className="lg:col-span-7 p-10 sm:p-12 rounded-sm relative"
            style={{
              background: '#12241C',
              border: '1px solid rgba(212, 175, 55, 0.1)',
            }}
          >
            <h3 className="font-heading text-xl font-bold text-[#EAE1D4] mb-8">
              Gửi tin nhắn
            </h3>

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-5xl mb-4">✉</span>
                <p className="font-heading text-lg text-gold">Cảm ơn bạn đã liên hệ!</p>
                <p className="text-sm text-[#D0C5AF]/60 mt-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/60 mb-2">
                      Họ tên
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      className="w-full h-12 px-4 bg-background border border-gold/20 rounded-sm text-sm text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/60 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="hello@email.com"
                      className="w-full h-12 px-4 bg-background border border-gold/20 rounded-sm text-sm text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/60 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/60 mb-2">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="0901 234 567"
                    className="w-full h-12 px-4 bg-background border border-gold/20 rounded-sm text-sm text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/60 mb-2">
                    Tin nhắn
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Xin chào, tôi muốn tìm hiểu về..."
                    className="w-full px-4 py-3 bg-background border border-gold/20 rounded-sm text-sm text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/60 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-gold to-gold-champagne text-background font-bold font-heading text-sm tracking-[0.15em] uppercase rounded-sm hover:shadow-gold-glow-lg transition-all duration-300"
                >
                  Gửi tin nhắn
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Map Section — matches Figma node 5:825 (500px height) */}
      <section className="h-[500px] w-full bg-[#161B22] flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4 opacity-30">🗺</span>
          <p className="text-sm text-[#D0C5AF]/30 font-heading tracking-[0.1em] uppercase">Bản đồ — Google Maps</p>
          <p className="text-[10px] text-[#D0C5AF]/20 mt-1">12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</p>
        </div>
      </section>

      {/* Trust Strip — matches Figma node 5:811 */}
      <section className="border-t border-gold/10 py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-wrap justify-center gap-8">
            {trustItems.map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-3 text-center max-w-[200px]">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-heading tracking-[0.05em] text-[#D0C5AF]">{item.title}</p>
                  <p className="text-[10px] text-[#D0C5AF]/50 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Action UI — matches Figma node 5:928 */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
        {/* Scroll to Top Button */}
        <button
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:opacity-100"
          style={{
            background: 'rgba(13, 17, 23, 0.8)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(242, 202, 80, 0.2)',
            boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
            opacity: 0.8,
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* AI Chatbot Bubble — matches Figma */}
        <button
          className="w-16 h-16 rounded-xl bg-gold flex items-center justify-center"
          style={{
            boxShadow: '0px 0px 20px 0px rgba(242, 202, 80, 0.3)',
          }}
        >
          <svg className="w-7 h-7 text-[#3C2F00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}