'use client';

/**
 * MediaPicker — helper component dùng trong các form admin (tạo / sửa product,
 * collection, category, banner…) để chọn ảnh từ Media Library thay vì phải
 * upload mới hoặc dán URL thủ công.
 *
 * Props chính:
 *  - `open`                  : điều khiển hiển thị modal.
 *  - `mode`                  : 'single' | 'multi'  (default 'single').
 *  - `folder`                : folder trong bucket để browse (default 'products').
 *  - `initialSelected`       : danh sách URL đã chọn trước (để pre-check khi mở).
 *  - `max`                   : giới hạn chọn (multi mode).
 *  - `title`                 : tiêu đề modal.
 *  - `onConfirm(urls)`       : gọi khi user bấm "Chọn".
 *  - `onCancel()`            : gọi khi user đóng modal (overlay/Esc/Huỷ).
 *  - `onOpenChange(open)`    : báo cho parent biết modal đã đóng (vd sau Esc).
 *
 * Lưu ý:
 *  - Dùng lại endpoint `GET /api/admin/media` (read-only), không tự upload —
 *    parent vẫn dùng dropzone/Upload riêng nếu cần.
 *  - Dùng lại `MediaCard` cho grid item để đồng bộ visual với trang Media.
 *  - Modal đóng: overlay click, Esc, nút Huỷ, nút Chọn (khi đã confirm).
 *  - Không phụ thuộc shadcn/Radix — codebase hiện tại hoàn toàn hand-rolled.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Library as LibraryIcon,
  Loader2,
  Search,
  X,
} from 'lucide-react';

import { MediaCard } from './media-card';
import { MediaUploadDropzone } from './media-upload-dropzone';
import type { MediaItem, MediaSort } from './types';
import { toast } from '@/lib/toast/toast-store';
import { cn } from '@/lib/utils';

export type MediaPickerMode = 'single' | 'multi';

export interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: MediaPickerMode;
  folder?: string;
  initialSelected?: string[];
  max?: number;
  title?: string;
  /**
   * Nếu `true`, hiển thị dropzone upload ngay trong modal để user có thể vừa
   * upload vừa chọn trong cùng 1 luồng (mặc định bật cho product form).
   */
  showUpload?: boolean;
  onConfirm: (urls: string[]) => void;
  onCancel?: () => void;
}

const LIMIT = 50;

const glassStrong: React.CSSProperties = {
  background: 'rgba(18, 36, 28, 0.92)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(242, 202, 80, 0.3)',
};

const SORT_OPTIONS: ReadonlyArray<{ value: MediaSort; label: string }> = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'created_asc', label: 'Cũ nhất' },
  { value: 'size_desc', label: 'Lớn nhất' },
  { value: 'name_asc', label: 'Tên A–Z' },
];

