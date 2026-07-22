/**
 * storage — Server-side helper để thao tác với Supabase Storage bucket `jewelry-images`.
 *
 * Dùng trong Route Handler / Server Action (KHÔNG dùng ở Client Component):
 *   - Upload ảnh sản phẩm: `const { publicUrl, path } = await uploadImage(file, { folder: 'products', filename: 'Bông tai Sapphire.jpg' });`
 *   - Xoá ảnh khi xoá product: `await deleteImage(path);`
 *
 * Hành vi:
 *   - Tạo service-role client qua `createAdminClient()` (bypass RLS) để có quyền write Storage.
 *   - Target bucket: `jewelry-images` (public, tạo thủ công trên dashboard — repo không dùng Supabase CLI).
 *   - KHÔNG kiểm tra quyền ở đây: caller (route handler) phải tự gọi `requireAdmin()` trước
 *     rồi mới gọi helper. Tách authz ra khỏi helper giúp helper tái sử dụng được cho các job
 *     nền (cron import, seeder...) mà không phụ thuộc session.
 *
 * Chính sách filename:
 *   - `options.filename` được coi là **tên hiển thị** (có/không có extension đều OK). Server sẽ:
 *       1. Strip extension cuối (vd: `IMG.2024.01.jpg` → `IMG.2024.01`).
 *       2. Slugify: lowercase, bỏ dấu Việt tổ hợp (NFD), `đ/Đ` → `d`, non-alphanumeric → `-`,
 *          trim leading/trailing `-`. Fallback `'image'` nếu rỗng.
 *       3. Luôn gắn `.webp` (client `resizeImage` luôn convert sang webp).
 *   - Nếu `filename` không truyền → fallback UUID v4 (giữ nguyên hành vi cũ cho batch jobs).
 *   - Chống ghi đè: trước khi upload, list folder tìm suffix nhỏ nhất `N` (0, 1, 2, ...)
 *     sao cho `${slug}-${N === 0 ? '' : N}.webp` chưa tồn tại. Nếu vẫn trùng do race condition
 *     (giữa list và upload có request khác cũng land cùng slug), retry tối đa 3 lần với N tăng dần.
 *
 * Lưu ý:
 *   - Chỉ dùng trong server context. TUYỆT ĐỐI KHÔNG import trong Client Component
 *     vì bundle sẽ kéo theo `supabase-admin` (service-role key).
 *   - Ảnh coi như immutable → set `cacheControl: 31536000` (1 năm) để tận dụng CDN cache.
 *     Nếu cần thay ảnh, upload file mới với path mới (UUID/slug khác) thay vì upsert.
 *   - List call dùng `limit: 1000`; nếu folder có >1000 object sẽ có cảnh báo trong console
 *     và có thể miss collision (chấp nhận cho MVP — production nên dùng DB unique index hoặc
 *     random suffix thay vì list-scan).
 */
import { createAdminClient } from '@/lib/supabase/admin';

/** UUID v4 từ global `crypto` (Node 19+ + mọi browser evergreen). Tránh `node:crypto` vì
 *  Next.js có thể cảnh báo khi bundle cho một số runtime; `globalThis.crypto` thì universal. */
function uuid(): string {
  return globalThis.crypto.randomUUID();
}

export const BUCKET = 'jewelry-images';
export const DEFAULT_FOLDER = 'products';
export const CACHE_CONTROL = '31536000';

/** Client-side `resizeImage` luôn convert sang webp, nên server không cần suy extension
 *  từ content type nữa. Hard-code ở đây để đảm bảo path luôn khớp với bytes. */
const TARGET_EXT = 'webp';
const DEFAULT_CONTENT_TYPE = 'image/webp';
/** Cap list size khi scan collision. Vượt ngưỡng sẽ log warning + chấp nhận miss. */
const LIST_SCAN_LIMIT = 1000;
/** Số lần retry khi upload bị race-condition duplicate (giữa list và upload). */
const RACE_RETRY_MAX = 3;

export interface UploadOptions {
  /** Folder con trong bucket (vd: 'products', 'categories'). Mặc định `'products'`. */
  folder?: string;
  /** Tên file gốc (có hoặc không có extension đều OK — server sẽ strip ext, slugify stem,
   *  rồi gắn `.webp`). Nếu bỏ trống sẽ dùng UUID v4. */
  filename?: string;
  /** MIME type override. Mặc định `'image/webp'` (vì client đã convert sang webp). */
  contentType?: string;
}

export interface UploadResult {
  /** URL public để dùng trong `<img src>`, `next/image`, DB... */
  publicUrl: string;
  /** Path trong bucket (vd: `products/bong-tai-sapphire.webp`) — lưu lại để xoá sau. */
  path: string;
}

/**
 * Slugify một chuỗi thành kebab-case ASCII an toàn cho URL/path.
 *  - Lowercase + NFD strip diacritics (xử lý `â`, `ê`, `ô`, `ư`...).
 *  - `đ/Đ` → `d` (riêng vì NFD không tách được).
 *  - Non-alphanumeric liên tiếp → 1 dấu `-`; trim leading/trailing `-`.
 *  - Trả về `''` nếu chuỗi rỗng sau khi strip (vd: `'   '`) — caller sẽ fallback.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[đĐ]/g, 'd') // đ/Đ không tách được qua NFD
    .replace(/[^a-z0-9]+/g, '-') // mọi ký tự không phải [a-z0-9] (kể cả `.`, `/`, khoảng trắng, unicode còn sót) → `-`
    .replace(/^-+|-+$/g, ''); // trim leading/trailing `-`
}

/**
 * List object trong folder và trả về `Set<string>` tên file (chỉ basename, không kèm folder).
 * Log warning nếu đụng `limit` vì có thể miss collision ngoài tầm scan.
 */
