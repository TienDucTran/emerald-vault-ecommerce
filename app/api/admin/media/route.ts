// GET  /api/admin/media
//   Query: ?search=&folder=&limit=&offset=&sort=
//     - search: filter filename contains (case-insensitive)
//     - folder: folder con trong bucket (vd: 'products', 'categories').
//           Mặc định 'products' (nơi mọi upload từ product form / dropzone đổ về).
//           Bỏ trống = root.
//     - limit : 1-200, default 50
//     - offset: >= 0,    default 0
//     - sort  : 'created_desc' | 'created_asc' | 'size_desc' | 'name_asc'
//               default 'created_desc'
//   Response 200: { ok: true, items: MediaItem[], total, limit, offset }
//   Response 4xx: { ok: false, error, details? }
//
// DELETE /api/admin/media
//   Body: { paths: string[] } — danh sách storage path cần xoá (vd: ["products/abc.webp"]).
//     - paths: 1-50 phần tử, mỗi phần tử là string non-empty.
//   Hành vi:
//     - Trước khi xoá, check usage bằng 1 query products (image_url + gallery).
//       Nếu BẤT KỲ path nào đang được product tham chiếu → 400 IN_USE, KHÔNG xoá gì cả (atomic).
//     - Nếu tất cả orphan → xoá từng path qua deleteImage (idempotent).
//     - Nếu xoá partial fail → 500 DELETE_FAILED + failedPaths.
//   Response 200: { ok: true, deleted: number, paths: string[] }
//   Response 400: { ok: false, error: 'IN_USE' | 'INVALID_BODY' | 'INVALID_JSON',
//                   message, inUsePaths?, details? }
//   Response 500: { ok: false, error: 'DELETE_FAILED' | 'INTERNAL_ERROR', message, failedPaths? }
//
// Lưu ý:
//   - requireAdmin() verify user + role + trả adminClient (service-role, bypass RLS).
//   - Bucket 'jewelry-images' là public, đã tạo bằng migration 0010. Tên bucket
//     được import từ `lib/supabase/storage.ts` (`BUCKET` constant).
//   - StorageObject KHÔNG có field `publicUrl` → phải tự build qua `getPublicUrl(path)`
//     với path = `${folder}/${name}`.
//   - `usageCount` + `usedIn` được tính trong CÙNG response (không phải endpoint riêng)
//     vì UX: drawer chi tiết 1 media item cần hiển thị ngay "đang dùng ở đâu" mà không
//     tốn thêm 1 round-trip. Vì product catalog hiện tại < 200 sp nên load 1 lần là đủ.

import { NextResponse } from 'next/server';
import {
  AuthError,
  authErrorResponse,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET, deleteImage } from '@/lib/supabase/storage';
import type { MediaItem } from '@/components/admin/media/types';
import { z } from 'zod';

// requireAdmin() gọi cookies() → bắt buộc dynamic.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Max số product references trả về trong `usedIn` của mỗi media item. */
const USED_IN_LIMIT = 5;

// ────────────────────────────────────────────────────────────────────────────
// Schema validate query string
// ────────────────────────────────────────────────────────────────────────────

const MediaListQuerySchema = z.object({
  search: z.string().trim().optional(),
  // Lưu ý: dùng `.default('')` thay cho `.optional()` để giữ chuỗi rỗng khi client
  // gửi `folder=` (URLSearchParams.set vẫn ghi ra chuỗi rỗng, không phải undefined).
  // `.trim().optional()` sẽ coi '' là undefined sau trim → không phân biệt được
  // "root" vs "không truyền". `.default('')` giữ nguyên giá trị rỗng → code dùng
  // `query.folder ?? 'products'` xử lý đúng: '' = root, undefined → fallback 'products'.
  folder: z.string().trim().default(''),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z
    .enum(['created_desc', 'created_asc', 'size_desc', 'name_asc'])
    .default('created_desc'),
});

type MediaListQuery = z.infer<typeof MediaListQuerySchema>;

// ────────────────────────────────────────────────────────────────────────────
// Schema validate body cho DELETE
// ────────────────────────────────────────────────────────────────────────────

const MediaDeleteBodySchema = z.object({
  paths: z
    .array(z.string().trim().min(1, 'path không được rỗng'))
    .min(1, 'Cần ít nhất 1 path')
    .max(50, 'Tối đa 50 paths mỗi request'),
});

type MediaDeleteBody = z.infer<typeof MediaDeleteBodySchema>;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** StorageObject trả về từ `supabase.storage.list()` (subset fields ta dùng). */
interface StorageObject {
  id: string | null;
  name: string;
  bucket_id?: string;
  owner?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  last_accessed_at?: string | null;
  metadata?: {
    size?: number;
    mimetype?: string;
    cacheControl?: string;
    [k: string]: unknown;
  } | null;
  version?: string | null;
}

