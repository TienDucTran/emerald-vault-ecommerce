'use client';

/**
 * Drawer chi tiết 1 media item, mở từ bên phải.
 *
 * - Preview lớn + metadata (filename, path, size, content-type, createdAt).
 * - Section "Đang dùng ở" nếu usageCount > 0, link tới trang edit sản phẩm.
 * - Section warning "Orphan" nếu không dùng ở đâu.
 * - Footer: Copy URL / Mở tab mới / Đóng.
 * - Close: click overlay, ESC, hoặc nút Đóng.
 *
 * Slide-in dùng CSS `translate-x-full` ↔ `translate-x-0` với transition 300ms.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Copy, ExternalLink, X } from 'lucide-react';

import { formatBytes } from '@/lib/image/client-resize';
import { toast } from '@/lib/toast/toast-store';
import { cn } from '@/lib/utils';
import type { MediaItem } from './types';

export interface MediaDetailDrawerProps {
  item: MediaItem | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MediaDetailDrawer({ item, onClose }: MediaDetailDrawerProps) {
  const [imgError, setImgError] = useState(false);
  const open = item !== null;

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset image error khi đổi item
  useEffect(() => {
    setImgError(false);
  }, [item?.id]);

  if (!item) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.publicUrl);
      toast.success('Đã copy URL');
    } catch {
      toast.error('Copy thất bại');
    }
  };

  const handleOpen = () => {
    window.open(item.publicUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết media"
        className={cn(
          'absolute right-0 top-0 z-50 h-full w-full max-w-md',
          'border-l border-[#F2CA50]/30 bg-[#12241C]',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 flex items-center justify-between border-b border-[#4D4635] bg-[#12241C] p-4">
          <h2 className="font-heading text-sm uppercase tracking-wider text-[#F2CA50]">
            Chi tiết media
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-sm p-1 text-[#D0C5AF]/70 hover:text-[#D0C5AF]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Preview */}
          <div className="relative aspect-square max-h-[60vh] w-full overflow-hidden rounded-sm bg-[#0D1117]">
            {imgError ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-[#D0C5AF]/50">
                Không tải được ảnh
              </div>
            ) : (
              <Image
                src={item.publicUrl}
                alt={item.filename}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                unoptimized
                className="object-contain"
                onError={() => setImgError(true)}
              />
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-1.5 font-mono text-xs">
            <p
              className="truncate text-sm text-[#D0C5AF] hover:text-[#F2CA50] cursor-pointer"
              onClick={handleCopy}
              title="Click để copy URL"
            >
              {item.filename}
            </p>
            <p className="truncate text-[#D0C5AF]/60">path: {item.path}</p>
            <p className="text-[#D0C5AF]/80">
              size: {formatBytes(item.size)}
            </p>
            <p className="text-[#D0C5AF]/80">type: {item.contentType}</p>
            <p className="text-[#D0C5AF]/80">
              created: {formatDate(item.createdAt)}
            </p>
          </div>

          {/* Used in */}
          {item.usageCount > 0 ? (
            <section>
              <h3 className="mb-2 text-xs uppercase text-[#F2CA50]/80">
                Đang dùng ở
              </h3>
              <ul className="space-y-1.5">
                {item.usedIn.map((u) => (
                  <li key={u.id} className="flex items-center gap-2 text-sm">
                    <Link
                      href={`/admin/products/${u.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[#D0C5AF] hover:text-[#F2CA50]"
                    >
                      {u.title}
                    </Link>
                    <span className="rounded-sm bg-[#4D4635]/60 px-1.5 py-0.5 text-[10px] text-[#D0C5AF]/70">
                      Dùng làm ảnh chính
                    </span>
                  </li>
                ))}
                {item.usageCount > item.usedIn.length && (
                  <li className="text-xs text-[#D0C5AF]/50">
                    và {item.usageCount - item.usedIn.length} sản phẩm khác…
                  </li>
                )}
              </ul>
            </section>
          ) : (
            <section className="rounded-sm border border-yellow-500/30 bg-yellow-500/5 p-3">
              <p className="text-xs text-yellow-200">
                Ảnh này không được sử dụng ở sản phẩm nào
              </p>
              <p className="mt-1 text-[10px] text-[#D0C5AF]/60">
                Có thể xoá để tiết kiệm dung lượng
              </p>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 flex gap-2 border-t border-[#4D4635] bg-[#12241C] p-4">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-[#4D4635] px-3 py-2 text-xs',
              'text-[#D0C5AF] hover:border-[#F2CA50]/60 hover:text-[#F2CA50]'
            )}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy URL
          </button>
          <button
            type="button"
            onClick={handleOpen}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-[#4D4635] px-3 py-2 text-xs',
              'text-[#D0C5AF] hover:border-[#F2CA50]/60 hover:text-[#F2CA50]'
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Mở tab mới
          </button>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex flex-1 items-center justify-center rounded-sm px-3 py-2 text-xs',
              'text-[#D0C5AF]/70 hover:bg-[#4D4635]/30 hover:text-[#D0C5AF]'
            )}
          >
            Đóng
          </button>
        </footer>
      </aside>
    </div>
  );
}
