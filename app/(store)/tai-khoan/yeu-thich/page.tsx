import { Heart } from 'lucide-react';
import { AccountPlaceholder } from '@/components/account/account-placeholder';

export const metadata = { title: 'Yêu thích' };

export default function WishlistPage() {
  return (
    <AccountPlaceholder title="YÊU THÍCH" subtitle="Những kho báu bạn đã thả tim" icon={Heart} />
  );
}
