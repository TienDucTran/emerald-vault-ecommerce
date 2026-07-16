'use client';

/**
 * MediaUploadDropzone — Kéo thả / chọn nhiều ảnh để upload lên Supabase Storage.
 *
 * Flow:
 *   1. User kéo thả hoặc click chọn file(s).
 *   2. Validate từng file (type image/*, size ≤ 10MB). File lỗi → toast.error, bỏ qua.
 *   3. File hợp lệ → thêm vào progress list, resize sang webp 1600px q=0.85 bằng
 *      `resizeImage` từ `@/lib/image/client-resize` (giảm ~70% bandwidth).
 *   4. POST FormData { file, folder } đến `/api/admin/uploads`. Response shape:
 *      `{ ok: true, publicUrl, path, size, type }`.
 *   5. Cập nhật status per-entry (resizing → uploading → done/failed). Toast per file.
 *   6. Khi tất cả xong → gọi `onUploadComplete(successCount)`.
 *
 * Concurrency:
 *   - Tối đa 3 file upload đồng thời (semaphore pattern) để tránh hammer server khi
 *     admin drop 20 ảnh một lúc. Resize cũng count vào concurrency vì CPU-heavy.
 *   - Dùng `Promise.allSettled` cho từng worker slot để lỗi 1 file không kill cả batch.
 *
 * UX:
 *   - Mỗi entry có nút X để remove (chỉ cho pending/failed — không cancel upload đang chạy
 *     vì phức tạp không tương xứng, entry tự chuyển sang done/failed).
 *   - "Clear all" khi list không rỗng (xóa mọi entry; dropzone hiện lại).
 *   - Hiển thị "% smaller" badge khi resize tiết kiệm được byte.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';

import { formatBytes, resizeImage } from '@/lib/image/client-resize';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast/toast-store';

export interface MediaUploadDropzoneProps {
  folder?: 'products' | 'categories' | 'collections' | 'banners';
  onUploadComplete?: (successCount: number) => void;
}

type UploadStatus =
  | 'pending'
  | 'resizing'
  | 'uploading'
  | 'done'
  | 'failed';

interface UploadEntry {
  id: string;
  filename: string;
  originalSize: number;
  resizedSize?: number;
  status: UploadStatus;
  error?: string;
  publicUrl?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CONCURRENT = 3;

const glassStyle: React.CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};

function genId(): string {
  return `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Semaphore đơn giản: giới hạn số promise chạy đồng thời.
 * `slots` giảm khi worker vào, tăng khi worker xong.
 */
function createSemaphore(max: number) {
  let active = 0;
  const waiters: Array<() => void> = [];
  const acquire = () =>
    new Promise<void>((resolve) => {
      if (active < max) {
        active++;
        resolve();
        return;
      }
      waiters.push(() => {
        active++;
        resolve();
      });
    });
  const release = () => {
    active = Math.max(0, active - 1);
    const next = waiters.shift();
      if (next) next();
  };
  return { acquire, release };
}

