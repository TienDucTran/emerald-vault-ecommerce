import Link from 'next/link';
import { Instagram, Facebook, Youtube, Mail } from 'lucide-react';

const FOOTER_LINKS = [
  {
    title: 'Mua sắm',
    links: [
      { label: 'Tất cả sản phẩm', href: '/san-pham' },
      { label: 'Bộ sưu tập', href: '/bo-suu-tap' },
      { label: 'Mới về', href: '/san-pham?sort=newest' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Câu chuyện', href: '/cau-chuyen' },
      { label: 'Cách phân biệt đồ si', href: '/cach-phan-biet-do-si' },
      { label: 'Hướng dẫn bảo quản', href: '/huong-dan-bao-quan' },
      { label: 'Liên hệ', href: '/lien-he' },
    ],
  },
  {
    title: 'Chính sách',
    links: [
      { label: 'Vận chuyển', href: '/chinh-sach/van-chuyen' },
      { label: 'Đổi trả', href: '/chinh-sach/doi-tra' },
      { label: 'Bảo mật', href: '/chinh-sach/bao-mat' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-gold/15 bg-surface">
      <div className="container mx-auto px-4 py-16">
        {/* Newsletter */}
        <div className="mb-12 rounded-lg border border-gold/20 bg-surface p-8 text-center">
          <h3 className="mb-2 font-heading text-2xl text-gradient-gold">
            Nhận thông báo khi có bộ sưu tập mới
          </h3>
          <p className="mx-auto mb-6 max-w-xl text-sm text-text-muted">
            Mỗi bộ sưu tập chỉ giới hạn — đăng ký để không bỏ lỡ những món đồ độc bản.
          </p>
          <form className="mx-auto flex max-w-md gap-2">
            <div className="relative flex-1">
              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                placeholder="email@example.com"
                className="h-11 w-full rounded-md border border-gold/30 bg-background pl-10 pr-3 text-sm text-text-base placeholder:text-text-disabled focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="h-11 rounded-md bg-gradient-gold px-6 text-sm font-semibold text-background transition-shadow hover:shadow-gold-glow-lg"
            >
              Đăng ký
            </button>
          </form>
        </div>

        {/* Main links */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-heading text-2xl font-bold tracking-wider">
              <span className="text-gradient-gold">EMERALD</span>{' '}
              <span className="text-text-muted">VAULT</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Trang sức si Nhật vintage — tuyển chọn thủ công, đã qua thẩm định chất lượng.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="grid h-9 w-9 place-items-center rounded-md border border-gold/30 text-gold/70 transition-colors hover:border-gold hover:text-gold"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="grid h-9 w-9 place-items-center rounded-md border border-gold/30 text-gold/70 transition-colors hover:border-gold hover:text-gold"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="grid h-9 w-9 place-items-center rounded-md border border-gold/30 text-gold/70 transition-colors hover:border-gold hover:text-gold"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-gold">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-text-muted transition-colors hover:text-gold"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-gold/10 pt-6 text-xs text-text-disabled md:flex-row">
          <p>© 2026 Emerald Vault. Mọi quyền được bảo lưu.</p>
          <p className="font-heading tracking-widest text-gold/50">
            ✦ ANTIQUE · VINTAGE · AUTHENTIC ✦
          </p>
        </div>
      </div>
    </footer>
  );
}
