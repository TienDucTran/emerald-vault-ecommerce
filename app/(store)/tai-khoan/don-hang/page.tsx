import type { Metadata } from 'next';
import { OrderList } from '@/components/account/order-list';

export const metadata: Metadata = {
  title: 'Đơn hàng của tôi',
  description: 'Theo dõi và quản lý tất cả đơn hàng của bạn tại Emerald Vault.',
};

export default function OrdersPage() {
  return <OrderList />;
}
