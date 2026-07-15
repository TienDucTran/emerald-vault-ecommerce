'use client';

/**
 * Grid hiển thị danh sách media items.
 *
 * - Loading: 12 skeleton cards (pulse).
 * - Empty: empty-state box hướng dẫn upload.
 * - Click 1 card → `onItemClick(item)` (parent mở drawer).
 */

import { ImageIcon } from 'lucide-react';
import { MediaCard } from './media-card';
import type { MediaItem } from './types';

export interface MediaGridProps {
  items: MediaItem[];
  loading: boolean;
  onItemClick: (item: MediaItem) => void;
}

const SKELETON_COUNT = 12;

export function MediaGrid({ items, loading, onItemClick }: MediaGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-sm border border-[#4D4635] bg-[#1F1B13]"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center gap-2 p-12 text-center">
        <ImageIcon className="h-16 w-16 text-[#D0C5AF]/30" />
        <p className="text-sm text-[#D0C5AF]/60">Chưa có ảnh nào</p>
        <p className="text-xs text-[#D0C5AF]/40">
          Upload ảnh từ form sản phẩm hoặc kéo thả file vào đây
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
        />
      ))}
    </div>
  );
}
