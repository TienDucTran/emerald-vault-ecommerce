import Link from 'next/link';
import { Facebook, Instagram } from 'lucide-react';

const POLICY_LINKS = [
  'Quy Định Pháp Lý',
  'Chính Sách Bảo Mật',
  'Vận Chuyển Quốc Tế',
  'Quy Trình Giám Định',
];

const SUPPORT_LINKS = [
  'Hướng Dẫn Đo Size',
  'Liên Hệ Bà Chủ',
  'Đặt Lịch Hẹn Riêng',
  'Câu Hỏi Thường Gặp',
];

export function Footer() {
  return (
    <footer className="border-t border-gold/10 bg-background">
      {/* Main footer content */}
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6 px-8 pt-20 pb-12">
        {/* Brand column */}
        <div className="flex max-w-xs flex-1 flex-col gap-6">
          <Link href="/" className="font-heading text-3xl font-semibold text-gold">
            EMERALD VAULT
          </Link>
          <p className="text-sm leading-relaxed text-text-muted opacity-80">
            Nơi lưu giữ những giá trị vĩnh cửu. Chúng tôi không chỉ bán trang sức,
            chúng tôi chuyển giao những di sản từ thế hệ này sang thế hệ khác.
          </p>
          {/* Social icons */}
          <div className="flex gap-3">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="grid h-10 w-10 place-items-center rounded-xl border border-gold/30 text-gold transition-colors hover:border-gold hover:bg-gold/10"
              aria-label="Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="grid h-10 w-10 place-items-center rounded-xl border border-gold/30 text-gold transition-colors hover:border-gold hover:bg-gold/10"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noreferrer"
              className="grid h-10 w-10 place-items-center rounded-xl border border-gold/30 text-gold transition-colors hover:border-gold hover:bg-gold/10"
              aria-label="TikTok"
            >
              <span className="text-xs font-bold">TT</span>
            </a>
          </div>
        </div>

        {/* Policy links column */}
        <div className="flex w-64 flex-col gap-6">
          <h4 className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-gold">
            Chính Sách
          </h4>
          <ul className="flex flex-col gap-4">
            {POLICY_LINKS.map((label) => (
              <li key={label}>
                <Link
                  href="/chinh-sach"
                  className="text-sm text-text-muted transition-colors hover:text-gold"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support links column */}
        <div className="flex w-64 flex-col gap-6">
          <h4 className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-gold">
            Hỗ Trợ
          </h4>
          <ul className="flex flex-col gap-4">
            {SUPPORT_LINKS.map((label) => (
              <li key={label}>
                <Link
                  href="/lien-he"
                  className="text-sm text-text-muted transition-colors hover:text-gold"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter column */}
        <div className="flex w-72 flex-col gap-4">
          <h4 className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-gold">
            Tham Gia Kho Lưu Trữ
          </h4>
          <p className="text-sm text-text-muted">
            Nhận thông báo sớm nhất khi có sản phẩm Tier SSS mới về.
          </p>
          {/* Newsletter form */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center rounded border border-gold/30 bg-[#1F1B13] px-4 py-3.5">
              <input
                type="email"
                placeholder="Email của bạn..."
                className="w-full bg-transparent text-sm text-text-base placeholder:text-text-disabled focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-gold py-3 font-heading text-[10px] font-normal uppercase tracking-[0.1em] text-background transition-colors hover:bg-gold-champagne"
            >
              ĐĂNG KÝ
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between border-t border-gold/10 px-8 py-6">
        <p className="text-sm text-text-muted opacity-60">
          © 2024 Tokyo Retro Gems. Bảo lưu mọi quyền tuyệt tác.
        </p>
        <div className="flex gap-6 opacity-60">
          {/* Payment method placeholders */}
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-text-muted">VISA</span>
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-text-muted">MASTERCARD</span>
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-text-muted">PAYPAL</span>
        </div>
      </div>
    </footer>
  );
}