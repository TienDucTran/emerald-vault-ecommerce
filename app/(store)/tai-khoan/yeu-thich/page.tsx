import { WishlistSyncGrid } from '@/components/account/wishlist-sync-grid';

export const metadata = { title: 'Yêu thích' };

export default function WishlistPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">
          YÊU THÍCH CỦA TÔI
        </h1>
        <p className="text-base text-text-muted">
          Những kho báu bạn đã thả tim — được đồng bộ giữa mọi thiết bị.
        </p>
      </div>
      <WishlistSyncGrid />
    </div>
  );
}
