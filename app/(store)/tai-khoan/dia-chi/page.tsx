import { MapPin } from 'lucide-react';
import { AccountPlaceholder } from '@/components/account/account-placeholder';

export const metadata = { title: 'Sổ địa chỉ' };

export default function AddressesPage() {
  return (
    <AccountPlaceholder title="SỔ ĐỊ CHỈ" subtitle="Lưu địa chỉ giao hàng để thanh toán nhanh hơn" icon={MapPin} />
  );
}