/** Row tối thiểu từ bảng `products` để tính usage. */
interface ProductUsageRow {
  id: string;
  title: string;
  image_url: string | null;
  gallery: string[] | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build `publicUrl` cho 1 storage object.
 *
 * Vì sao tự build: `supabase.storage.list()` chỉ trả metadata, KHÔNG kèm publicUrl
 * (chỉ `getPublicUrl(path)` mới trả). Ta ghép path = `${folder}/${name}` rồi gọi
 * `getPublicUrl` để lấy URL canonical. Nếu object nằm ở root thì `folder` là ''.
 */
function buildPublicUrl(
  supabase: ReturnType<typeof createAdminClient>,
  folder: string,
  name: string
): string {
  const path = folder ? `${folder}/${name}` : name;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Map sort param → `sortBy` config của Supabase storage.list. */
function toStorageSort(
  sort: MediaListQuery['sort']
): { column: string; order: 'asc' | 'desc' } {
  switch (sort) {
    case 'created_asc':
      return { column: 'name', order: 'asc' }; // fallback ổn định
    case 'size_desc':
      return { column: 'name', order: 'desc' }; // size sort qua JS bên dưới
    case 'name_asc':
      return { column: 'name', order: 'asc' };
    case 'created_desc':
    default:
      return { column: 'created_at', order: 'desc' };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    await requireAdmin();

    // 1. Parse + validate query
    const url = new URL(req.url);
    const raw: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      raw[k] = v;
    });

    const parsed = MediaListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_QUERY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const query: MediaListQuery = parsed.data;

    const supabase = createAdminClient();

    // 2. List objects trong bucket
    //
    // `folder ?? DEFAULT_FOLDER` (mặc định 'products' — nơi mọi upload đổ về).
    // Supabase trả `null` (không phải []) nếu folder rỗng/không tồn tại.
    // Lưu ý: storage.list() là NON-RECURSIVE — chỉ list 1 cấp. Để list toàn bộ
    // bucket cần đệ quy hoặc dùng RPC. Hiện tại UI cho chọn 1 folder cụ thể.
    const { data: objects, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(query.folder ?? 'products', {
        limit: query.limit,
        offset: query.offset,
        sortBy: toStorageSort(query.sort),
      });

    if (listError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'STORAGE_LIST_FAILED',
          message: listError.message,
        },
        { status: 500 }
      );
    }

    const safeObjects: StorageObject[] = (objects ?? []) as StorageObject[];

    // 3. Build items kèm publicUrl
    //
    // Vì sao load hết products (1 query) thay vì per-media query (N queries):
    //   - Nhỏ hơn 200 products → 1 SELECT * ~vài chục KB, nhanh hơn N round-trip HTTP.
    //   - Khi products > 1000, chuyển sang per-media `.or()` filter (xem comment ở dưới).
    //   - Trade-off: response phình thêm ~vài chục KB metadata products. Acceptable.
    const { data: productRows, error: productsError } = await supabase
      .from('products')
      .select('id, title, image_url, gallery');

