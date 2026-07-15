'use client';

/**
 * clientResize — Client-side image resize + convert sang webp TRƯỚC khi upload.
 *
 * Mục đích: giảm bandwidth ~70% khi admin upload ảnh sản phẩm từ smartphone.
 *   - Ảnh gốc smartphone: 3-8 MB, 3000-4000 px (heic/jpeg).
 *   - Sau resize:         200-500 KB, ≤1600 px (webp).
 *   - Không cần server xử lý, không cần sharp, không cần worker.
 *
 * Tại sao CHỌN các tham số mặc định:
 *   - `maxDimension = 1600`:
 *       + Đủ cho PDP zoom 2x trên màn retina 1x (chuẩn Apple) và 1x trên 2x.
 *       + Ảnh 3000+ px gốc không mang thêm chi tiết mà mắt user nhìn được ở PDP —
 *         chỉ tốn byte và làm chậm CDN/LCP. 1600 px là sweet spot cho trang
 *         thương mại trang sức.
 *   - `quality = 0.85`:
 *       + Webp ở 0.85 giữ được chi tiết kim loại/đá quý (facet, vân) trong khi
 *         giảm dung lượng 60-80% so với jpeg gốc. Dưới 0.8 bắt đầu thấy ringing
 *         quanh cạnh sắc nét — không chấp nhận được với jewelry.
 *   - `mimeType = 'image/webp'`:
 *       + Support toàn bộ evergreen browser (Chrome/Firefox/Safari 14+/Edge).
 *       + Cùng dung lượng, webp cho chất lượng tốt hơn jpeg ở cùng bitrate.
 *       + Nếu cần fallback (vd Safari cũ), caller truyền `mimeType: 'image/jpeg'`.
 *
 * Edge cases đã handle:
 *   - Ảnh nhỏ hơn 1600 px (vd screenshot) → KHÔNG upscale, giữ nguyên kích thước
 *     gốc. Upscale chỉ phình file, không tăng chi tiết thật.
 *   - File không phải ảnh / corrupt → throw Error với message rõ ràng.
 *   - Sử dụng `createImageBitmap` (nhanh, decode off main thread) khi có, fallback
 *     về `<img>` + `URL.createObjectURL` cho browser cũ.
 *   - Cleanup `objectURL` ngay sau khi `drawImage` xong để tránh memory leak
 *     (mobile Safari rất dễ OOM nếu giữ nhiều blob URL cùng lúc).
 *
 * Không có dependency ngoài. Dùng Canvas API thuần, chạy hoàn toàn trên client.
 */

export interface ResizeOptions {
  /** Cạnh dài nhất (px) sau khi resize. Mặc định 1600. */
  maxDimension?: number;
  /** Chất lượng encode 0-1. Mặc định 0.85. */
  quality?: number;
  /** MIME đầu ra. Mặc định 'image/webp'. */
  mimeType?: 'image/webp' | 'image/jpeg';
}

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.85;
const DEFAULT_MIME: 'image/webp' = 'image/webp';

/**
 * Load ảnh từ File thành ImageBitmap (ưu tiên) hoặc HTMLImageElement (fallback).
 * Throw nếu file không phải ảnh hợp lệ.
 */
async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to img-element path bên dưới.
    }
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('File không phải ảnh hợp lệ hoặc bị lỗi (corrupt).'));
    };
    img.src = url;
  }) as unknown as ImageBitmap;
}

/**
 * Resize ảnh client-side về webp/jpeg, giảm bandwidth trước khi upload.
 *
 * @param file      File ảnh gốc từ `<input type="file">` hoặc drag-drop.
 * @param options   Tuỳ chọn resize (xem {@link ResizeOptions}).
 * @returns         Blob đã được resize + encode.
 *
 * @example
 *   const blob = await resizeImage(file);
 *   const fd = new FormData();
 *   fd.append('file', blob, 'image.webp');
 *   await fetch('/api/upload', { method: 'POST', body: fd });
 */
export async function resizeImage(
  file: File,
  options?: ResizeOptions
): Promise<Blob> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const mimeType = options?.mimeType ?? DEFAULT_MIME;

  if (!file || !(file instanceof Blob)) {
    throw new Error('resizeImage: tham số đầu vào không phải File hợp lệ.');
  }
  if (maxDimension <= 0) {
    throw new Error('resizeImage: maxDimension phải > 0.');
  }
  if (quality < 0 || quality > 1) {
    throw new Error('resizeImage: quality phải nằm trong [0, 1].');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await loadImageBitmap(file);
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Không đọc được ảnh: ${err.message}`
        : 'Không đọc được ảnh (lỗi không xác định).'
    );
  }

  const { width: srcW, height: srcH } = bitmap;
  if (srcW <= 0 || srcH <= 0) {
    bitmap.close?.();
    throw new Error('Ảnh có kích thước 0 px — file có thể bị lỗi.');
  }

  // Chỉ scale khi ảnh gốc lớn hơn maxDimension. Ảnh nhỏ hơn GIỮ NGUYÊN
  // (không upscale) để tránh phình file vô ích.
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    throw new Error('Trình duyệt không hỗ trợ Canvas 2D context.');
  }

  // imageSmoothingEnabled = true (mặc định) cho resize mượt, jewelry cần
  // giữ chi tiết kim loại không bị blocky.
  ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, dstW, dstH);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality);
  });

  if (!blob) {
    throw new Error(`Encode ${mimeType} thất bại — trình duyệt có thể không hỗ trợ.`);
  }
  return blob;
}

/**
 * Format bytes thành chuỗi human-readable cho UI (vd preview trước/sau resize).
 *
 * @example
 *   formatBytes(850_000)  // "830 KB"
 *   formatBytes(1_234_567) // "1.2 MB"
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  // 1 decimal cho KB/MB, không decimal cho GB+ (vì thường là server/admin case).
  const decimals = unitIndex >= 2 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Đọc kích thước ảnh gốc (trước khi resize) — dùng để log/debug UI.
 * Không throw; trả về `{ width: 0, height: 0 }` nếu file lỗi.
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await loadImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close?.();
    return { width, height };
  } catch {
    return { width: 0, height: 0 };
  }
}