export function MediaPicker({
  open,
  onOpenChange,
  mode = 'single',
  folder = 'products',
  initialSelected = [],
  max,
  title = 'Chọn ảnh từ thư viện',
  showUpload = true,
  onConfirm,
  onCancel,
}: MediaPickerProps) {
  const effectiveMax = useMemo(
    () => (typeof max === 'number' ? max : mode === 'multi' ? 20 : 1),
    [max, mode]
  );

  // -- Data fetching state (mirror MediaPage) --
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MediaSort>('created_desc');
  const [offset, setOffset] = useState(0);

  // -- Selection state --
  // Lưu URL thay vì id vì cần tương thích với `formData.image_url` / `gallery`
  // (hiện chỉ là string URL trong schema, không có imageId).
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));

  // Khi mở modal: hydrate lại selection từ initialSelected (idempotent).
  useEffect(() => {
    if (open) {
      setSelected(new Set(initialSelected.filter(Boolean)));
      setOffset(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(offset),
        sort,
        folder,
      });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/media?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || !json.ok) {
        const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setItems((json.items as MediaItem[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(msg);
      toast.error(`Không tải được media: ${msg}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, sort, offset, folder]);

  // Debounce search 300ms.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setOffset(0);
      void fetchMedia();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]);

  // Khi sort/folder/offset đổi → fetch ngay.
  useEffect(() => {
    if (!open) return;
    void fetchMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, offset, folder, open]);

  // Esc đóng modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Ref để click outside modal content.
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Tránh SSR mismatch + đảm bảo document.body đã sẵn sàng trước khi portal.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // -- Handlers --
  const handleClose = useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  const togglePick = useCallback(
    (item: MediaItem) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const already = next.has(item.publicUrl);
        if (already) {
          next.delete(item.publicUrl);
          return next;
        }
        if (mode === 'single') {
          // Single mode: chỉ giữ 1 (replace).
          return new Set([item.publicUrl]);
        }
        if (next.size >= effectiveMax) {
          toast.warning(`Tối đa ${effectiveMax} ảnh.`);
          return prev;
        }
        next.add(item.publicUrl);
        return next;
      });
    },
    [mode, effectiveMax]
  );

  const handleConfirm = useCallback(() => {
    // Giữ thứ tự: ưu tiên initialSelected, sau đó bổ sung các item mới theo
    // thứ tự xuất hiện trong grid hiện tại (để kết quả ổn định).
    const inGridOrder: string[] = [];
    const inInitial = new Set<string>(initialSelected);
    for (const it of items) {
      if (selected.has(it.publicUrl)) inGridOrder.push(it.publicUrl);
    }
    // Nếu có URL đã chọn nhưng không nằm trong trang hiện tại (vd search khác
    // page khác), vẫn giữ lại.
    const extras: string[] = [];
    for (const url of Array.from(selected)) {
      if (!inGridOrder.includes(url) && !inInitial.has(url)) {
        extras.push(url);
      }
    }
    const ordered = [
      ...initialSelected.filter((u) => selected.has(u)),
      ...inGridOrder.filter((u) => !initialSelected.includes(u)),
      ...extras,
    ];
    onConfirm(ordered);
    onOpenChange(false);
  }, [items, selected, initialSelected, onConfirm, onOpenChange]);

  const handleUploadComplete = useCallback(
    (count: number) => {
      if (count > 0) {
        toast.success(`Đã upload ${count} ảnh mới`);
        setOffset(0);
        void fetchMedia();
      }
    },
    [fetchMedia]
  );

  if (!open) return null;

  const hasNext = items.length === LIMIT;
  const hasPrev = offset > 0;
  const currentPage = Math.floor(offset / LIMIT) + 1;

  // Render qua Portal để thoát khỏi mọi containing block (transform/filter/
  // will-change/perspective) của parent — đảm bảo modal luôn căn giữa
  // viewport thực sự khi user đã cuộn xuống dưới. Nếu không portal, `fixed`
  // sẽ bị relative hóa về ancestor gần nhất có transform, khiến modal bị
  // "neo" vào top của form thay vì giữa màn hình.
  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div
        ref={contentRef}
        className={cn(
          'relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-sm overflow-hidden',
          'shadow-2xl'
        )}
        style={glassStrong}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[rgba(242,202,80,0.15)]">
          <div className="flex items-center gap-2 min-w-0">
            <LibraryIcon className="w-4 h-4 text-gold shrink-0" />
            <h2 className="font-heading text-sm sm:text-base font-semibold text-gold tracking-[0.1em] uppercase truncate">
              {title}
            </h2>
            <span className="text-[10px] text-[#D0C5AF]/50 shrink-0">
              · {selected.size}/{effectiveMax} đã chọn
              {mode === 'multi' ? ' (multi)' : ' (single)'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng"
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-[#D0C5AF]/70 hover:text-gold transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-[rgba(242,202,80,0.1)] flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D0C5AF]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên file…"
              className="w-full pl-8 pr-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as MediaSort);
              setOffset(0);
            }}
            className="appearance-none bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] px-3 py-2 pr-8 focus:outline-none focus:border-gold/40 transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Folder badge (read-only) */}
          <span className="text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 px-2 py-1 border border-[#4D4635]/40 rounded-sm">
            folder: {folder || 'root'}
          </span>
        </div>

        {/* Upload dropzone (optional) */}
        {showUpload && (
          <div className="px-5 pt-3">
            <MediaUploadDropzone
              folder={folder}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        )}

        {/* Error box */}
        {error && !loading && (
          <div className="mx-5 mt-3 flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 p-3">
            <p className="text-xs text-error/90 flex-1">{error}</p>
            <button
              type="button"
              onClick={() => void fetchMedia()}
              className="rounded-sm border border-error/40 px-3 py-1 text-[10px] font-heading tracking-[0.1em] uppercase text-error/80 hover:bg-error/10"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-sm border border-[#4D4635] bg-[#1F1B13]"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-[#D0C5AF]/50 text-xs">
              <p>Không có ảnh nào trong folder này.</p>
              {showUpload && (
                <p className="text-[10px]">Kéo thả file vào ô upload ở trên.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item) => {
                const isSelected = selected.has(item.publicUrl);
                return (
                  <div key={item.id} className="relative">
                    <MediaCard
                      item={item}
                      onClick={() => togglePick(item)}
                    />
                    {/* Selected overlay */}
                    {isSelected && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-gold"
                        aria-hidden
                      >
                        <div className="absolute right-2 top-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-[#12241C] shadow">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[rgba(242,202,80,0.15)] bg-[rgba(13,17,23,0.4)]">
          <div className="flex items-center gap-2 text-[10px] text-[#D0C5AF]/50">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={!hasPrev || loading}
              className="rounded-sm border border-[#4D4635]/30 px-3 py-1 text-[10px] transition-colors hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹ Trước
            </button>
            <span>Trang {currentPage}</span>
            <button
              type="button"
              onClick={() => setOffset(offset + LIMIT)}
              disabled={!hasNext || loading}
              className="rounded-sm border border-[#4D4635]/30 px-3 py-1 text-[10px] transition-colors hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau ›
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/70 hover:text-[#EAE1D4] transition-colors"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className={cn(
                'px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold inline-flex items-center gap-2 transition-colors',
                'bg-gold text-[#3C2F00] hover:bg-gold/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Chọn ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
