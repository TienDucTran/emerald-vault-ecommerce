import { Star } from 'lucide-react';
import { AccountPlaceholder } from '@/components/account/account-placeholder';

export const metadata = { title: 'Đánh giá của tôi' };

export default function ReviewsPage() {
  return (
    <AccountPlaceholder title="ĐÁNH GIÁ CỦA TÔI" subtitle="Chia sẻ trải nghiệm của bạn" icon={Star} />
  );
}
