import { Lock } from 'lucide-react';
import { AccountPlaceholder } from '@/components/account/account-placeholder';

export const metadata = { title: 'Bảo mật' };

export default function SecurityPage() {
  return (
    <AccountPlaceholder title="BẢO MậT" subtitle="Bảo vệ tài khoản của bạn" icon={Lock} />
  );
}
