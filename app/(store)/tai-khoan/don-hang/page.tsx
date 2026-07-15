import type { Metadata } from 'next';
import { requireCustomer } from '@/lib/auth/require-customer';
import { OrderList } from '@/components/account/order-list';
import { getOrdersByCustomer } from '@/lib/supabase/queries/orders';

export const metadata: Metadata = {
  title: 'Đơn hàng của tôi',
  description: 'Theo dõi và quản lý tất cả đơn hàng của bạn tại Emerald Vault.',
};

export default async function OrdersPage() {
  const { user } = await requireCustomer();
  const { data, total } = await getOrdersByCustomer(user.id, {
    limit: 50,
    offset: 0,
  });

  return <OrderList orders={data} total={total} />;
}