export function MediaUploadDropzone(
  props: MediaUploadDropzoneProps
): JSX.Element {
  const { folder = 'products', onUploadComplete } = props;
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Patch một entry theo id — dùng updater function để tránh stale closure khi
   * nhiều file upload song song.
   */
  const updateEntry = useCallback(
    (id: string, patch: Partial<UploadEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  /**
   * Validate 1 file: type + size. Trả về error message string nếu invalid, null nếu OK.
   */
  const validateFile = useCallback((file: File): string | null => {
    if (!file.type || !file.type.startsWith('image/')) {
      return 'Không phải file ảnh';
    }
    if (file.size <= 0) {
      return 'File rỗng';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Quá ${formatBytes(MAX_FILE_SIZE)} (${formatBytes(file.size)})`;
    }
    return null;
  }, []);

  /**
   * Upload 1 file (sau khi đã acquire semaphore slot). Không throw — mọi lỗi đã
   * được map sang status + toast ở đây.
   */
  const processFile = useCallback(
    async (entry: UploadEntry, originalFile: File, slot: ReturnType<typeof createSemaphore>) => {
      try {
        // Bước 1: resize
        updateEntry(entry.id, { status: 'resizing' });
        const blob = await resizeImage(originalFile);
        const resizedSize = blob.size;

        // Bước 2: upload
        updateEntry(entry.id, { status: 'uploading', resizedSize });

        const fd = new FormData();
        // Bytes là webp đã resize (bandwidth), nhưng giữ tên gốc + extension gốc để
        // server derive lại `filename` + `contentType` → path storage phản ánh file gốc.
        // Server đọc `originalName`/`originalType` để biết MIME/extension gốc.
        fd.append('file', blob, entry.filename);
        fd.append('folder', folder);
        fd.append('originalName', originalFile.name);
        fd.append('originalType', originalFile.type || 'application/octet-stream');

        const res = await fetch('/api/admin/uploads', {
          method: 'POST',
          body: fd,
        });
        const json = (await res.json().catch(() => null)) as
          | { ok: true; publicUrl: string; path: string; size: number; type: string }
          | { ok: false; error?: string; message?: string }
          | null;

        if (!res.ok || !json || !('ok' in json) || !json.ok) {
          const msg =
            (json && 'message' in json && json.message) ||
            (json && 'error' in json && json.error) ||
            `HTTP ${res.status}`;
          throw new Error(msg);
        }

        updateEntry(entry.id, {
          status: 'done',
          publicUrl: json.publicUrl,
        });
        toast.success(`Đã upload ${entry.filename}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
        updateEntry(entry.id, { status: 'failed', error: msg });
        toast.error(`Upload ${entry.filename} thất bại: ${msg}`);
      } finally {
        slot.release();
      }
    },
    [folder, updateEntry]
  );

  /**
   * Hàm chính: nhận danh sách File từ input/drop, validate, khởi tạo entries,
   * chạy qua semaphore với MAX_CONCURRENT worker.
   */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      // Validate trước → tạo entry mới cho file hợp lệ, toast lỗi cho file invalid.
      const newEntries: Array<{ entry: UploadEntry; file: File }> = [];
      for (const file of list) {
        const err = validateFile(file);
        if (err) {
          toast.error(`${file.name}: ${err}`);
          continue;
        }
        const entry: UploadEntry = {
          id: genId(),
          filename: file.name,
          originalSize: file.size,
          status: 'pending',
        };
        newEntries.push({ entry, file });
      }

      if (newEntries.length === 0) return;

      // Append entry mới (giữ entry cũ nếu có).
      setEntries((prev) => [
        ...prev,
        ...newEntries.map((n) => n.entry),
      ]);

      // Semaphore + worker pool. Dùng allSettled để từng file tự xử lý lỗi riêng.
      const slot = createSemaphore(MAX_CONCURRENT);
      await Promise.allSettled(
        newEntries.map(async ({ entry, file }) => {
          await slot.acquire();
          // Không await tiếp — worker chạy nền, slot sẽ được release trong finally.
          void processFile(entry, file, slot);
        })
      );
    },
    [processFile, validateFile]
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      // Nếu list trống, reset luôn drag state cho sạch.
      if (next.length === 0) {
        setIsDragging(false);
      }
      // CompletionWatcher sẽ tự notify onUploadComplete khi còn lại settle.
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files);
        // Reset value để user chọn lại cùng file vẫn trigger onChange.
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        void handleFiles(files);
      }
    },
    [handleFiles]
  );

  const onClickArea = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Tính "% smaller" cho 1 entry
  const percentSmaller = (e: UploadEntry): number | null => {
    if (e.resizedSize == null) return null;
    const saved = e.originalSize - e.resizedSize;
    if (saved <= 0) return null;
    return Math.round((saved / e.originalSize) * 100);
  };

  const hasEntries = entries.length > 0;

  return (
    <section
      className="rounded-sm p-6"
      style={glassStyle}
      aria-label="Upload media mới"
    >
      {/* Label */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-xs tracking-[0.2em] text-[#D0C5AF]/80 uppercase">
          Upload mới
        </h2>
        {hasEntries && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-sm border border-[#4D4635]/40 px-2 py-1 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/60 transition-colors hover:border-[#F2CA50]/40 hover:text-[#F2CA50]"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Hidden input — luôn tồn tại để click dropzone mở picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={onInputChange}
        className="hidden"
        aria-hidden
      />

      {/* Dropzone — chỉ render khi không có entry (sau khi clear, dropzone hiện lại) */}
      {!hasEntries ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onClickArea}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClickArea();
            }
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-sm py-10 text-center transition-colors',
            'border-2 border-dashed',
            isDragging
              ? 'border-[#F2CA50] bg-[#F2CA50]/5'
              : 'border-[#4D4635]/60 bg-[#0D1117]/30 hover:border-[#F2CA50]/60 hover:bg-[#0D1117]/50'
          )}
        >
          <Upload
            className={cn(
              'h-10 w-10 transition-colors',
              isDragging ? 'text-[#F2CA50]' : 'text-[#D0C5AF]/50'
            )}
          />
          <div>
            <p className="text-sm text-[#D0C5AF]">
              Kéo thả ảnh vào đây hoặc click để chọn
            </p>
            <p className="mt-1 text-xs text-[#D0C5AF]/50">
              Tối đa 10MB mỗi file, hỗ trợ JPG/PNG/WebP
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Compact add-more row (vẫn cho phép thêm file khi list đang chạy) */}
          <div
            onClick={onClickArea}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClickArea();
              }
            }}
            className={cn(
              'flex cursor-pointer items-center justify-center gap-2 rounded-sm py-3 text-center transition-colors',
              'border border-dashed',
              isDragging
                ? 'border-[#F2CA50] bg-[#F2CA50]/5'
                : 'border-[#4D4635]/50 bg-[#0D1117]/20 hover:border-[#F2CA50]/50'
            )}
          >
            <Upload className="h-4 w-4 text-[#D0C5AF]/60" />
            <span className="text-xs text-[#D0C5AF]/70">
              Thêm ảnh (kéo thả hoặc click)
            </span>
          </div>

          {/* Per-file progress list */}
          <ul className="divide-y divide-[#4D4635]/30 rounded-sm border border-[#4D4635]/30 bg-[#0D1117]/30">
            {entries.map((e) => {
              const saved = percentSmaller(e);
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <ImageIcon className="h-4 w-4 shrink-0 text-[#D0C5AF]/50" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs text-[#D0C5AF]"
                      title={e.filename}
                    >
                      {e.filename}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#D0C5AF]/50">
                      {formatBytes(e.originalSize)}
                      {e.resizedSize != null && (
                        <>
                          {' → '}
                          <span className="text-[#D0C5AF]/70">
                            {formatBytes(e.resizedSize)}
                          </span>
                        </>
                      )}
                      {saved != null && (
                        <span className="ml-2 inline-flex items-center rounded-sm border border-[#F2CA50]/40 bg-[#F2CA50]/10 px-1.5 py-0.5 text-[9px] font-heading tracking-wider text-[#F2CA50] uppercase">
                          -{saved}%
                        </span>
                      )}
                    </p>
                  </div>
                  <StatusBadge entry={e} />
                  <button
                    type="button"
                    onClick={() => removeEntry(e.id)}
                    disabled={
                      e.status === 'resizing' || e.status === 'uploading'
                    }
                    aria-label={`Xoá ${e.filename}`}
                    className="rounded-sm p-1 text-[#D0C5AF]/40 transition-colors hover:bg-[#4D4635]/30 hover:text-[#D0C5AF] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Hidden effect: notify onUploadComplete khi tất cả entry settle.
          Dùng ref-pattern thông qua callback setEntries để cover trường hợp
          setEntries từ processFile (không gọi maybeNotifyComplete trực tiếp
          vì không có quyền truy cập next state đã commit ở đó). */}
      <CompletionWatcher
        entries={entries}
        onAllDone={(count) => onUploadComplete?.(count)}
      />
    </section>
  );
}

function StatusBadge({ entry }: { entry: UploadEntry }): JSX.Element {
  const base =
    'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-heading tracking-[0.1em] uppercase';
  switch (entry.status) {
    case 'pending':
      return (
        <span className={cn(base, 'border border-[#4D4635]/40 text-[#D0C5AF]/50')}>
          Chờ
        </span>
      );
    case 'resizing':
      return (
        <span
          className={cn(
            base,
            'border border-[#4D4635]/60 bg-[#4D4635]/20 text-[#D0C5AF]'
          )}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Resizing…
        </span>
      );
    case 'uploading':
      return (
        <span
          className={cn(
            base,
            'border border-[#F2CA50]/40 bg-[#F2CA50]/10 text-[#F2CA50]'
          )}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Uploading…
        </span>
      );
    case 'done':
      return (
        <span
          className={cn(
            base,
            'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          )}
        >
          Done ✓
        </span>
      );
    case 'failed':
      return (
        <span
          className={cn(
            base,
            'border border-red-500/40 bg-red-500/10 text-red-400'
          )}
          title={entry.error}
        >
          Failed
        </span>
      );
  }
}

/**
 * Component phụ: dùng effect để theo dõi entries; khi tất cả settle (không còn
 * pending/resizing/uploading) và có ít nhất 1 done → gọi onAllDone với count.
 * Tách ra để tránh đặt effect trong component chính (dễ vướng stale closure).
 *
 * Dùng ref để guard: chỉ fire một lần cho mỗi "batch" — khi số running chuyển
 * từ >0 về 0, mới notify. Reset guard khi batch mới bắt đầu (running > 0).
 */
function CompletionWatcher({
  entries,
  onAllDone,
}: {
  entries: UploadEntry[];
  onAllDone: (successCount: number) => void;
}) {
  const running = entries.filter(
    (e) =>
      e.status === 'pending' || e.status === 'resizing' || e.status === 'uploading'
  ).length;
  const doneCount = entries.filter((e) => e.status === 'done').length;
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (running > 0) {
      // Batch mới bắt đầu → reset guard để fire lại khi settle.
      notifiedRef.current = false;
      return;
    }
    if (running === 0 && doneCount > 0 && !notifiedRef.current) {
      notifiedRef.current = true;
      onAllDone(doneCount);
    }
  }, [running, doneCount, onAllDone]);

  return null;
}
