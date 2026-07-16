'use client';

/**
 * Trang Media Library — Phase 1 (read-only).
 *
 * Tính năng trong phase này:
 *  - Liệt kê media items từ Supabase Storage (qua `GET /api/admin/media`).
 *  - Tìm kiếm theo tên file + sắp xếp (4 kiểu).
 *  - Phân trang đơn giản (prev/next, dựa trên heuristic `items.length === LIMIT`
 *    vì API hiện chưa trả `total` chính xác — phase 2 sẽ thay bằng total thật).
 *  - Xem chi tiết 1 ảnh trong drawer (preview, metadata, usage, copy URL).
 *
 * Chưa làm trong phase này (sẽ bổ sung sau):
 *  - Upload trực tiếp từ trang này (kéo thả / chọn file).
 *  - Xoá 1 ảnh / xoá hàng loạt orphan.
 *  - Đổi tên, di chuyển folder, sửa metadata.
 *  - Lọc theo folder (backend đã hỗ trợ param `folder=` nhưng UI chưa gắn).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

import { MediaToolbar } from '@/components/admin/media/media-toolbar';
import { MediaGrid } from '@/components/admin/media/media-grid';
import { MediaDetailDrawer } from '@/components/admin/media/media-detail-drawer';
import { MediaUploadDropzone } from '@/components/admin/media/media-upload-dropzone';
import type { MediaItem, MediaSort } from '@/components/admin/media/types';
import { toast } from '@/lib/toast/toast-store';

const LIMIT = 50;

const glassStyle: React.CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};

export default function MediaPage() {
  // Danh sách media items trong trang hiện tại
  const [items, setItems] = useState<MediaItem[]>([]);
  // Trạng thái đang tải (skeleton ở grid)
  const [loading, setLoading] = useState(true);
  // Lỗi fetch lần gần nhất (null = OK)
  const [error, setError] = useState<string | null>(null);
  // Từ khoá search (raw, chưa debounce)
  const [search, setSearch] = useState('');
  // Cách sắp xếp
  const [sort, setSort] = useState<MediaSort>('created_desc');
  // Folder filter trong bucket ('' = root). Mặc định 'products' để khớp default
  // của API và là nơi mọi upload từ product form / dropzone đổ về.
  const [folder, setFolder] = useState<string>('products');
  // Offset phân trang (LIMIT = 50 / trang)
  const [offset, setOffset] = useState(0);
  // Item đang mở trong drawer (null = đóng)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  /**
   * Gọi `GET /api/admin/media` với search/sort/offset hiện tại.
   * - Lỗi → set error + toast + clear items.
   * - Thành công → set items từ response.
   */
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
        const msg =
          (json && (json.message || json.error)) || `HTTP ${res.status}`;
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

  // Debounce search 300ms: khi user gõ, chờ 300ms rồi reset về trang đầu + fetch.
  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      fetchMedia();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Khi sort, folder hoặc offset đổi → fetch ngay (không debounce).
  useEffect(() => {
    fetchMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, offset, folder]);

  // Stats tính từ items hiện tại (page-level, không phải tổng DB).
  const totalSize = useMemo(
    () => items.reduce((s, it) => s + (it.size || 0), 0),
    [items],
  );
  const orphanCount = useMemo(
    () => items.filter((it) => it.usageCount === 0).length,
    [items],
  );

  // Heuristic phân trang: nếu trang hiện tại đầy LIMIT → có thể còn trang sau.
  // Phase 2 sẽ thay bằng `total` thật từ API.
  const currentPage = Math.floor(offset / LIMIT) + 1;
  const hasPrev = offset > 0;
  const hasNext = items.length === LIMIT;

  const goPrev = () => {
    if (!hasPrev) return;
    setOffset(Math.max(0, offset - LIMIT));
  };
  const goNext = () => {
    if (!hasNext) return;
    setOffset(offset + LIMIT);
  };

  /**
   * Callback khi dropzone hoàn tất batch upload: refresh grid + toast tổng.
   * Đặt ngoài `fetchMedia` để tránh stale closure khi MediaUploadDropzone memo hoá.
   */
  const handleUploadComplete = useCallback(
    (count: number) => {
      if (count > 0) {
        toast.success(`Đã upload ${count} ảnh mới`);
        // Reset về trang đầu để chắc chắn ảnh mới (thường mới nhất) hiện ra.
        setOffset(0);
        // Gọi trực tiếp fetchMedia ở đây sẽ dùng search/sort/offset hiện tại.
        // setOffset(0) ở trên sẽ kích hoạt effect → fetchMedia chạy lại; gọi
        // thêm 1 lần nữa để cover trường hợp effect chưa kịp (vd cùng offset).
        void fetchMedia();
      }
    },
    [fetchMedia]
  );

  /**
   * Callback khi drawer xoá 1 ảnh thành công:
   *  - Optimistic remove khỏi list hiện tại (tránh 1 nhịp flash trống trên grid).
   *  - Refetch nền để cập nhật lại usageCount của các item còn lại (nếu cùng path
   *    xuất hiện trong product khác, `deleteImage` ở server đã chặn trước đó, nên
   *    chỉ còn case list orphan giảm đi).
   */
  const handleItemDeleted = useCallback(
    (path: string) => {
      setItems((prev) => prev.filter((it) => it.path !== path));
      void fetchMedia();
    },
    [fetchMedia]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header (sticky) */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 lg:-mx-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 lg:px-8 py-4 backdrop-blur"
        style={{ background: 'rgba(13, 17, 23, 0.6)' }}
      >
        <div>
          <h1 className="font-heading text-2xl tracking-wider text-gold">
            Media Library
          </h1>
          <p className="mt-1 text-sm text-muted/70">
            Quản lý ảnh đã upload lên Supabase Storage
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMedia}
          disabled={loading}
          className="flex items-center gap-2 rounded-sm border border-[#4D4635] bg-[rgba(18,36,28,0.6)] px-4 py-2 text-xs font-heading tracking-[0.15em] uppercase text-[#D0C5AF] transition-colors hover:border-[#F2CA50]/60 hover:text-[#F2CA50] disabled:opacity-50"
        >
          <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          Refresh
        </button>
      </div>

      {/* Upload dropzone (Phase 2: chức năng upload) */}
      <MediaUploadDropzone
        folder="products"
        onUploadComplete={handleUploadComplete}
      />

      {/* Toolbar + Grid */}
      <section className="space-y-4 rounded-sm p-4 sm:p-6" style={glassStyle}>
        <MediaToolbar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={(s) => {
            setSort(s);
            setOffset(0);
          }}
          folder={folder}
          onFolderChange={(f) => {
            setFolder(f);
            setOffset(0);
          }}
          total={items.length}
          totalSize={totalSize}
          orphanCount={orphanCount}
        />

        {/* Error box riêng (ngoài grid) */}
        {error && !loading && (
          <div className="flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
            <div className="flex-1">
              <p className="text-xs text-error/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchMedia}
              className="rounded-sm border border-error/40 px-3 py-1 text-[10px] font-heading tracking-[0.1em] uppercase text-error/80 transition-colors hover:bg-error/10 hover:text-error"
            >
              Thử lại
            </button>
          </div>
        )}

        <MediaGrid
          items={items}
          loading={loading}
          onItemClick={(item) => setSelectedItem(item)}
        />

        {/* Footer pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-[#4D4635]/30 pt-4">
          <span className="text-[10px] text-[#D0C5AF]/40">
            {items.length === 0
              ? 'Không có ảnh nào'
              : `Trang ${currentPage} · ${items.length} ảnh trong trang này`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 rounded-sm border border-[#4D4635]/30 px-3 py-1 text-[10px] text-[#D0C5AF]/50 transition-colors hover:text-[#F2CA50] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" />
              Trước
            </button>
            <span className="px-2 text-[10px] text-[#D0C5AF]/60">
              Trang {currentPage}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!hasNext}
              className="flex items-center gap-1 rounded-sm border border-[#4D4635]/30 px-3 py-1 text-[10px] text-[#D0C5AF]/50 transition-colors hover:text-[#F2CA50] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Drawer chi tiết (chỉ mount khi có item) */}
      <MediaDetailDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onDeleted={handleItemDeleted}
      />
    </div>
  );
}
