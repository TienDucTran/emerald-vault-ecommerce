// POST /api/admin/uploads
//   Content-Type: multipart/form-data
//   Fields:
//     - file         (File, required) — ảnh đã được client resize sang webp (~200-500KB)
//     - folder       (string, optional) — folder con trong bucket. Mặc định 'products'.
//                                     Chỉ chấp nhận whitelist: products | categories | collections | banners
//     - originalName (string, optional) — tên file GỐC (vd: 'Bông tai Sapphire.jpg'). Server sẽ
//                                     strip extension + slugify (bỏ dấu, lowercase, non-alnum → '-')
//                                     rồi gắn '.webp'. Nếu thiếu → fallback UUID + '.webp'.
//     - originalType (string, optional) — DEPRECATED/no-op. Server luôn dùng 'image/webp' làm
//                                     contentType vì bytes là webp. Field vẫn đọc để không vỡ
//                                     client cũ, nhưng giá trị bị bỏ qua.
//   Response 201: { ok: true, publicUrl, path, size, type }
//   Response 4xx : { ok: false, error, message? }
//
// Lưu ý:
//   - Client đã resize ảnh sang webp ~200-500KB trước khi POST, nên server KHÔNG xử lý ảnh
//     mà chỉ validate + upload thẳng lên Supabase Storage qua uploadImage().
//   - Server LUÔN gắn extension `.webp` cho path và contentType `image/webp` cho metadata
//     (bất kể client gửi gì trong `originalType`) — đảm bảo path ↔ bytes khớp tuyệt đối.
//   - Trùng tên sẽ tự động đổi sang `{slug}-1.webp`, `{slug}-2.webp`... (không overwrite).
//   - Vẫn check size 10MB ở server như một lớp defensive (chống client gửi nhầm file gốc,
//     chống request từ tool ngoài bypass UI). Đây là server-side defense in depth.
//   - Folder whitelist chống path traversal ở tầng application: dù uploadImage() có
//     slugify filename, việc nhận folder tuỳ ý từ client vẫn có thể ghi vào vùng không mong muốn
//     (vd: folder='..' hoặc folder tên giống file hệ thống) → khoá whitelist ở route.
//   - Auth: requireAdmin() trả AuthError → authErrorResponse() map status 401/403 đúng chuẩn.

import { NextResponse } from 'next/server';
import { AuthError, authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { uploadImage } from '@/lib/supabase/storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_FOLDER = 'products';
const ALLOWED_FOLDERS = ['products', 'categories', 'collections', 'banners'] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

function isAllowedFolder(value: string): value is AllowedFolder {
  return (ALLOWED_FOLDERS as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'INVALID_QUERY', message: 'Body không phải multipart/form-data hợp lệ' },
        { status: 400 }
      );
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_FILE', message: 'Thiếu field "file" hoặc không phải File' },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_FILE', message: 'File rỗng (size = 0)' },
        { status: 400 }
      );
    }

    // Defensive size check: client đã resize ~500KB, nhưng vẫn cap 10MB để chặn request
    // bất thường (file gốc chưa resize, upload từ tool ngoài, DoS bằng file lớn...).
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_FILE',
          message: `File quá lớn (${file.size} bytes). Tối đa ${MAX_FILE_SIZE} bytes`,
        },
        { status: 400 }
      );
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_FILE', message: `Chỉ chấp nhận file ảnh, nhận được "${file.type || 'unknown'}"` },
        { status: 400 }
      );
    }

    const rawFolder = form.get('folder');
    const folder = (typeof rawFolder === 'string' && rawFolder.length > 0 ? rawFolder : DEFAULT_FOLDER);

    // Optional: client gửi kèm tên gốc để server slugify làm filename (vd: 'Bông tai Sapphire.jpg'
    // → 'bong-tai-sapphire.webp'). Server tự gắn '.webp' + contentType 'image/webp' dù bytes là
    // webp rồi — không cần/ không tin `originalType` nữa. Nếu thiếu → uploadImage() fallback UUID.
    //
    // Fallback chain:
    //   1. `originalName` FormData field (ưu tiên — explicit, không phụ thuộc multipart filename)
    //   2. `file.name` — multipart filename client gắn vào part. Một số client (vd: media library
    //      dropzone) append file với tên gốc → server tự bắt được.
    //   3. undefined → uploadImage() tự generate UUID.
    //
    // Heuristic ở bước 2: bỏ qua các "placeholder" phổ biến ('blob', 'image.webp') vì chúng là
    // sentinels từ client cũ không truyền tên thật — nếu nhận vào sẽ gây collision hàng loạt.
    const PLACEHOLDER_NAMES = new Set(['blob', 'image.webp']);
    const rawOriginalName = form.get('originalName');
    let originalName: string | undefined;
    if (typeof rawOriginalName === 'string' && rawOriginalName.length > 0) {
      originalName = rawOriginalName;
    } else if (file.name && !PLACEHOLDER_NAMES.has(file.name)) {
      originalName = file.name;
    }
    // Đọc `originalType` để tương thích ngược với client cũ nhưng KHÔNG forward — server luôn dùng
    // 'image/webp' (xem UploadOptions.contentType ở storage.ts).
    const rawOriginalType = form.get('originalType');
    void rawOriginalType;

    // Whitelist folder: chống path traversal / ghi vào vùng không mong muốn ở tầng app.
    // uploadImage() có generate UUID, nhưng folder vẫn nằm trong path nên phải kiểm soát.
    if (!isAllowedFolder(folder)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_FOLDER',
          message: `Folder không hợp lệ. Chỉ chấp nhận: ${ALLOWED_FOLDERS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    try {
      const { publicUrl, path } = await uploadImage(file, {
        folder,
        filename: originalName,
      });
      return NextResponse.json(
        { ok: true, publicUrl, path, size: file.size, type: file.type },
        { status: 201 }
      );
    } catch (uploadErr) {
      // Lỗi từ Supabase Storage: log để debug, trả 500 chuẩn hoá cho client.
      console.error('[admin/api/uploads] storage upload failed:', uploadErr);
      return NextResponse.json(
        {
          ok: false,
          error: 'INTERNAL_ERROR',
          message: (uploadErr as Error)?.message ?? 'Upload thất bại',
        },
        { status: 500 }
      );
    }
  } catch (e) {
    // Dùng helper authErrorResponse thay vì tự handle để đảm bảo shape + log thống nhất
    // với mọi route admin khác (xem require-admin.ts).
    if (e instanceof AuthError) {
      return authErrorResponse(e, 'admin/api/uploads');
    }
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
