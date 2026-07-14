'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          ✦ LIÊN HỆ
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          <span className="text-gradient-gold">Chúng tôi ở đây</span>
          <span className="text-text-base"> để lắng nghe</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Contact info */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gold/20 bg-surface p-5">
            <Phone className="mb-3 h-5 w-5 text-gold" />
            <p className="font-heading text-sm text-text-base">Hotline</p>
            <p className="mt-1 text-text-muted">1900 6868</p>
          </div>
          <div className="rounded-lg border border-gold/20 bg-surface p-5">
            <Mail className="mb-3 h-5 w-5 text-gold" />
            <p className="font-heading text-sm text-text-base">Email</p>
            <p className="mt-1 text-text-muted">hello@emerald-vault.vn</p>
          </div>
          <div className="rounded-lg border border-gold/20 bg-surface p-5">
            <MapPin className="mb-3 h-5 w-5 text-gold" />
            <p className="font-heading text-sm text-text-base">Showroom</p>
            <p className="mt-1 text-text-muted">TP. Hồ Chí Minh (by appointment)</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="rounded-lg border border-gold/20 bg-surface p-6 lg:col-span-2"
        >
          <h2 className="mb-6 font-heading text-2xl">Gửi tin nhắn</h2>
          {submitted ? (
            <div className="rounded-md border border-gold/30 bg-surface-emerald p-6 text-center">
              <p className="font-heading text-gold">Cảm ơn bạn đã liên hệ!</p>
              <p className="mt-2 text-sm text-text-muted">
                Chúng tôi sẽ phản hồi trong vòng 24 giờ.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-base">Họ tên</label>
                <input
                  type="text"
                  required
                  className="h-11 w-full rounded-md border border-gold/30 bg-background px-3 text-sm text-text-base focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-base">Email</label>
                <input
                  type="email"
                  required
                  className="h-11 w-full rounded-md border border-gold/30 bg-background px-3 text-sm text-text-base focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-base">Tin nhắn</label>
                <textarea
                  required
                  rows={5}
                  className="w-full rounded-md border border-gold/30 bg-background p-3 text-sm text-text-base focus:border-gold focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-11 w-full rounded-md bg-gradient-gold font-semibold text-background transition-shadow hover:shadow-gold-glow-lg"
              >
                Gửi
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
