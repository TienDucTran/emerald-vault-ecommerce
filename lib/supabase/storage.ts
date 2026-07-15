/**
 * storage — Server-side helper để thao tác với Supabase Storage bucket `jewelry-images`.
 *
 * Dùng trong Route Handler / Server Action (KHÔNG dùng ở Client Component):
 *   - Upload ảnh sản phẩm: `const { publicUrl, path } = await uploadImage(file, { folder: 'products' });`
 *   - Xoá ảnh khi xoá product: `await deleteImage(path);`
 *
 * Hành vi:
 *   - Tạo service-role client qua `createAdminClient()` (bypass RLS) để có quyền write Storage.
 *   - Target bucket: `jewelry-images` (public, tạo thủ công trên dashboard — repo không dùng Supabase CLI).
 *   - KHÔNG kiểm tra quyền ở đây: caller (route handler) phải tự gọi `requireAdmin()` trước
 *     rồi mới gọi helper. Tách authz ra khỏi helper giúp helper tái sử dụng được cho các job
 *     nền (cron import, seeder...) mà không phụ thuộc session.
 *
 * Lưu ý:
 *   - Chỉ dùng trong server context. TUYỆT ĐỐI KHÔNG import trong Client Component
 *     vì bundle sẽ kéo theo `supabase-admin` (service-role key).
 *   - Ảnh coi như immutable → set `cacheControl: 31536000` (1 năm) để tận dụng CDN cache.
 *     Nếu cần thay ảnh, upload file mới với path mới (UUID khác) thay vì upsert.
 */
import { createAdminClient } from '@/lib/supabase/admin';

/** UUID v4 từ global `crypto` (Node 19+ + mọi browser evergreen). Tránh `node:crypto` vì
 *  Next.js có thể cảnh báo khi bundle cho một số runtime; `globalThis.crypto` thì universal. */
function uuid(): string {
  return globalThis.crypto.randomUUID();
}

const BUCKET = 'jewelry-images';
const DEFAULT_FOLDER = 'products';
const CACHE_CONTROL = '31536000';

/** Map contentType → extension. Mặc định `bin` nếu không nhận dạng được. */
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

export interface UploadOptions {
  /** Folder con trong bucket (vd: 'products', 'categories'). Mặc định `'products'`. */
  folder?: string;
  /** Tên file tuỳ chỉnh (không kèm folder). Nếu bỏ trống sẽ dùng UUID v4. */
  filename?: string;
  /** MIME type. Nếu bỏ trống sẽ suy ra từ `File.type` hoặc để Supabase tự detect. */
  contentType?: string;
}

export interface UploadResult {
  /** URL public để dùng trong `<img src>`, `next/image`, DB... */
  publicUrl: string;
  /** Path trong bucket (vd: `products/abc-123.webp`) — lưu lại để xoá sau. */
  path: string;
}

/** Lấy extension từ contentType hoặc filename. Trả về `undefined` nếu không đoán được. */
function inferExtension(contentType?: string, filename?: string): string | undefined {
  if (contentType) {
    const ct = contentType.toLowerCase().split(';')[0].trim();
    if (EXT_BY_CONTENT_TYPE[ct]) return EXT_BY_CONTENT_TYPE[ct];
  }
  if (filename) {
    const m = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (m) return m[1].toLowerCase();
  }
  return undefined;
}

/** Lấy MIME type hợp lý, fallback `application/octet-stream` (Supabase yêu cầu string). */
function inferContentType(file: File | Blob, override?: string): string {
  if (override) return override;
  if (file instanceof File && file.type) return file.type;
  return 'application/octet-stream';
}

/**
 * Upload một file ảnh lên bucket `jewelry-images` và trả về public URL + path.
 *
 * Path tự generate: `{folder}/{uuid-v4}.{ext}` (trừ khi truyền `options.filename`).
 * Caller có trách nhiệm lưu `path` vào DB để dùng cho `deleteImage` sau này.
 *
 * Throw Error nếu upload fail. Message gồm statusCode + error code từ Supabase
 * để dễ debug (vd: "Storage upload failed [409 duplicate]: ...").
 */
export async function uploadImage(
  file: File | Blob,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const folder = options.folder ?? DEFAULT_FOLDER;
  const ext = inferExtension(options.contentType, options.filename);
  const baseName = options.filename ?? uuid();
  const safeName = options.filename
    ? // nếu caller truyền filename, strip extension vì ta tự gắn ext ở dưới
      baseName.replace(/\.[^./\\]+$/, '')
    : baseName;
  const finalName = ext ? `${safeName}.${ext}` : safeName;
  const path = `${folder}/${finalName}`;
  const contentType = inferContentType(file, options.contentType);

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType,
      upsert: false,
      cacheControl: CACHE_CONTROL,
    });

  if (error) {
    const status = (error as { statusCode?: string }).statusCode;
    const code = (error as { error?: string }).error ?? error.name;
    throw new Error(
      `Storage upload failed${status ? ` [${status}]` : ''}${code ? ` ${code}` : ''}: ${error.message}`
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

/**
 * Xoá một object trong bucket theo `path` (vd: `products/abc-123.webp`).
 *
 * Dùng để cleanup khi xoá product hoặc khi upload fail giữa chừng.
 * Throw Error nếu delete fail. Không throw nếu object không tồn tại (Supabase
 * coi đó là success trong Storage API — tránh bug khó truy khi cleanup retry).
 */
export async function deleteImage(path: string): Promise<void> {
  if (!path) {
    throw new Error('Storage delete failed: path is empty');
  }

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    const status = (error as { statusCode?: string }).statusCode;
    const code = (error as { error?: string }).error ?? error.name;
    throw new Error(
      `Storage delete failed${status ? ` [${status}]` : ''}${code ? ` ${code}` : ''}: ${error.message}`
    );
  }
}