    if (productsError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'PRODUCTS_QUERY_FAILED',
          message: productsError.message,
        },
        { status: 500 }
      );
    }

    const products = (productRows ?? []) as ProductUsageRow[];

    // 4. Build Map<publicUrl, Product[]> để tra cứu O(1) cho từng media item.
    //
    // 1 product có thể match nhiều media (image_url + nhiều gallery entries).
    const usageMap = new Map<string, ProductUsageRow[]>();
    const pushUsage = (url: string | null | undefined, p: ProductUsageRow) => {
      if (!url) return;
      const list = usageMap.get(url);
      if (list) {
        if (!list.some((x) => x.id === p.id)) list.push(p);
      } else {
        usageMap.set(url, [p]);
      }
    };
    for (const p of products) {
      pushUsage(p.image_url, p);
      if (p.gallery && p.gallery.length) {
        for (const g of p.gallery) pushUsage(g, p);
      }
    }

    // 5. Compose items + áp filter search (case-insensitive)
    const searchLower = query.search?.toLowerCase();
    let items: MediaItem[] = safeObjects.map((obj) => {
      const folder = query.folder ?? 'products';
      const publicUrl = buildPublicUrl(supabase, folder, obj.name);
      const path = folder ? `${folder}/${obj.name}` : obj.name;
      const used = usageMap.get(publicUrl) ?? [];

      return {
        id: obj.id ?? obj.name, // fallback nếu StorageObject không có id
        path,
        publicUrl,
        filename: obj.name,
        size: Number(obj.metadata?.size ?? 0),
        contentType: String(obj.metadata?.mimetype ?? 'application/octet-stream'),
        folder,
        createdAt: obj.created_at ?? new Date(0).toISOString(),
        usageCount: used.length,
        usedIn: used.slice(0, USED_IN_LIMIT).map((p) => ({
          id: p.id,
          title: p.title,
        })),
      };
    });

    if (searchLower) {
      items = items.filter((it) =>
        it.filename.toLowerCase().includes(searchLower)
      );
    }

    // Sort bổ sung phía JS (size_desc, name_asc) vì storage.list sortBy theo name
    // không phản ánh đúng ý nghĩa 'size' và 'created_at' không stable khi null.
    if (query.sort === 'size_desc') {
      items.sort((a, b) => b.size - a.size);
    } else if (query.sort === 'name_asc') {
      items.sort((a, b) => a.filename.localeCompare(b.filename));
    } else if (query.sort === 'created_asc') {
      items.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    // 'created_desc' đã được Supabase sort sẵn.

    // 6. Trả response
    //
    // `total` = số item sau filter search (không phải tổng toàn bucket) vì
    // storage.list không trả count tổng. Nếu sau này cần total chính xác, dùng
    // `supabase.rpc('count_objects', { bucket: ... })` hoặc HEAD request.
    return NextResponse.json({
      ok: true,
      items,
      total: items.length,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'INTERNAL_ERROR',
        message: (e as Error)?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Handler: DELETE — xoá 1 hoặc nhiều media items theo path
// ────────────────────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    // 1. Parse + validate body
    //
    // Cần 2 lớp try/catch:
    //   - Ngoài (catch all) → authErrorResponse cho AuthError, 500 cho phần còn lại.
    //   - Trong (bọc req.json) → trả 400 INVALID_JSON nếu body không phải JSON hợp lệ
    //     (mặc định `req.json()` throw SyntaxError — ta muốn message thân thiện).
    let body: MediaDeleteBody;
    try {
      const raw: unknown = await req.json();
      const parsed = MediaDeleteBodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          {
            ok: false,
            error: 'INVALID_BODY',
            message: 'Body không hợp lệ',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }
      body = parsed.data;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 2. Check usage: load 1 lần tất cả products, build Set<publicUrl>.
    //
    // Cách này giống GET: O(1) lookup per path, không cần N round-trip.
    // Nếu products > vài nghìn thì chuyển sang per-path `.or()` filter.
    const { data: productRows, error: productsError } = await supabase
      .from('products')
      .select('id, title, image_url, gallery');

    if (productsError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'PRODUCTS_QUERY_FAILED',
          message: productsError.message,
        },
        { status: 500 }
      );
    }

    const usedUrls = new Set<string>();
    for (const p of (productRows ?? []) as ProductUsageRow[]) {
      if (p.image_url) usedUrls.add(p.image_url);
      if (p.gallery && p.gallery.length) {
        for (const g of p.gallery) usedUrls.add(g);
      }
    }

    // 3. Tính publicUrl cho từng path, đối chiếu với Set usedUrls.
    //
    // `getPublicUrl` không cần network call thật — nó ghép URL từ SUPABASE_URL
    // (env) + path. Nên gọi trong loop là rẻ.
    const pathToUrl = new Map<string, string>();
    for (const p of body.paths) pathToUrl.set(p, buildPublicUrlFromPath(supabase, p));

    const inUsePaths = body.paths.filter((p) =>
      usedUrls.has(pathToUrl.get(p) ?? ''),
    );
    if (inUsePaths.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'IN_USE',
          message: 'Ảnh đang được sử dụng bởi sản phẩm',
          inUsePaths,
        },
        { status: 400 }
      );
    }

    // 4. Tất cả orphan → xoá song song.
    //
    // `deleteImage` idempotent trên path không tồn tại (xem comment trong
    // `lib/supabase/storage.ts`), nên `Promise.all` an toàn: nếu 1 path đã bị
    // xoá từ request khác, các path còn lại vẫn tiếp tục. Nếu 1 path fail thật
    // (vd: mất mạng) → promise đó reject, ta map sang failedPaths.
    const settled = await Promise.allSettled(
      body.paths.map((p) => deleteImage(p)),
    );
    const failedPaths: { path: string; message: string }[] = [];
    settled.forEach((res, idx) => {
      if (res.status === 'rejected') {
        const path = body.paths[idx];
        const msg = res.reason instanceof Error ? res.reason.message : String(res.reason);
        failedPaths.push({ path, message: msg });
      }
    });

    if (failedPaths.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'DELETE_FAILED',
          message: 'Một số ảnh không xoá được',
          failedPaths,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        deleted: body.paths.length,
        paths: body.paths,
      },
      { status: 200 }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return authErrorResponse(e, 'admin/api/media');
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'INTERNAL_ERROR',
        message: (e as Error)?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Build publicUrl cho 1 path đầy đủ (vd: `products/abc-123.webp`).
 * Dùng cho DELETE handler (khác GET: GET build từ folder + name từ storage.list).
 */
function buildPublicUrlFromPath(
  supabase: ReturnType<typeof createAdminClient>,
  path: string,
): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ────────────────────────────────────────────────────────────────────────────
// NOTE (future, khi products > 1000):
//   Thay block "load all products" bằng per-media count query:
//
//     for (const it of items) {
//       const { count } = await supabase
//         .from('products')
//         .select('id', { count: 'exact', head: true })
//         .or(`image_url.eq.${it.publicUrl},gallery.cs.{${it.publicUrl}}`);
//       it.usageCount = count ?? 0;
//     }
//
//   N query này có thể chạy song song qua `Promise.all` để giảm latency,
//   nhưng vẫn tốn bandwidth hơn approach hiện tại khi dataset nhỏ.
// ────────────────────────────────────────────────────────────────────────────
