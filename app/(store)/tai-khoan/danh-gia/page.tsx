import { ReviewList } from '@/components/account/review-list';

export const metadata = { title: 'Đánh giá của tôi' };

export default function ReviewsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">
          ĐÁNH GIÁ CỦA TÔI
        </h1>
        <p className="text-base text-text-muted">
          Chia sẻ trải nghiệm của bạn về những kho báu đã mua.
        </p>
      </div>
      <ReviewList />
    </div>
  );
}
