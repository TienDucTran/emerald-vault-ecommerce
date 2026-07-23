// Trang tra cứu đơn hàng — entry point công khai.
// User nhập mã đơn + SĐT → redirect sang /don-hang/[code]?phone=... để xem chi tiết.
//
// Mục đích: khách (không login) có thể tra cứu đơn mà không cần share link.
// Customer đã login có thể dùng làm shortcut (nhưng thường dùng /tai-khoan/don-hang).

import { Search } from 'lucide-react';

import { OrderLookupForm } from './order-lookup-form';

export const metadata = {
  title: 'Tra cứu đơn hàng - Emerald Vault',
  description: 'Tra cứu trạng thái đơn hàng bằng mã đơn và số điện thoại.',
};

export default function OrderLookupEntryPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-xl">
        <nav className="mb-6 text-xs text-text-muted">
          <a href="/" className="hover:text-gold">Trang chủ</a>
          <span className="mx-2">/</span>
          <span className="text-text-base">Tra cứu đơn hàng</span>
        </nav>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-gold/30 bg-surface-emerald text-gold">
            <Search className="h-6 w-6" />
          </div>
          <h1 className="mb-2 font-heading text-3xl font-bold text-gold">
            Tra cứu đơn hàng
          </h1>
          <p className="text-sm text-text-muted">
            Nhập mã đơn và số điện thoại đã dùng khi đặt hàng để xem trạng thái.
          </p>
        </div>

        <OrderLookupForm />
      </div>
    </div>
  );
}
