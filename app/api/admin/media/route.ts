// GET  /api/admin/media
//   Query: ?search=&folder=&limit=&offset=&sort=
//     - search: filter filename contains (case-insensitive)
//     - folder: folder con trong bucket (vd: 'products'). Bỏ trống = root.
//     - limit : 1-200, default 50
//     - offset: >= 0,    default 0
//     - sort  : 'created_desc' | 'created_asc' | 'size_desc' | 'name_asc'
//               default 'created_desc'
//   Response 200: { ok: true, items: MediaItem[], total, limit, offset }
//   Response 4xx: { ok: false, error, details? }
//
// Lưu ý:
//   - requireAdmin() verify user + role + trả adminClient (service-role, bypass RLS).
//   - Bucket 'jewelry-images' là public, đã tạo bằng migration 0010. Tên bucket
//     hiện KHÔNG được export từ lib/supabase/storage.ts (chỉ là const nội bộ)
//     nên ta hardcode ở đây để khớp với URL pattern Supabase trả về.
//   - StorageObject KHÔNG có field `publicUrl` → phải tự build qua `getPublicUrl(path)`
//     với path = `${folder}/${name}`.
//   - `usageCount` + `usedIn` được tính trong CÙNG response (không phải endpoint riêng)
//     vì UX: drawer chi tiết 1 media item cần hiển thị ngay "đang dùng ở đâu" mà không
//     tốn thêm 1 round-trip. Vì product catalog hiện tại < 200 sp nên load 1 lần là đủ.

import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

/** Tên bucket Supabase Storage chứa ảnh sản phẩm & media khác. */
const BUCKET = 'jewelry-images' as const;

/** Max số product references trả về trong `usedIn` của mỗi media item. */
const USED_IN_LIMIT = 5;

// ────────────────────────────────────────────────────────────────────────────
// Schema validate query string
// ────────────────────────────────────────────────────────────────────────────

const MediaListQuerySchema = z.object({
  search: z.string().trim().optional(),
  folder: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z
    .enum(['created_desc', 'created_asc', 'size_desc', 'name_asc'])
    .default('created_desc'),
});

type MediaListQuery = z.infer<typeof MediaListQuerySchema>;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** Shape trả về cho mỗi item trong response. */
interface MediaItem {
  id: string;
  path: string;
  publicUrl: string;
  filename: string;
  size: number;
  contentType: string;
  folder: string;
  createdAt: string;
  usageCount: number;
  usedIn: Array<{ id: string; title: string }>;
}

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
    // `folder ?? ''` = root. Supabase trả `null` (không phải []) nếu folder rỗng/không tồn tại.
    const { data: objects, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(query.folder ?? '', {
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
      const folder = query.folder ?? '';
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
