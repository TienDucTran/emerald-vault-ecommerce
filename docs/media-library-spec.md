# Media Library — Stitch Spec

> Spec UI cho **Media Library** — trang admin quản lý ảnh đã upload lên Supabase Storage bucket `jewelry-images`.
> Gồm 2 entry point: **standalone page** `/admin/media` và **Media Picker Modal** mở từ product form.
> Mục đích: tiết kiệm bandwidth, cho phép tái sử dụng ảnh đã upload, tránh duplicate file trong storage.
> **Audience:** Google Stitch team render UI.
> **Status:** Draft v1 — 2026-07-16.
> **Effort estimate:** ~15-20h (API 4-6h · page 6-8h · modal 3-4h · tích hợp 2h).

---

## 📑 Mục lục

1. [Goal & Use cases](#1-goal--use-cases)
2. [Routes & Files](#2-routes--files)
3. [API Contract](#3-api-contract)
4. [Data Model](#4-data-model-supabase-storage)
5. [Page layout `/admin/media`](#5-page-layout-adminmedia)
6. [Media Card chi tiết](#6-media-card-chi-tiết)
7. [Media Picker Modal](#7-media-picker-modal-từ-form-product)
8. [Media Detail Drawer](#8-media-detail-drawer)
9. [Upload Dropzone](#9-upload-dropzone)
10. [State management](#10-state-management)
11. [Accessibility](#11-accessibility)
12. [Empty / Loading / Error states](#12-empty--loading--error-states)
13. [Responsive breakpoints](#13-responsive-breakpoints)
14. [Interactions chi tiết](#14-interactions-chi-tiết)
15. [Cập nhật product-form.tsx](#15-cập-nhật-product-formtsx)
16. [Implementation order](#16-implementation-order)
17. [Out of scope](#17-out-of-scope)
18. [Open questions](#18-open-questions)

---

## 1. Goal & Use cases

### 🎯 Mục tiêu

Cung cấp 1 nơi tập trung để admin xem, tìm, upload, xoá, và tái sử dụng ảnh đã có trong Supabase Storage — thay vì cứ phải upload mới mỗi lần edit product.

### 👤 Use cases

#### **UC1 — Standalone browse**
- Admin vào `/admin/media` từ sidebar.
- Thấy toàn bộ ảnh đã upload dạng grid.
- Có thể search theo tên file, filter theo folder, sort theo ngày/dung lượng/usage.
- Bulk select nhiều ảnh để xoá.
- Click 1 ảnh → drawer chi tiết bên phải.

#### **UC2 — Picker từ product form**
- Admin đang ở form tạo/sửa product.
- Thay vì click "Upload ảnh" (tốn bandwidth vì phải resize + upload lại), click **"Chọn từ thư viện"**.
- Modal mở ra với grid ảnh đã có trong storage.
- Admin search → chọn 1 ảnh (cho `image_url`) hoặc N ảnh (cho `gallery[]`).
- Click "Chọn" → đóng modal, URL ảnh điền vào form.
- Nếu admin vẫn muốn upload mới, có nút "Upload mới" ngay trong modal (mở dropzone nhỏ bên trong modal).

#### **UC3 — Cleanup orphan**
- Admin thấy nhiều ảnh trong media library không còn product nào dùng (orphan).
- Lọc "Chỉ hiện orphan" (chưa có ở MVP — tick filter ở phase sau nếu cần).
- Chọn các ảnh orphan → click "Xoá" → confirm → xoá khỏi storage.
- Nếu ảnh KHÔNG orphan (đang được product dùng) → nút xoá disabled hoặc show 409 với list products dùng nó.

### ✅ Acceptance criteria

- [ ] Admin có thể list được tất cả ảnh trong bucket `jewelry-images/folder/products/` kèm `usageCount` chính xác.
- [ ] Admin upload 1 lúc nhiều ảnh, có progress từng ảnh.
- [ ] Từ product form, chọn được ảnh có sẵn mà KHÔNG cần upload lại.
- [ ] Xoá 1 ảnh đang được dùng → bị block với thông báo rõ ràng (không xoá âm thầm).
- [ ] UI responsive từ mobile (2 cols) → desktop (7 cols).

---

## 2. Routes & Files

### 📂 Files mới cần tạo

```
app/
├── (admin)/
│   └── admin/
│       └── media/
│           └── page.tsx                      # Standalone page
└── api/
    └── admin/
        └── media/
            ├── route.ts                      # GET list · POST upload · DELETE bulk
            ├── [id]/
            │   └── route.ts                  # GET 1 ảnh · DELETE 1 ảnh
            └── usage/
                └── route.ts                  # GET usage của 1 ảnh

components/
├── admin/
│   ├── product-form.tsx                      # ⬅ UPDATE: thêm button "Chọn từ thư viện"
│   └── media/
│       ├── media-grid.tsx                    # Grid ảnh với checkbox select
│       ├── media-toolbar.tsx                 # Search + filter + bulk actions
│       ├── media-card.tsx                    # 1 card ảnh
│       ├── media-picker-modal.tsx            # Modal chọn ảnh (UC2)
│       ├── upload-dropzone.tsx               # Drag-drop area
│       └── media-detail-drawer.tsx           # Drawer bên phải khi click 1 ảnh
└── layout/
    └── admin-sidebar.tsx                     # ⬅ UPDATE: thêm nav item "Media"
```

### 🧭 Route group note

- Repo dùng route group `(admin)`, URL thực tế là `/admin/media` (KHÔNG phải `/dashboard/media`).
- Tất cả API route đặt dưới `app/api/admin/...` để match pattern admin guard hiện tại.

---

## 3. API Contract

### `GET /api/admin/media`

List ảnh trong storage, kèm usage count.

**Query params:**

| Param   | Type   | Default          | Mô tả                                       |
| ------- | ------ | ---------------- | ------------------------------------------- |
| search  | string | `""`             | Filter theo `filename` (case-insensitive)   |
| folder  | string | `"products"`     | Subfolder trong bucket (chỉ `products` ở MVP) |
| limit   | number | `50`             | Số ảnh / trang                              |
| offset  | number | `0`              | Bỏ qua N ảnh đầu                            |
| sort    | string | `created_desc`   | `created_desc` · `created_asc` · `size_desc` · `usage_desc` |

**Response 200:**

```json
{
  "ok": true,
  "items": [
    {
      "id": "9a8b7c6d-uuid-storage",
      "path": "products/abc-123.webp",
      "publicUrl": "https://xyz.supabase.co/storage/v1/object/public/jewelry-images/products/abc-123.webp",
      "filename": "abc-123.webp",
      "size": 487293,
      "contentType": "image/webp",
      "folder": "products",
      "createdAt": "2026-07-16T01:23:45.000Z",
      "usageCount": 3,
      "usedIn": [
        { "type": "product", "id": "uuid-1", "title": "Nhẫn bạc 925 đính đá emerald" },
        { "type": "product", "id": "uuid-2", "title": "Bông tai vàng 18k" }
      ]
    }
  ],
  "total": 247,
  "limit": 50,
  "offset": 0
}
```

**Cách query Supabase:**

1. `supabase.storage.from('jewelry-images').list('products', { limit, offset, sortBy: { column: 'created_at', order: 'desc' } })` → lấy metadata files.
2. Lấy URL public: `supabase.storage.from('jewelry-images').getPublicUrl(path)`.
3. Query `products` table: `select id, title, image_url, gallery` để tính `usageCount`:
   - `image_url` chứa path → match.
   - `gallery` (array) chứa path → match.
4. Aggregate in-memory (ở MVP) hoặc dùng view `media_with_usage` (phase sau nếu data lớn).

**Response 500:** `{ ok: false, error: "INTERNAL_ERROR", message: "..." }`

---

### `POST /api/admin/media`

Upload nhiều ảnh cùng lúc.

**Request:** `multipart/form-data` với field `file` lặp lại nhiều lần.

**Response 201:**

```json
{
  "ok": true,
  "uploaded": [
    {
      "publicUrl": "https://.../products/new-uuid.webp",
      "path": "products/new-uuid.webp",
      "size": 312000,
      "type": "image/webp"
    }
  ]
}
```

**Response 400:** `{ ok: false, error: "INVALID_TYPE", message: "Chỉ chấp nhận image/webp, image/jpeg, image/png" }`

**Response 413:** `{ ok: false, error: "FILE_TOO_LARGE", message: "Mỗi ảnh tối đa 5MB sau khi resize" }`

**Server-side logic:**

1. Validate content type (chỉ image/webp, image/jpeg, image/png).
2. Validate size (max 5MB / file).
3. Generate path: `products/{uuid}.{ext}` (dùng `crypto.randomUUID()`).
4. Upload lên Supabase Storage bucket `jewelry-images`.
5. Trả về array public URLs.

> **Note:** Client đã resize về webp ~500KB trước khi gửi (xem `lib/image/client-resize.ts`). Server KHÔNG resize lại ở MVP.

---

### `DELETE /api/admin/media`

Xoá nhiều ảnh (bulk).

**Request body:**

```json
{ "paths": ["products/abc.webp", "products/xyz.webp"] }
```

**Logic:**

1. Với mỗi path, query `products` để check có product nào đang dùng (`image_url` hoặc `gallery` chứa path).
2. Nếu `usageCount > 0` → đưa vào `skipped` (không xoá).
3. Nếu `usageCount === 0` → gọi `supabase.storage.from('jewelry-images').remove([path])` → đưa vào `deleted`.

**Response 200:**

```json
{
  "ok": true,
  "deleted": ["products/abc.webp"],
  "skipped": [
    { "path": "products/xyz.webp", "reason": "IN_USE", "usedIn": [{ "id": "uuid", "title": "..." }] }
  ]
}
```

**Response 409** (nếu TOÀN Bộ paths đều in-use, không xoá được cái nào):

```json
{
  "ok": false,
  "error": "ALL_IN_USE",
  "skipped": [{ "path": "...", "reason": "IN_USE", "usedIn": [...] }]
}
```

---

### `GET /api/admin/media/usage?path=products/abc.webp`

Lấy usage chi tiết của 1 ảnh (dùng trong detail drawer).

**Response 200:**

```json
{
  "ok": true,
  "usageCount": 3,
  "usedIn": [
    { "type": "product", "id": "uuid-1", "title": "Nhẫn bạc 925" },
    { "type": "product", "id": "uuid-2", "title": "Bông tai vàng 18k" }
  ]
}
```

---

### `GET /api/admin/media/[id]` · `DELETE /api/admin/media/[id]`

Single-item endpoints (cho drawer actions):

- `GET` → trả về 1 ảnh với metadata đầy đủ + `usageCount`.
- `DELETE` → check usage; nếu > 0 thì 409, ngược lại xoá và trả 200.

---

## 4. Data Model (Supabase Storage)

> KHÔNG tạo bảng mới. Chỉ đọc từ `storage.objects` (system table) + join `products` table.

### 📦 Bucket structure

```
jewelry-images/                            ← bucket
└── products/                              ← folder (duy nhất ở MVP)
    ├── {uuid-1}.webp
    ├── {uuid-2}.webp
    ├── {uuid-3}.webp
    └── ...
```

### 🗃️ `storage.objects` (Supabase managed)

Mỗi file trong bucket là 1 row với schema:

| Column            | Type        | Ý nghĩa                            |
| ----------------- | ----------- | ---------------------------------- |
| `id`              | uuid        | PK                                 |
| `bucket_id`       | text        | `"jewelry-images"`                 |
| `name`            | text        | `"products/abc-123.webp"` (path)   |
| `owner`           | uuid        | User đã upload                     |
| `metadata`        | jsonb       | `{ size, mimetype, cacheControl }` |
| `created_at`      | timestamptz | Upload time                        |
| `updated_at`      | timestamptz | Last modified                      |
| `last_accessed_at`| timestamptz | (CDN)                              |

### 🔗 Join với `products`

```sql
-- Pseudo: tìm products đang dùng path X
SELECT id, title FROM products
WHERE image_url LIKE '%{path}%'
   OR gallery::text LIKE '%{path}%';
```

> Lưu ý: `image_url` lưu FULL URL (`https://...supabase.co/...`), nên phải match bằng `LIKE '%path%'` hoặc parse URL trước.

### 🖼️ Public URL format

```
https://{project-ref}.supabase.co/storage/v1/object/public/jewelry-images/{path}
```

---

## 5. Page layout `/admin/media`

### 🖥️ Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [SIDEBAR]  │  MEDIA LIBRARY                          [Upload ảnh mới] [↻]│
│             │  ────────────────────────────────────────────────────────  │
│   Overview  │  Tổng: 247 ảnh · Dung lượng: 124 MB · Đang dùng: 198 · Lỗi: 0│
│   Products  │  ────────────────────────────────────────────────────────  │
│  ▶Media     │  [🔍 Tìm theo tên file...]  [Folder ▼ products]  [Sắp xếp ▼]│
│   Collect.. │  [☐ Chỉ hiện orphan]  [☐ Đang lỗi]                         │
│   Inventory │                                                            │
│   Orders    │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│   Payments  │  │ [✓]  │ │ [✓]  │ │ [ ]  │ │ [ ]  │ │ [✓]  │ │ [ ]  │     │
│   Newslet.  │  │      │ │      │ │      │ │      │ │      │ │      │     │
│   Analytics │  │ IMG  │ │ IMG  │ │ IMG  │ │ IMG  │ │ IMG  │ │ IMG  │     │
│   Settings  │  │ 320KB│ │ 450KB│ │ 280KB│ │ 510KB│ │ 390KB│ │ 420KB│     │
│             │  │ ✦ SSS│ │ ✦ SS │ │ ✦ S  │ │ ✦ SSS│ │ ✦ SS │ │ ✦ S  │     │
│             │  │ Dùng3│ │ Dùng1│ │ Dùng0│ │ Dùng5│ │ Dùng2│ │ Dùng0│     │
│             │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│             │                                                            │
│             │  ┌──────┐ ┌──────┐ ...                                       │
│             │                                                            │
│             │  ────────────────────────────────────────────────────────  │
│             │  247 ảnh · 3 đã chọn          [🗑 Xoá 3]   [< 1 2 3 ... >] │
└─────────────┴────────────────────────────────────────────────────────────┘
```

### 📐 Layout zones

1. **Header** (sticky top): Title + 2 nút action.
2. **Stats bar** (dưới header): 4 metric tổng quan (tổng số ảnh, tổng dung lượng, đang được dùng, lỗi).
3. **Toolbar** (dưới stats): Search + 2-3 filter dropdown + 2 toggle filter.
4. **Grid** (chiếm phần lớn viewport): responsive grid 2-7 cols.
5. **Footer bar** (sticky bottom): Count + bulk action + pagination.

### 📱 Mobile (<768px)

```
┌──────────────────────────┐
│ ☰  Media      [Upload] [↻]│
├──────────────────────────┤
│ 247 ảnh · 124 MB         │
│ [🔍 Tìm...]              │
│ [Bộ lọc ▼]               │
├──────────────────────────┤
│ ┌────┐ ┌────┐            │
│ │[✓] │ │[ ] │            │
│ │IMG │ │IMG │            │
│ │320K│ │450K│            │
│ │✦SS │ │✦S  │            │
│ └────┘ └────┘            │
│ ┌────┐ ┌────┐            │
│ │[ ] │ │[ ] │            │
│ │IMG │ │IMG │            │
│ │280K│ │510K│            │
│ └────┘ └────┘            │
├──────────────────────────┤
│ 3 đã chọn [🗑 Xoá] [< >]│
└──────────────────────────┘
```

- Filter collapse thành drawer (icon bộ lọc mở bottom sheet).
- Toolbar 2 dòng: search riêng, filter riêng.
- FAB (Floating Action Button) "Upload" góc dưới phải.

### 🎨 Style tokens

- **Background:** `bg-surface` (#161B22) cho page, `bg-[#12241C]` cho sidebar.
- **Card background:** `bg-[rgba(18,36,28,0.6)]` + `backdrop-blur-[6px]` + `border: 1px solid rgba(241,229,172,0.1)` (glass style).
- **Heading font:** Cinzel (`font-heading`), uppercase, tracking-wide.
- **Body font:** Inter, 14-15px.
- **Accent:** `text-gold` (#F2CA50), `text-gold-champagne` (#F1E5AC) cho hover.
- **Muted:** `text-[#D0C5AF]`.
- **Border:** `border-[#4D4635]`.
- **Tier badges:** dùng màu tier đã có (SS = gold, S = gold-champagne, ...).

---

## 6. Media Card chi tiết

Mỗi card là 1 thumbnail ảnh với metadata overlay.

### 📐 Anatomy

```
┌────────────────────┐
│ [✓]  ·    3x · ⋮  │   ← top row: checkbox · zoom (hover) · menu
│                    │
│                    │
│       [IMAGE]      │   ← aspect-square, object-cover, lazy load
│                    │
│                    │
├────────────────────┤
│ abc-123.webp       │   ← filename (1 dòng, ellipsis)
│ 320 KB · ✦ SS      │   ← size + tier badge
│ [Dùng ở 3 SP]      │   ← usage badge (ẩn nếu = 0)
└────────────────────┘
```

### 🧩 Components

| Phần              | Mô tả                                                                       | Visibility                  |
| ----------------- | --------------------------------------------------------------------------- | --------------------------- |
| **Checkbox**      | Góc trên trái, glass style (rgba(18,36,28,0.6) + blur)                     | Chỉ hiện khi hover HOẶC đang select mode (1+ ảnh đã chọn) |
| **Zoom button**   | Icon `Search` (lucide), góc trên phải                                      | Chỉ hiện khi hover          |
| **Context menu**  | Icon `MoreVertical` (3 chấm dọc), mở menu: Copy URL · Xem · Xoá            | Chỉ hiện khi hover          |
| **Image**         | `aspect-square`, `object-cover`, `lazy` loading, `bg-[#0d1611]` placeholder | Always                      |
| **Hover overlay** | `bg-black/40` + 2 icon buttons (zoom + copy URL)                            | Chỉ hiện khi hover          |
| **Tier badge**    | Pill ở góc dưới trái, hiển thị tier của product đầu tiên đang dùng ảnh     | Always (hoặc "Orphan" nếu 0) |
| **Filename**      | 1 dòng, `truncate`, font mono (Inter)                                       | Always                      |
| **Size**          | Format `"320 KB"` dùng `formatBytes()` từ `lib/image/client-resize.ts`      | Always                      |
| **Usage badge**   | Pill outline `Dùng ở 3 SP`                                                  | Chỉ hiện nếu `usageCount > 0` |

### 🖱️ States

- **Default:** Border `border-[rgba(241,229,172,0.1)]`.
- **Hover:** Border `border-gold/40`, hiện overlay buttons.
- **Selected:** Border `border-gold` solid, checkbox filled, slight scale `1.02`.
- **Loading:** Skeleton placeholder.
- **Broken image:** Icon `ImageOff` + text "Lỗi tải ảnh" (border đỏ nhạt).

### ♿ ARIA

```html
<div
  role="button"
  tabIndex={0}
  aria-label="Ảnh abc-123.webp, dùng ở 3 sản phẩm, 320 KB"
  aria-checked={selected}
>
```

---

## 7. Media Picker Modal (từ form product)

### 🎯 Mục đích

Mở từ product form để chọn ảnh có sẵn thay vì upload mới.

### 🖼️ ASCII art

```
┌──────────────────────────────────────────────────────────────────────┐
│  CHỌN ẢNH TỪ THƯ VIỆN                                       [X]    │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│  [🔍 Tìm theo tên...]              [Folder ▼]  [Sort ▼ Mới nhất]    │
│                                                                      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                         │
│  │ ✓  │ │    │ │    │ │    │ │    │ │    │                         │
│  │IMG │ │IMG │ │IMG │ │IMG │ │IMG │ │IMG │   (grid 5-6 cột)       │
│  │SS  │ │S   │ │SS  │ │A   │ │S   │ │SS  │                         │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                         │
│  │    │ │    │ │    │ │    │ │    │ │    │                         │
│  │IMG │ │IMG │ │IMG │ │IMG │ │IMG │ │IMG │                         │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                         │
│  ...                                                                 │
│                                                                      │
│  ──────────────────────────────────────────────────────────────────  │
│  247 ảnh · 1 đã chọn                  [< Hủy]  [Upload mới]        │
│                                                  [✓ Chọn 1 ảnh]   │
└──────────────────────────────────────────────────────────────────────┘
```

### 🔑 Props

```ts
type MediaPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'single' | 'multi';   // single cho image_url, multi cho gallery
  initialFolder?: string;
  onSelect: (urls: string[]) => void;   // 1 url nếu single, N urls nếu multi
};
```

### 🧩 Behaviors

- **Mode `single`:** Chỉ cho chọn 1 ảnh. Click 1 ảnh khác → thay thế selection. Click ảnh đã chọn → bỏ chọn.
- **Mode `multi`:** Cho chọn nhiều. Click ảnh → toggle select. Hiển thị checkbox luôn (không cần hover).
- **Search realtime** (debounce 300ms).
- **Folder filter** dropdown (chỉ `products` ở MVP).
- **Sort** theo `Mới nhất` · `Cũ nhất` · `Dùng nhiều nhất`.
- **Upload mới** button trong footer → mở dropzone inline (collapsible section trong modal).
- **Click 1 ảnh không select** (chỉ zoom) — thay vào đó click vào checkbox / click 2 lần mới select. Hoặc: click thường = select (đơn giản hơn, quyết định khi implement).
- **Phím tắt:** `Enter` = confirm · `Esc` = cancel.
- **Empty state:** Nếu không tìm thấy ảnh nào → text "Không tìm thấy ảnh. Upload ảnh mới?" + nút Upload.

### 🎨 Style

- **Backdrop:** `bg-black/70` + `backdrop-blur-sm`.
- **Modal container:** Glass style, `max-w-5xl`, `max-h-[90vh]`, scrollable content.
- **Close button:** Icon `X` góc trên phải.
- **Footer:** Sticky bottom, glass background, 2-3 nút (Hủy · Upload mới · Confirm).

---

## 8. Media Detail Drawer (click 1 ảnh → drawer bên phải 480px)

### 🎯 Mục đích

Hiển thị chi tiết 1 ảnh + cho phép hành động nhanh (copy URL, xoá, navigate tới product dùng ảnh đó).

### 🖼️ ASCII art

```
                                            ┌────────────────────────────────┐
                                            │ [X]                            │
                                            │  ──────────────────────────    │
                                            │                                │
                                            │        [LARGE IMAGE]           │
                                            │        (max 60vh)              │
                                            │                                │
                                            │  ──────────────────────────    │
                                            │  Filename: abc-123.webp        │
                                            │  Path: products/abc-123.webp   │
                                            │  Size: 320 KB · webp           │
                                            │  Uploaded: 16/07/2026 01:23    │
                                            │  ──────────────────────────    │
                                            │  📌 Đang được dùng ở 3 SP:    │
                                            │     • Nhẫn bạc 925 đính...     │
                                            │     • Bông tai vàng 18k        │
                                            │     • Dây chuyền ngọc trai     │
                                            │  ──────────────────────────    │
                                            │  [📋 Copy URL]  [🗑 Xoá]       │
                                            │  (Xoá disabled nếu usage > 0) │
                                            └────────────────────────────────┘
```

### 🧩 Sections

1. **Header:** Close button (X).
2. **Preview:** Ảnh lớn, `object-contain`, `max-h-[60vh]`, background tối (`bg-[#0d1611]`), có border.
3. **Metadata block:** Filename, path, size, content type, uploaded date.
4. **Usage block:** Hiển thị `usedIn[]` dạng list. Mỗi item là link `/admin/products/{id}/edit`.
5. **Actions:** Copy URL · Xoá (disabled nếu `usageCount > 0`).

### 🔑 Behaviors

- **ESC:** Đóng drawer.
- **Click outside:** Đóng drawer.
- **Copy URL:** Click → `navigator.clipboard.writeText(publicUrl)` → toast "Đã copy URL".
- **Xoá:**
  - Nếu `usageCount === 0` → confirm dialog "Xoá ảnh này? Hành động không thể hoàn tác." → xoá.
  - Nếu `usageCount > 0` → button disabled, tooltip "Không thể xoá ảnh đang được dùng bởi {N} sản phẩm".

### 🎨 Style

- **Width:** `w-[480px]` trên desktop, full width trên mobile (slide from bottom).
- **Animation:** Slide từ phải → trái, 250ms ease-out.
- **Backdrop:** `bg-black/50` mờ nhẹ.

---

## 9. Upload Dropzone (trong page `/admin/media`)

### 🎯 Mục đích

Cho phép upload nhiều ảnh cùng lúc với progress từng ảnh.

### 🖼️ ASCII art (default state)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                         ⬆                                           │
│              Kéo thả ảnh vào đây                                    │
│                  hoặc                                               │
│         [📁 Chọn file từ máy tính]                                 │
│                                                                      │
│      Hỗ trợ: JPG, PNG, WEBP · Tối đa 5MB / ảnh · Nhiều file cùng lúc│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 🖼️ ASCII art (uploading state)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                         ⬆ (active)                                   │
│              Thả ảnh để bắt đầu upload                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
│  Đang upload 3 ảnh:                                                  │
│  ✅ photo1.jpg  ──────────── 100% (450 KB)                           │
│  ⏳ photo2.png  ██████████░░░░  72% (đang resize...)                 │
│  ⏳ photo3.webp ████░░░░░░░░░░  31% (đang resize...)                 │
```

### 🧩 Behaviors

- **Drag enter:** Border đổi sang `border-gold solid` + background `bg-gold/5`.
- **Drag leave:** Reset về default.
- **Drop files:** Bắt đầu upload flow.
- **Click:** Mở native file picker.
- **Multi-file:** Xử lý tuần tự hoặc song song (đề xuất: song song max 3).
- **Resize client-side** trước khi upload (xem `lib/image/client-resize.ts`):
  1. Đọc file → `Image` element.
  2. Resize về max 1600px chiều dài.
  3. Convert sang webp quality 0.85.
  4. Upload qua API.
- **Progress:** Mỗi file có progress bar riêng, hiển thị phase "Resizing..." → "Uploading..." → "Done ✅".
- **Error handling:** Nếu 1 file fail → hiển thị dòng đỏ, không block các file khác.
- **Sau khi xong:** Toast "Đã upload N ảnh", refresh grid.

### 🎨 Style

- **Default:** Border dashed `border-2 border-dashed border-[#4D4635]`, padding 32px, text-align center.
- **Hover/active:** Border solid `border-gold`, background tint.
- **Icon:** `Upload` (lucide-react), size 48px, color `text-gold-champagne`.
- **Progress list:** Card riêng bên dưới dropzone khi đang upload, glass style.

---

## 10. State management

> **Pattern:** `useState` + `useCallback` (match với các admin page hiện có). KHÔNG dùng react-query/SWR ở MVP.

### 🧠 Local state (page `/admin/media`)

```ts
const [items, setItems] = useState<MediaItem[]>([]);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [search, setSearch] = useState('');
const [folder, setFolder] = useState('products');
const [sort, setSort] = useState<SortKey>('created_desc');
const [offset, setOffset] = useState(0);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [drawerItem, setDrawerItem] = useState<MediaItem | null>(null);
const [pickerOpen, setPickerOpen] = useState(false);
const [stats, setStats] = useState({ total: 0, sizeBytes: 0, usedCount: 0, errorCount: 0 });
```

### 🔄 Data fetching

- Dùng `useEffect` trigger khi `search`, `folder`, `sort`, `offset` thay đổi (debounce search 300ms).
- Cleanup: AbortController để huỷ request cũ khi filter đổi.

### 🎯 Modal state

- Picker modal state nằm ở `product-form.tsx` (parent).
- Page `/admin/media` không cần picker modal của riêng nó (chỉ cần dropzone).

### 📊 Optimistic updates

- Khi upload xong → prepend items mới vào grid (không cần refresh toàn bộ).
- Khi xoá → remove khỏi `items` ngay, nếu API fail → rollback + toast lỗi.

### 🚦 Loading / Empty / Error

| State      | UI                                                                                 |
| ---------- | ---------------------------------------------------------------------------------- |
| Loading    | Skeleton grid (12 cards với shimmer effect) + spinner overlay toàn page            |
| Empty      | Illustration (icon `ImageIcon` lớn) + "Chưa có ảnh nào" + button "Upload ảnh đầu tiên" |
| Error      | Icon `AlertCircle` + message + button "Thử lại"                                    |
| Partial    | Grid render + banner cảnh báo "Một số ảnh lỗi, click để xem"                       |

---

## 11. Accessibility

### ⌨️ Keyboard

- **Tab order:** Checkbox → Card → Action buttons (zoom, copy, menu) trong card → Next card.
- **Grid:** Dùng `role="grid"` cho container, `role="gridcell"` cho mỗi card.
- **Modal:** Focus trap bên trong modal, `aria-modal="true"`.
- **Drawer:** Focus trap, `role="dialog"`.
- **ESC:** Đóng modal/drawer.
- **Enter / Space:** Trigger action chính của card (mở drawer).
- **Arrow keys:** Di chuyển giữa các card trong grid.

### 🏷️ ARIA

- Card: `aria-label="Ảnh {filename}, dùng ở {N} sản phẩm, {size formatted}"`.
- Selected: `aria-checked={true}`.
- Loading: `aria-busy="true"`.
- Modal: `aria-labelledby="picker-title"`.
- Dropzone: `aria-label="Kéo thả ảnh hoặc click để chọn file"`.

### 🎨 Color contrast

- Text on dark surface: min ratio 4.5:1.
- Gold accent trên surface: đã đạt ~7:1.
- Tier badge: dùng màu nền + text đảm bảo tương phản.

### 📢 Screen reader

- Thông báo upload progress: `aria-live="polite"`.
- Thông báo lỗi: `aria-live="assertive"`.
- Toast: `role="status"`.

---

## 12. Empty / Loading / Error states

### 🌑 Loading

```
┌────────────────────────────────────────────────────┐
│  ⏳ Đang tải...                                    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│  │░░░░│ │░░░░│ │░░░░│ │░░░░│ │░░░░│ │░░░░│        │
│  │░░░░│ │░░░░│ │░░░░│ │░░░░│ │░░░░│ │░░░░│        │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘        │
│  (12 skeleton cards, shimmer animation)             │
└────────────────────────────────────────────────────┘
```

### 📭 Empty (chưa có ảnh nào)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                    [🖼️]                            │
│                                                    │
│              Chưa có ảnh nào                       │
│   Upload ảnh đầu tiên để bắt đầu xây thư viện    │
│                                                    │
│            [⬆ Upload ảnh đầu tiên]                │
│                                                    │
└────────────────────────────────────────────────────┘
```

### ⚠️ Error

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                    [⚠️]                            │
│                                                    │
│         Không thể tải danh sách ảnh                │
│           {error message hiển thị ở đây}          │
│                                                    │
│                [↻ Thử lại]                        │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 🔍 Empty search (có ảnh nhưng search không ra)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                    [🔍]                            │
│                                                    │
│         Không tìm thấy ảnh cho "{search}"          │
│      Thử từ khoá khác hoặc upload ảnh mới         │
│                                                    │
│         [Xoá filter]  [Upload ảnh mới]            │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 13. Responsive breakpoints

| Breakpoint       | Cols   | Card size   | Notes                              |
| ---------------- | ------ | ----------- | ---------------------------------- |
| ≥ 1280px (XL)    | 6-7    | ~180px      | Desktop chính                      |
| 1024-1279 (LG)   | 5      | ~190px      | Desktop nhỏ / laptop               |
| 768-1023 (MD)    | 4      | ~180px      | Tablet landscape                   |
| 480-767 (SM)     | 3      | ~140px      | Tablet portrait                    |
| < 480 (XS)       | 2      | ~160px      | Mobile                             |

### 📐 Tailwind classes đề xuất

```tsx
className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
```

### 📱 Mobile-specific

- Toolbar 2 dòng: search riêng, filter riêng (hoặc collapse thành bottom sheet).
- Drawer trở thành bottom sheet (full width, max 80vh height).
- Modal full screen.
- FAB upload góc dưới phải thay cho button trong header.

---

## 14. Interactions chi tiết

| Trigger                  | Action                                                | Feedback                              |
| ------------------------ | ----------------------------------------------------- | ------------------------------------- |
| **Click card**           | Mở detail drawer bên phải                             | Drawer slide in 250ms                 |
| **Hover card**           | Hiện overlay (zoom + copy URL), border đổi sang gold  | Transition 150ms                      |
| **Click checkbox**       | Toggle select, thêm/xoá khỏi `selectedIds`            | Border gold + slight scale            |
| **Cmd/Ctrl + Click**     | Toggle select (multi-select không cần Cmd)            | Same as checkbox click                |
| **Shift + Click**        | Select range từ ảnh trước đến ảnh hiện tại            | Border gold + select all in range    |
| **Long press (mobile)**  | Mở context menu (Copy URL · Xem · Xoá)               | Haptic feedback + menu                |
| **Right click**          | Mở context menu tương tự                              | Native context menu                   |
| **Double click card**    | Select + đóng modal (chỉ trong picker mode)          | Modal đóng + URL fill vào form       |
| **Drag card**            | (Phase sau) reorder trong gallery context             | Visual drag indicator                 |
| **Search input change**  | Debounce 300ms → refetch                              | Loading spinner inline                |
| **Filter change**        | Refetch với filter mới                                | Grid skeleton flash                   |
| **Sort change**          | Refetch với sort mới                                  | Grid reflow                           |
| **Pagination next/prev** | Load page tiếp                                        | Scroll to top grid                    |
| **Click "Xoá" bulk**     | Confirm dialog → call API → refetch                   | Toast "Đã xoá N ảnh"                  |
| **Click "Copy URL"**     | `navigator.clipboard.writeText(publicUrl)`            | Toast "Đã copy URL"                   |
| **ESC key**              | Đóng modal / drawer                                   | Slide out animation                   |
| **Drop files vào page**  | Mở upload flow                                        | Dropzone highlight                    |
| **Upload complete**      | Prepend items mới + refresh stats                     | Toast "Đã upload N ảnh"               |
| **Click "Xem" trong drawer** | Navigate tới `/admin/products/{id}/edit`           | Tab mới nếu Cmd+click                 |

### ⚡ Optimistic UI

- Select: cập nhật `selectedIds` ngay, không cần API.
- Xoá: remove khỏi `items` ngay, rollback nếu API fail.
- Upload: hiển thị placeholder card với progress ngay khi drop.

---

## 15. Cập nhật product-form.tsx

### 🎯 Mục đích

Thêm button "Chọn từ thư viện" cạnh button "Upload" hiện tại để mở `MediaPickerModal`.

### 🖼️ Vị trí (image_url field)

```
┌────────────────────────────────────────────────────┐
│  Ảnh chính *                                       │
│  ┌──────────────────────────────────────────┐      │
│  │                                          │      │
│  │       [Preview ảnh hiện tại]             │      │
│  │                                          │      │
│  └──────────────────────────────────────────┘      │
│  [⬆ Upload ảnh]  [🖼 Chọn từ thư viện]  [Xoá]   │
│  Helper: "WebP 1600px, tối đa 500KB"              │
└────────────────────────────────────────────────────┘
```

### 🖼️ Vị trí (gallery field)

```
┌────────────────────────────────────────────────────┐
│  Gallery (tối đa 8 ảnh)                            │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                      │
│  │IMG │ │IMG │ │ +  │ │ +  │                      │
│  │ 1  │ │ 2  │ │ 3  │ │ 4  │                      │
│  └────┘ └────┘ └────┘ └────┘                      │
│  [⬆ Upload nhiều]  [🖼 Chọn từ thư viện]          │
└────────────────────────────────────────────────────┘
```

### 🔧 Code changes

```tsx
// product-form.tsx
const [pickerOpen, setPickerOpen] = useState(false);
const [pickerMode, setPickerMode] = useState<'single' | 'multi'>('single');
const [pickerContext, setPickerContext] = useState<'image_url' | 'gallery'>('image_url');

const openPicker = (context: 'image_url' | 'gallery') => {
  setPickerContext(context);
  setPickerMode(context === 'image_url' ? 'single' : 'multi');
  setPickerOpen(true);
};

const handlePickerSelect = (urls: string[]) => {
  if (pickerContext === 'image_url') {
    setImageUrl(urls[0]);
  } else {
    setGallery([...gallery, ...urls].slice(0, 8));
  }
  setPickerOpen(false);
};

// JSX
<MediaPickerModal
  open={pickerOpen}
  onOpenChange={setPickerOpen}
  mode={pickerMode}
  onSelect={handlePickerSelect}
/>
```

### 📝 Button labels

- "Chọn từ thư viện" (với icon `Image` hoặc `FolderOpen`).
- Style: `variant="outline"` (border gold, text gold, transparent bg) để phân biệt với button "Upload" (primary).

---

## 16. Implementation order

> Chia thành 7 bước, mỗi bước testable độc lập.

| #   | Bước                                       | Files                                                                                          | Effort |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------ |
| 1   | **API list + usage count** (read-only)     | `app/api/admin/media/route.ts` (GET) · `app/api/admin/media/usage/route.ts`                   | 4-6h   |
| 2   | **Page `/admin/media`**                    | `app/(admin)/admin/media/page.tsx` · `media-grid.tsx` · `media-toolbar.tsx` · `media-card.tsx`  | 6-8h   |
| 3   | **Detail drawer**                          | `media-detail-drawer.tsx` · API `[id]/route.ts` (GET)                                          | 2-3h   |
| 4   | **Upload dropzone**                        | `upload-dropzone.tsx` · API `route.ts` (POST) · integrate vào page                             | 3-4h   |
| 5   | **Delete + usage check**                   | API `route.ts` (DELETE) + bulk UI                                                              | 2-3h   |
| 6   | **MediaPickerModal + product-form**        | `media-picker-modal.tsx` · update `product-form.tsx`                                           | 3-4h   |
| 7   | **Sidebar nav update**                     | `admin-sidebar.tsx`                                                                             | 0.5h   |

**Total estimate:** ~20-25h (1 sprint cho 1 dev).

### 🧪 Test plan

- Unit: `formatBytes()`, usage count logic.
- Integration: API endpoints với Supabase local.
- E2E (Playwright):
  - List ảnh.
  - Upload 1 ảnh.
  - Upload nhiều ảnh với progress.
  - Xoá orphan.
  - Xoá ảnh in-use → block.
  - Picker modal từ product form.
  - Search + filter.
- A11y: axe-core scan, keyboard navigation test.

---

## 17. Out of scope (để phase sau)

> Liệt kê rõ để tránh scope creep.

- ❌ **Tag/folder tuỳ chỉnh** — chỉ dùng folder gốc `products/`.
- ❌ **Bulk rename** — đổi tên file trong storage.
- ❌ **Image edit client-side** — crop, rotate, filter.
- ❌ **AI auto-tag** — tự động gắn tag mô tả ảnh.
- ❌ **Drag để reorder** ảnh trong gallery (dùng nút ↑↓ thay thế ở MVP).
- ❌ **CDN analytics per image** — view count, hot score.
- ❌ **Image variants** — generate thumbnail/medium/large từ 1 source.
- ❌ **Watermark** — tự động thêm watermark khi upload.
- ❌ **Duplicate detection** — phát hiện ảnh trùng hash.
- ❌ **Auto-cleanup orphan** — tự động xoá ảnh không dùng sau N ngày.
- ❌ **Multi-bucket support** — quản lý nhiều bucket cùng lúc.
- ❌ **Search by visual similarity** — tìm ảnh giống nhau bằng AI.
- ❌ **Image alt text editor** — chỉnh alt text cho ảnh trong library.
- ❌ **Bulk download** — zip nhiều ảnh về máy.

---

## 18. Open questions

> Cần quyết định trước khi implement.

### ❓ Q1: Auto-cleanup orphan?

- **Câu hỏi:** Ảnh orphan (không còn product nào dùng) có nên auto-cleanup sau N ngày không?
- **Đề xuất:** ❌ KHÔNG. Cứ để admin xoá tay. Lý do:
  - Admin có thể đang giữ ảnh cho sản phẩm seasonal chưa tạo.
  - Khó xác định "orphan" chính xác (còn dùng trong description, marketing asset?).
  - Storage cost thấp so với rủi ro xoá nhầm.
- **Owner:** Product owner.
- **Status:** Pending.

### ❓ Q2: Detect duplicate theo hash?

- **Câu hỏi:** Ảnh trùng nội dung (cùng perceptual hash) có nên detect và cảnh báo?
- **Đề xuất:** ❌ KHÔNG ở MVP. Lý do:
  - Path đã unique (UUID), không có 2 file cùng path.
  - Admin có thể cố ý upload 2 phiên bản (light/dark background, crop khác).
  - Perceptual hash tốn compute, không cần ở MVP.
- **Owner:** Tech lead.
- **Status:** Resolved (chọn KHÔNG).

### ❓ Q3: Khi xoá ảnh, có nên set `image_url` của product về NULL không?

- **Câu hỏi:** Nếu ảnh đang được dùng → cấm xoá (rule hiện tại). Nhưng có nên cho phép "force delete" với side effect set `image_url` về NULL?
- **Đề xuất:** ❌ KHÔNG ở MVP. Cấm hẳn, admin phải đi sửa từng product trước.
- **Lý do:** Tránh side effect ngầm, dễ audit.
- **Owner:** Tech lead.
- **Status:** Resolved (chọn cấm hẳn).

### ❓ Q4: Tier badge hiển thị tier nào nếu ảnh được nhiều product dùng với tier khác nhau?

- **Câu hỏi:** 1 ảnh có thể được dùng bởi SS, S, A cùng lúc. Hiển thị tier nào?
- **Đề xuất:** Hiển thị tier CAO NHẤT (SS > S > A > B). Lý do: tier cao = giá trị cao, ưu tiên hiển thị.
- **Owner:** Designer.
- **Status:** Resolved.

### ❓ Q5: Folder structure — chỉ `products/` hay mở rộng?

- **Câu hỏi:** Hiện tại chỉ có 1 folder `products/`. Có cần support folder khác (collections, banners, blog)?
- **Đề xuất:** Ở MVP chỉ hiển thị `products/`. Phase sau mở rộng nếu cần.
- **Owner:** Product owner.
- **Status:** Pending.

### ❓ Q6: Có support ảnh GIF không?

- **Câu hỏi:** Product có nên có ảnh động (GIF/WebM) không?
- **Đề xuất:** ❌ KHÔNG ở MVP. Chỉ static image (webp/jpg/png).
- **Lý do:** Resize client-side chỉ work với static. GIF rất nặng.
- **Owner:** Product owner.
- **Status:** Resolved.

### ❓ Q7: Limit upload đồng thời?

- **Câu hỏi:** Cho phép upload bao nhiêu file cùng lúc?
- **Đề xuất:** Max 10 files / lần, mỗi file max 5MB. Tổng tối đa 50MB / lần.
- **Owner:** Tech lead.
- **Status:** Pending.

### ❓ Q8: Ảnh trong `gallery[]` của product có nên tách thành bảng riêng?

- **Câu hỏi:** Hiện `products.gallery` là JSONB array. Có nên tách thành bảng `product_images` (id, product_id, path, order) để dễ query hơn?
- **Đề xuất:** Ở MVP giữ JSONB. Phase sau nếu cần analytics per image thì tách.
- **Lý do:** Refactor DB là breaking change, không cần ở MVP.
- **Owner:** Tech lead.
- **Status:** Resolved (giữ JSONB).

---

## 📎 Appendix

### A. Related files

- `lib/image/client-resize.ts` — function `formatBytes()` reuse.
- `lib/image/client-resize.ts` — function `resizeImage()` reuse cho upload flow.
- `components/ui/dialog.tsx` — modal base component (Radix UI).
- `components/ui/drawer.tsx` — drawer base component (Radix UI).
- `components/ui/checkbox.tsx` — checkbox base component.
- `components/ui/toast.tsx` — toast notification.

### B. Dependencies (đã có sẵn)

- `lucide-react` — icons (Search, Upload, Trash2, X, Loader2, ImageIcon, Copy, ExternalLink, MoreVertical, Check, FolderOpen, ImageOff, AlertCircle).
- `@radix-ui/react-dialog` — modal.
- `@radix-ui/react-drawer` hoặc `vaul` — drawer.
- `@radix-ui/react-checkbox` — checkbox.
- `sonner` hoặc `react-hot-toast` — toast.
- `clsx` + `tailwind-merge` (đã wrap trong `cn()`).

### C. File naming convention

- Components: kebab-case → `media-grid.tsx`.
- Hooks (nếu cần): `use-media-library.ts`.
- Types: `types/media.ts`.
- API: route handlers theo Next.js App Router convention.

### D. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # dùng cho admin operations (delete, list all)
```

> **Note:** API routes `/api/admin/media` cần check admin auth (existing pattern) + dùng service role key để bypass RLS nếu cần.

### E. Supabase RLS note

- Bucket `jewelry-images` hiện có policy public read.
- Cần thêm policy cho admin write (insert/update/delete).
- Phase này dùng service role key trong server route để bypass RLS — đơn giản hơn.

---

**End of spec v1.**
