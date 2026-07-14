import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="font-heading text-8xl text-gradient-gold">404</p>
        <h1 className="mt-4 font-heading text-2xl">Món đồ này đã được sưu tầm</h1>
        <p className="mt-2 text-sm text-text-muted">
          Hoặc đường dẫn không tồn tại. Hãy quay lại trang chủ.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-gradient-gold px-5 text-sm font-semibold text-background"
          >
            <Home className="h-4 w-4" />
            Trang chủ
          </Link>
          <Link
            href="/san-pham"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-gold/40 px-5 text-sm font-medium text-gold hover:bg-gold/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Xem sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
}
