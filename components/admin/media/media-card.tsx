'use client';

/**
 * Card hiển thị 1 media item trong grid.
 *
 * - Click card → mở drawer chi tiết (qua `onClick`).
 * - Hover overlay có 2 nút nhanh: Copy URL, Mở tab mới.
 * - Badge dưới-trái hiển thị usage: nếu ảnh đang dùng → "Dùng ở N SP",
 *   nếu không → "Orphan". Phase sau sẽ refactor để hiển thị tier (SSS/SS/S)
 *   khi API trả về.
 */

import { useState } from 'react';
import Image from 'next/image';
import { Copy, ExternalLink, ImageIcon } from 'lucide-react';

import { formatBytes } from '@/lib/image/client-resize';
import { toast } from '@/lib/toast/toast-store';
import { cn } from '@/lib/utils';
import type { MediaItem } from './types';

export interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

export function MediaCard({ item, onClick }: MediaCardProps) {
  const [imgError, setImgError] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.publicUrl);
      toast.success('Đã copy URL');
    } catch {
      toast.error('Copy thất bại');
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.publicUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group relative aspect-square cursor-pointer overflow-hidden rounded-sm',
        'border border-[#4D4635] bg-[#1F1B13]',
        'transition-all duration-200 hover:scale-[1.02]'
      )}
    >
      {/* Image / fallback */}
      {imgError ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#D0C5AF]/50">
          <ImageIcon className="h-8 w-8" />
          <span className="text-[10px]">Lỗi ảnh</span>
        </div>
      ) : (
        <Image
          src={item.publicUrl}
          alt={item.filename}
          fill
          sizes="(max-width: 768px) 33vw, 200px"
          unoptimized
          className="object-cover"
          onError={() => setImgError(true)}
        />
      )}

      {/* Hover overlay - top-right actions */}
      <div className="pointer-events-none absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy URL"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur transition-colors hover:bg-black/80"
        >
          <Copy className="h-4 w-4 text-white" />
        </button>
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Mở rộng"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur transition-colors hover:bg-black/80"
        >
          <ExternalLink className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Bottom-left usage badge */}
      <div className="absolute bottom-10 left-2">
        {item.usageCount > 0 ? (
          <span className="rounded-full bg-[#F2CA50] px-2 py-0.5 text-[10px] font-medium text-[#12241C]">
            Dùng ở {item.usageCount} SP
          </span>
        ) : (
          <span className="rounded-full bg-[#4D4635]/80 px-2 py-0.5 text-[10px] text-[#D0C5AF]/70">
            Orphan
          </span>
        )}
      </div>

      {/* Bottom filename + size bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="truncate text-xs text-white">{item.filename}</p>
        <p className="text-[10px] text-white/60">{formatBytes(item.size)}</p>
      </div>
    </div>
  );
}