async function listFolderNames(folder: string): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: LIST_SCAN_LIMIT });

  if (error) {
    // List fail không nên block upload — coi như folder rỗng (sẽ tự upsert thử và nhờ
    // race-retry xử lý nếu trùng). Log để debug.
    console.warn(
      `[storage] list("${folder}") failed (${error.message}); falling back to empty set`
    );
    return new Set();
  }

  if (data && data.length >= LIST_SCAN_LIMIT) {
    console.warn(
      `[storage] list("${folder}") hit limit=${LIST_SCAN_LIMIT}; collision scan có thể miss ngoài tầm`
    );
  }

  return new Set(
    ((data ?? []) as Array<{ name: string | null }>)
      .map((obj) => obj.name)
      .filter((n): n is string => !!n)
  );
}

/**
 * Tìm suffix nhỏ nhất `N >= 0` sao cho `${slug}${N === 0 ? '' : `-${N}`}.${TARGET_EXT}` chưa có trong `existing`.
 * Một pass qua set, dừng sớm khi gặp slot trống đầu tiên.
 */
function findNextAvailableSuffix(
  slug: string,
  existing: Set<string>
): { name: string; suffix: number } {
  // Thử N=0 trước (không có suffix) — trường hợp phổ biến nhất khi folder mới/ít file.
  for (let n = 0; n <= RACE_RETRY_MAX + 1000; n++) {
    const name = n === 0 ? `${slug}.${TARGET_EXT}` : `${slug}-${n}.${TARGET_EXT}`;
    if (!existing.has(name)) {
      return { name, suffix: n };
    }
  }
  // Về lý thuyết không bao giờ tới đây (LIST_SCAN_LIMIT cap), nhưng TS cần return.
  const fallback = `${slug}-${Date.now()}.${TARGET_EXT}`;
  return { name: fallback, suffix: -1 };
}

/**
 * Upload một file ảnh lên bucket `jewelry-images` và trả về public URL + path.
 *
 * Path tự generate: `{folder}/{slugified-name}.webp` (hoặc `-{N}.webp` nếu trùng).
 * `options.filename` (nếu có) sẽ được strip extension + slugify.
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

  // 1. Tính stem từ `options.filename` (strip ext) hoặc fallback UUID.
  const rawStem = options.filename
    ? options.filename.replace(/\.[^./\\]+$/, '')
    : uuid();

  // 2. Slugify stem; fallback `'image'` nếu kết quả rỗng (vd: tên toàn unicode đã strip hết).
  const slug = slugify(rawStem) || 'image';

  // 3. Content type mặc định webp vì client đã convert; override nếu caller truyền.
  const contentType = options.contentType || DEFAULT_CONTENT_TYPE;

  // 4. Collision check: list folder một lần, tìm suffix nhỏ nhất chưa dùng.
  const existing = await listFolderNames(folder);
  const { name: resolvedName } = findNextAvailableSuffix(slug, existing);

  // 5. Upload với retry nếu vẫn trúng race condition (slot vừa chọn bị chiếm giữa list và upload).
  const supabase = createAdminClient();
  let attempt = 0;
  let lastError: Error | undefined;
  let currentName = resolvedName;

  while (attempt <= RACE_RETRY_MAX) {
    const path = `${folder}/${currentName}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType,
        upsert: false,
        cacheControl: CACHE_CONTROL,
      });

    if (!error) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { publicUrl: data.publicUrl, path };
    }

    const status = (error as { statusCode?: string }).statusCode;
    const code = (error as { error?: string }).error ?? error.name;
    lastError = new Error(
      `Storage upload failed${status ? ` [${status}]` : ''}${code ? ` ${code}` : ''}: ${error.message}`
    );

    // Chỉ retry khi lỗi duplicate (409). Các lỗi khác (auth, network, 5xx...) thì fail ngay.
    const isDuplicate = status === '409' || /duplicate|already exists/i.test(error.message);
    if (!isDuplicate || attempt === RACE_RETRY_MAX) {
      throw lastError;
    }

    attempt += 1;
    // Tăng suffix lên `attempt` bước kể từ suffix gốc, rồi thử lại.
    // Tính tên mới bằng cách scan existing + các tên đã thử trong vòng này.
    const tried = new Set<string>([currentName]);
    let nextSuffix = -1;
    for (let n = 0; n <= LIST_SCAN_LIMIT + 1000; n++) {
      const candidate = n === 0 ? `${slug}.${TARGET_EXT}` : `${slug}-${n}.${TARGET_EXT}`;
      if (!existing.has(candidate) && !tried.has(candidate)) {
        nextSuffix = n;
        break;
      }
    }
    if (nextSuffix < 0) {
      // Hết slot trong tầm scan — thử timestamp để chắc chắn không trùng.
      currentName = `${slug}-${Date.now()}-${attempt}.${TARGET_EXT}`;
    } else {
      currentName =
        nextSuffix === 0 ? `${slug}.${TARGET_EXT}` : `${slug}-${nextSuffix}.${TARGET_EXT}`;
    }
  }

  // Không tới đây trong flow bình thường, nhưng TS cần exhaustiveness.
  throw lastError ?? new Error('Storage upload failed: unknown error');
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
