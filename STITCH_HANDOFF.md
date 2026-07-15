# Emerald Vault — Admin Products · Stitch Handoff

> **Mục đích:** file này tổng hợp toàn bộ context (theme, data model, API, 2 trang tham chiếu đã có) để bạn paste vào Google Stitch nhằm generate UI cho 2 trang admin mới: **New Product** và **Edit Product**, đồng thời refine lại trang **Bulk Import** nếu cần. Tất cả field, label, validation, status phải khớp 1-1 với backend (`lib/admin/products-schema.ts`) và 2 trang đã build (`/dashboard/products`, `/dashboard/products/bulk-upload`).
>
> **Tên dự án Stitch hiện có (nếu cần dùng lại):** `Antique Jewelry Design System` (ID `15583713143328432626`).

---

## 1. Project & Brand

- **Tên thương hiệu:** Emerald Vault — trang sức vintage/antique cao cấp ("kho báu" — kho tàng quý hiếm).
- **Tone:** luxury, vintage, dark, mystical, premium. Không bright, không playful.
- **Ngôn ngữ UI:** Tiếng Việt (mọi label, button, thông báo). Một vài từ tiếng Anh brand-locked ("Emerald Vault", "Kho báu", "Bulk Import", "Dashboard" ở admin — admin dùng song ngữ VN/EN theo style Figma gốc).
- **Tone copy admin:** chuyên nghiệp, ngắn gọn, dùng động từ mệnh lệnh ("Lưu thay đổi", "Tạo sản phẩm", "Import 12 sản phẩm"). Tránh "Xin vui lòng…", "Bạn có muốn…".

---

## 2. Design Tokens (DÙNG CHUNG TOÀN BỘ TRANG ADMIN)

### 2.1 Color palette

| Token | Hex | Dùng cho |
|---|---|---|
| `bg-background` | `#0D1117` | Nền trang (Quartz Black) — body chính |
| `bg-surface` | `#161B22` | Card, input bg |
| `bg-surface-emerald` | `#12241C` | Inset card, chip nền, hover subtle |
| `text-text-base` | `#EAE1D4` | Heading, số tiền (Cream) |
| `text-text-muted` | `#D0C5AF` | Body, label (Parchment) |
| `text-text-disabled` | `#6B7280` | Placeholder, disabled |
| `text-gold` | `#F2CA50` | Primary accent (logo, link, active tab, số tiền nhấn) |
| `text-gold-champagne` | `#F1E5AC` | Gradient end, hover |
| `border-gold` | `#F2CA50` | Active border |
| `border-gold-soft` | `rgba(242,202,80,0.2)` | Default border card/input |
| `border-divider` | `#4D4635` | Row divider, subtle separator |
| `text-success` | (mặc định theme, dùng `text-success` / `bg-success/10`) | AVAILABLE status, success banner |
| `text-error` | (mặc định theme, dùng `text-error` / `bg-error/10`) | SOLD_OUT status, error banner |
| `tint-info` | `rgba(242,202,80,0.06)` + border `rgba(220,80,80,0.3)` | Bảng lỗi (hơi ửng đỏ) |

### 2.2 Glass card (atomic)

Mọi card, panel, table wrapper, filter bar, modal dùng inline style này:

```css
background: rgba(18, 36, 28, 0.6);
backdropFilter: blur(6px);
border: 1px solid rgba(241, 229, 172, 0.1);
border-radius: 2px; /* rounded-sm */
```

Variant dùng khi cần viền gold nhấn (template download, active filter):

```css
background: rgba(18, 36, 28, 0.6);
backdropFilter: blur(6px);
border: 1px solid rgba(242, 202, 80, 0.2);
```

### 2.3 Typography

- **Font heading:** `Cinzel` (serif, vintage Roman caps), tracking `0.1em–0.15em`, uppercase, weight 400–700.
- **Font body:** `Inter` (sans, hỗ trợ tiếng Việt).
- **Font code / số liệu:** `JetBrains Mono` hoặc monospace mặc định.

| Style | Class | Dùng cho |
|---|---|---|
| Page H1 | `font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight` | "New Product" / "Edit Product" / "Bulk Import" |
| Section H2 | `font-heading text-base font-semibold text-gold tracking-[0.1em] uppercase` | Tiêu đề section trong form ("Thông tin cơ bản", "Hình ảnh & media"…) |
| Label | `text-xs font-medium text-text-muted uppercase tracking-[0.05em]` | Label input |
| Body | `text-sm text-text-muted` | Mô tả, helper text |
| Table header | `text-[10px] font-heading tracking-[0.1em] uppercase text-text-muted/50` | Header bảng |
| Mono / path | `font-mono text-xs text-text-muted/80` | Slug, code, URL, JSON, error path |

### 2.4 Buttons

| Style | Class | Dùng cho |
|---|---|---|
| **Primary (gold)** | `px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed` | CTA chính: "Tạo sản phẩm", "Lưu thay đổi", "Import 12 sản phẩm" |
| **Secondary (outline)** | `px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-gold/20 text-gold/80 hover:text-gold transition-colors` + glass bg | "Bulk Upload", "Hủy", "Validate & Preview", "Load example" |
| **Ghost** | `px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase text-text-muted/70 hover:text-text-base transition-colors` | "Clear", "Bỏ chọn", "Remove" |
| **Destructive** (chỉ dùng cho delete) | `text-[10px] text-error/60 hover:text-error` inline | Nút "Xóa" trong row bảng |
| **Icon-only ghost** | 32×32, icon 14×14, hover `text-gold` | Nút gắn trong input (search, calendar, clear) |

Spinner trong button: `<Loader2 className="w-3.5 h-3.5 animate-spin" />` đặt trước text.

### 2.5 Inputs

| Loại | Class | Ghi chú |
|---|---|---|
| Text / number / URL | `w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-text-muted placeholder:text-text-disabled focus:outline-none focus:border-gold/40 transition-colors` | Min-height ~ 36px |
| Select | `w-full px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-text-muted/80 focus:outline-none focus:border-gold/40 appearance-none` | Kèm chevron custom bên phải |
| Textarea (multi-line) | Giống input nhưng `min-h-[100px] py-3` | Dùng cho description |
| Textarea (code/JSON) | `font-mono text-xs text-text-muted placeholder:text-text-disabled/60 min-h-[320px] resize-y` | Dùng cho JSON bulk |
| Search | Input trên + icon `<Search className="w-3.5 h-3.5" />` đặt tuyệt đối bên trái trong wrapper, padding-left cho input | |
| File (drag-drop) | `border-2 border-dashed border-[#4D4635] rounded-sm p-12 text-center hover:border-gold/30 transition-colors` | Nền `rgba(18,36,28,0.3)` |
| Checkbox | `w-4 h-4 rounded border-divider bg-surface accent-gold` | |
| Toggle (boolean) | Custom: track `bg-surface border border-divider rounded-full`, thumb `bg-gold`, active state kéo sang phải + đổi track thành `bg-gold/20` | Dùng cho `is_featured` |

### 2.6 Badges & status pills

- **Tier badge (9px font-bold, px-2 py-0.5 rounded):**
  - `SSS` → `bg-gradient-to-r from-gold to-gold-champagne text-background` (gradient gold)
  - `SS` → `bg-gold/20 text-gold border border-gold/40`
  - `S` → `bg-surface text-gold/80 border border-gold/20`
- **Status badge (10px, px-2 py-0.5 rounded, border):**
  - `AVAILABLE` → `text-success border-success/30 bg-success/10`
  - `SOLD_OUT` → `text-error border-error/30 bg-error/10`
- **Tinted banners (px-4 py-3 rounded-sm border, text-xs, có icon 16×16 leading):**
  - Success: `border-success/30 bg-success/5 text-success`
  - Error: `border-error/30 bg-error/5 text-error`
  - Warning: `border-gold/30 bg-gold/5 text-gold`

### 2.7 Tables

- Wrapper: glass card, `rounded-sm overflow-hidden`.
- Header row: `border-b border-divider/30`, cell class `text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-text-muted/50`.
- Body cell: `px-6 py-4 text-xs text-text-muted/70`.
- Row hover: `hover:bg-[rgba(56,52,43,0.1)] transition-colors`.
- Row divider: `border-b border-divider/10`.
- Pagination footer: `flex items-center justify-between px-6 py-4 border-t border-divider/30`. Text "Showing X–Y of Z" dùng `text-[10px] text-text-muted/40`. Page button: `px-3 py-1 text-[10px] ... rounded`. Active: `bg-gold/20 text-gold border border-gold/40`. Disabled: `text-text-muted/50 border border-divider/30`.

### 2.8 Tabs

- Container: `flex items-center gap-6 border-b border-[rgba(241,229,172,0.1)]`.
- Tab button: `relative pb-3 text-xs font-heading tracking-[0.15em] uppercase`.
- Active: `text-gold` + underline `absolute left-0 right-0 -bottom-px h-0.5 bg-gold`.
- Inactive: `text-text-muted/50 hover:text-text-muted`.

### 2.9 Layout

- Page wrapper: `<div className="space-y-6 animate-fade-in">`.
- Max content width: **không giới hạn** (fill 100% của dashboard content area; dashboard đã có sidebar 240px).
- Vertical rhythm: `space-y-6` giữa các section glass; `space-y-4`/`space-y-2` trong section nhỏ.
- Padding card: `p-6` cho form section, `p-8` cho header section lớn, `px-6 py-4` cho header table, `px-6 py-3` cho compact table.
- Animations: `animate-fade-in` cho page entry, `animate-pulse` cho skeleton, `animate-spin` cho loader, `transition-colors` cho hover.

### 2.10 Icons

Dùng **lucide-react**. Bộ icon thường gặp: `Loader2`, `Search`, `Plus`, `Trash2`, `Pencil`, `Save`, `X`, `ChevronLeft`, `ChevronRight`, `ChevronDown`, `Upload`, `Download`, `FileJson`, `FileSpreadsheet`, `CheckCircle2`, `XCircle`, `AlertCircle`, `ArrowRight`, `RotateCcw`, `Image`, `Link2`, `Copy`, `ExternalLink`, `Eye`, `Star`, `Hash`, `Calendar`, `Tag`. Kích thước thường dùng: 14px (nút), 16px (banner), 20px (empty state), 32px (drop zone).

---

## 3. Data Model — `CreateProductInput`

Đây là schema Zod dùng cho cả single create và bulk import. Form New/Edit chỉ cần handle **17 field** này. Tất cả field optional có thể để trống trừ khi ghi chú khác.

| # | Field | Type | Required | Validation | UI control | Placeholder / helper |
|---|---|---|---|---|---|---|
| 1 | `title` | string | ✓ | 2–255 ký tự | Text input lớn (full width) | "Nhẫn Bạc Opal Hổ Ly" |
| 2 | `slug` | string | ✓ | 2–255, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` (lowercase, số, dấu gạch ngang; không bắt đầu/kết thúc/double-dash) | Text input mono, có nút "Generate from title" và nút copy. **Tự động generate khi user rời khỏi title (onBlur) nếu user chưa sửa slug.** Khi user đã sửa thì không override. | "nhan-bac-opal-ho-ly" |
| 3 | `material` | enum | ✓ | xem §3.1 | Select với label VN | — |
| 4 | `category` | enum | ✓ | xem §3.2 | Select với label VN | — |
| 5 | `image_url` | string (URL) | ✓ | http(s)://… HOẶC đường dẫn bắt đầu bằng `/`, ≤ 2000 ký tự | Text input có nút "Upload" (mở file picker — UI-only, xem §6.3) + preview thumbnail 64×64 bên phải | "https://… hoặc /images/products/abc.jpg" |
| 6 | `price` | number (integer) | ✓ | Số nguyên dương, max 999.999.999.999 | Number input, format preview = `formatVND(value)` (xem §3.4) | "2.450.000" |
| 7 | `quality_tier` | enum | ✓ | xem §3.3 | Radio group ngang 3 nút (SSS / SS / S) với badge style tương ứng — click để chọn, có viền gold khi active | — |
| 8 | `code` | string | — | 1–40, UNIQUE khi tồn tại | Text input mono + nút "Auto" để suggest mã tiếp theo theo pattern `EV-XXXX` (xem §6.2) | "EV-0001" |
| 9 | `color` | string | — | 1–60 | Text input ngắn | "Bạc ánh trăng" |
| 10 | `description` | string \| null | — | ≤ 5000 | Textarea 4 rows, char counter `X / 5000` ở góc dưới phải | "Nhẫn bạc 925 đính opal tự nhiên, chạm khắc hổ ly…" |
| 11 | `original_price` | number (integer) | — | ≥ 0 | Number input + format preview, có label "(Giá gốc — để hiển thị giá gạch ngang khi sale)" | "3.200.000" |
| 12 | `era` | string | — | ≤ 255 | Text input | "Victorian, 1890s" |
| 13 | `status` | enum | — | xem §3.4 (mặc định `AVAILABLE` ở server) | Toggle 2 trạng thái: "Có sẵn" / "Hết hàng" (visual: 2 chip ngang, gold border khi active) | — |
| 14 | `is_featured` | boolean | — | — | Toggle switch (xem §2.5) + label "Nổi bật trên trang chủ" | — |
| 15 | `season_tags` | string[] | — | mỗi phần tử ≤ 50, tối đa 20 phần tử | Multi-select chip input: gõ để filter, Enter để thêm, mỗi chip có nút X xoá. **Không bắt buộc nhập từ danh sách cố định** — user tự do nhập string. Gợi ý dưới dạng chip xám nhạt: `HERITAGE_2026`, `WINTER`, `SUMMER_2026`, `VINTAGE_AUTUMN`, `VALENTINE_2026`. | "Thêm tag…" |
| 16 | `collection_id` | string (UUID) | — | UUID hợp lệ | Select (load từ `/api/collections` — chỉ collection đã published) với option "— Không thuộc bộ sưu tập nào —" ở đầu. Hiển thị tên collection. | — |
| 17 | `gallery` | string[] | — | mỗi phần tử cùng rule với `image_url`, tối đa 20 | Multi-URL input: mỗi item là 1 dòng `URL + thumbnail 48×48 + nút X xoá` + nút "+ Thêm ảnh" cuối danh sách. Cho phép drag-reorder (chỉ UI, không bắt buộc) | "https://…/anh-1.jpg" |

### 3.1 Material enum + labels

| Value | Label (VI) |
|---|---|
| `BAC_925` | Bạc 925 |
| `MA_VANG_18K` | Mạ vàng 18K |
| `MA_VANG_24K` | Mạ vàng 24K |
| `VANG_18K` | Vàng 18K |
| `KIM_CUONG` | Kim cương |

### 3.2 Category enum + labels

| Value | Label (VI) |
|---|---|
| `NHAN` | Nhẫn |
| `DAY_CHUYEN` | Dây chuyền |
| `BONG_TAI` | Bông tai |
| `VONG_TAY` | Vòng tay |
| `MAT_DAY` | Mặt dây |

### 3.3 Quality tier enum + labels

| Value | Label (VI) | Badge style |
|---|---|---|
| `SSS` | Mới nguyên seal | Gradient gold |
| `SS` | Trên 95% | Gold/20 + border gold/40 |
| `S` | Trên 90% | Surface + gold/20 border |

### 3.4 Status enum + labels

| Value | Label (VI) | Badge style |
|---|---|---|
| `AVAILABLE` | Có sẵn | Success tint |
| `SOLD_OUT` | Hết hàng | Error tint |

### 3.5 Price formatting

- Input: `number` nguyên (VND, không có đơn vị tỷ/nghìn — backend lưu full integer).
- Hiển thị: `formatVND(amount)` → `"₫2.450.000"` (dấu chấm phân cách hàng nghìn, prefix `₫`).
- Helper: `formatVNDShort(1_500_000_000)` → `"₫1.5 tỷ"`.

---

## 4. Existing Reference Screens (Stitch PHẢI dùng làm visual baseline)

### 4.1 `/dashboard/products` — Products List (đã build)

**URL:** `app/(admin)/dashboard/products/page.tsx` (~445 dòng)

**Mục đích:** liệt kê, filter, search, paginate, chọn nhiều, xóa hàng loạt.

**Layout top-to-bottom:**
1. **Header row** (flex justify-between, wrap):
   - Left: H1 "Products" + subtitle `Manage your inventory — {total} products` (real total từ API).
   - Right: 2 button glass-outline "📥 Bulk Upload" → `/dashboard/products/bulk-upload` + primary gold "+ Add Product" → `/dashboard/products/new`.
2. **Filter bar** (glass card, p-4, flex wrap gap-3):
   - Search input (icon `Search` trái, placeholder "Search by title...").
   - 4 select: Category / Material / Tier / Status.
   - Ghost button "Clear Filters" cuối dòng.
3. **Bulk-actions banner** (xuất hiện khi `selected.size > 0`, glass card, success tint):
   - Text "Đã chọn N sản phẩm".
   - 2 button: ghost "Bỏ chọn" + outline "Xóa tất cả" (chạy `Promise.allSettled`).
4. **Table** (glass wrapper, overflow-x-auto):
   - Header columns: ☐ / Product (title + slug + code vàng nếu có) / Category (label VN) / Material (label VN) / Tier (badge) / Price (`formatVND`) / Status (badge AVAILABLE/SOLD_OUT) / Featured (★/☆) / Updated (`updated_at.slice(0,10)`) / Actions (Edit + Del).
   - Checkbox header: indeterminate state khi chọn một phần.
   - Row hover tint, click row (trừ checkbox/button) → navigate `/dashboard/products/[id]` (TODO).
   - Edit button: link → `/dashboard/products/[id]/edit` (TODO). Del button: confirm + DELETE.
5. **Pagination footer** (border-top, flex justify-between):
   - Left: "Showing X–Y of Z products".
   - Right: page list (first / current±1 / last / ellipsis) + Prev/Next.

**States:** loading (skeleton pulse), empty (`Không có sản phẩm nào phù hợp.`), error (red bar + "Thử lại" button).

### 4.2 `/dashboard/products/bulk-upload` — Bulk Import (đã build)

**URL:** `app/(admin)/dashboard/products/bulk-upload/page.tsx` (~1065 dòng)

**Mục đích:** paste JSON / upload CSV → validate → preview valid+invalid → import 1 phát.

**Layout top-to-bottom:**
1. **Header row** (giống Products List, title "Bulk Import" + subtitle `Import nhiều sản phẩm cùng lúc qua JSON hoặc CSV — tối đa 500 sản phẩm/lần.`).
   - Right: 2 outline button có icon: "📄 JSON Template" + "📊 CSV Template" (download blob).
2. **Mode tabs**: `JSON` | `CSV` (active = gold underline).
3. **Input area** (glass card, p-6):
   - JSON mode: textarea mono min-h-320px, placeholder rút gọn template. Dưới: count line `Tổng: N | Hợp lệ: X | Lỗi: Y` (chỉ hiện sau Validate) + 3 button: ghost "Load example" + outline "Clear" + primary "Validate & Preview".
   - CSV mode: drop zone dashed 2-12 (Upload icon + label "Kéo thả file CSV vào đây" + "hoặc" + primary "Browse files" + hidden `<input type="file" accept=".csv">`). Sau upload: filename + dòng đếm + 2 button "Remove" + "Validate & Preview".
4. **Ready banner** (success tint, có icon `CheckCircle2`): `"Sản phẩm hợp lệ đã sẵn sàng import (N sản phẩm)."`
5. **Import action panel** (glass card, p-6):
   - Left: text `Sẽ gửi N sản phẩm tới POST /api/admin/products/bulk` (mono path).
   - Right: button primary "Import N sản phẩm →" (spinner khi submitting) + sau success: button outline "Import thêm".
   - Result banners:
     - Success: `✓ Đã import N sản phẩm.` (success tint, icon `CheckCircle2`).
     - Partial fail: error tint block list `#{index}: {error}` (max 10 dòng, mono).
     - `BATCH_DUPLICATES`: warning tint, list `Slugs: ..., Codes: ...`.
     - `DB_DUPLICATES`: warning tint, list + ghost button "↻ Remove duplicates & re-validate".
6. **Preview tables** (2 bảng glass-card nối tiếp):
   - **Valid (N)** — header glass bình thường, table columns: `# | Title | Slug (mono) | Category (label) | Material (label) | Tier (badge + "— label") | Price (formatVND)`. Max 50 rows + footer muted "+ M hơn nữa (đã ẩn khỏi preview)".
   - **Invalid (M)** — header bg đỏ nhạt, columns: `# | Row (title hoặc slug, max-w-280 truncate) | Lỗi (mono, 2 issue đầu join "; ")`. Max 20 rows + footer muted tương tự.

**Empty state cho cả 2 bảng:** `Không có dữ liệu để xem. Dán JSON hoặc upload CSV rồi nhấn Validate.`

### 4.3 Templates (Stitch dùng làm mẫu dữ liệu trong mockup)

**JSON template (paste vào textarea JSON):**
```json
[
  {
    "title": "Nhẫn Bạc Opal Hổ Ly",
    "slug": "nhan-bac-opal-ho-ly",
    "material": "BAC_925",
    "category": "NHAN",
    "image_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800",
    "price": 2450000,
    "quality_tier": "SS",
    "code": "EV-0001",
    "color": "Bạc ánh trăng",
    "description": "Nhẫn bạc 925 đính opal tự nhiên, chạm khắc hổ ly.",
    "is_featured": true,
    "status": "AVAILABLE",
    "season_tags": ["HERITAGE_2026", "WINTER"],
    "gallery": [
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800",
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200"
    ]
  },
  {
    "title": "Dây Chuyền Sapphire Đại Dương",
    "slug": "day-chuyen-sapphire-dai-duong",
    "material": "BAC_925",
    "category": "DAY_CHUYEN",
    "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800",
    "price": 3200000,
    "quality_tier": "SSS",
    "code": "EV-0002",
    "color": "Bạc Ý — Sapphire xanh dương",
    "is_featured": true,
    "status": "AVAILABLE"
  }
]
```

**CSV template (header + 2 dòng dữ liệu):**
```csv
title,slug,material,category,image_url,price,quality_tier,code,color,description,original_price,era,status,is_featured,season_tags,gallery,collection_id
Nhẫn Bạc Opal Hổ Ly,nhan-bac-opal-ho-ly,BAC_925,NHAN,https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800,2450000,SS,EV-0001,Bạc ánh trăng,"Nhẫn bạc 925 đính opal tự nhiên, chạm khắc hổ ly.",,HERITAGE_2026;WINTER,https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800;https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200,
Dây Chuyền Sapphire Đại Dương,day-chuyen-sapphire-dai-duong,BAC_925,DAY_CHUYEN,https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800,3200000,SSS,EV-0002,Bạc Ý — Sapphire xanh dương,,,,,,,,
```

Ghi chú CSV: `description` quote vì có dấu phẩy; `season_tags`/`gallery` phân cách bằng `;` trong cùng 1 cell.

---

## 5. Backend API (form sẽ gọi các endpoint này)

Base: `/api/admin/products`. Tất cả yêu cầu admin auth (cookie + role). 401/403 nếu chưa login / không phải admin.

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/admin/products?keyword=&category=&material=&tier=&status=&is_featured=&collection_id=&page=&pageSize=` | — | 200 `{ ok: true, data: AdminProduct[], total, page, pageSize }` |
| `POST` | `/api/admin/products` | `CreateProductInput` | 201 `{ ok: true, data: AdminProduct }` · 400 `INVALID_BODY` · 409 `SLUG_EXISTS` / `CODE_EXISTS` / `DUPLICATE_KEY` |
| `PATCH` | `/api/admin/products/[id]` | `UpdateProductInput` (partial) | 200 `{ ok: true, data }` · 400 / 409 |
| `DELETE` | `/api/admin/products/[id]` | — | 200 `{ ok: true, id }` (hard delete) |
| `POST` | `/api/admin/products/bulk` | `{ products: CreateProductInput[], atomic?: boolean }` (1–500) | 201 `{ ok: true, inserted, failed, errors?, data }` · 400 `BATCH_DUPLICATES` · 409 `DB_DUPLICATES` |

`AdminProduct` = full `ProductRow` (xem §6 để biết field nào lưu DB).

---

## 6. Trang cần Generate — **New Product** (`/dashboard/products/new`)

### 6.1 Route & shell

- **Route:** `app/(admin)/dashboard/products/new/page.tsx` ('use client').
- **Breadcrumb trên header (sub-H1):** `Products / New product` (text-xs text-text-muted/50, mono).
- **Header row:**
  - Left: H1 "New Product" + subtitle `Tạo kho báu mới cho bộ sưu tập Emerald Vault.`
  - Right: 2 button: ghost "← Quay lại" (→ `/dashboard/products`) + primary "Tạo sản phẩm" (submit, có spinner khi loading). Lưu ý: KHÔNG cần nút "Save draft" vì schema không có status DRAFT.

### 6.2 Form layout

Form là 1 cột duy nhất (full width trong dashboard content), chia thành **5 glass card sections** theo thứ tự:

#### Section 1 — Thông tin cơ bản (glass card, p-6, space-y-4)

- H2 "THÔNG TIN CƠ BẢN" (font-heading, gold, uppercase).
- Field `title` (full width, input lớn hơn 1 chút: `py-2.5 text-sm`).
- Field `slug` (input mono, có 2 action button inline bên phải):
  - Ghost button "↻ Generate" — tự sinh từ title (lowercase, bỏ dấu tiếng Việt, thay space bằng `-`).
  - Outline button 32×32 icon `Copy` — copy slug ra clipboard (hiện toast "Đã copy" 1.5s).
- Field `code` (input mono, có ghost button "Auto" bên phải):
  - Nút "Auto" gọi `/api/admin/products?keyword=EV-` hoặc query đếm max code hiện có (`MAX(CAST(SUBSTRING(code FROM 4) AS INT))`) rồi suggest `EV-XXXX` (zero-pad 4 chữ số).
- Field `category` + `material` (grid 2 cột md:grid-cols-2 gap-4).
- Field `quality_tier` (radio group ngang 3 nút, mỗi nút hiển thị badge tương ứng + label nhỏ phía dưới; active = viền gold 2px + nền gold/10).
- Field `status` (toggle group 2 chip: "Có sẵn" / "Hết hàng"; default "Có sẵn" active).
- Field `is_featured` (toggle switch + label bên phải "Nổi bật trên trang chủ").
- Field `color` + `era` (grid 2 cột).

#### Section 2 — Giá (glass card, p-6, space-y-4)

- H2 "GIÁ & KHOẢN GIÁ".
- Field `price` (number input + label phụ "VND" + preview text-format `≈ formatVND(value)` hiển thị bên dưới input, mono, gold). Preview update realtime khi gõ.
- Field `original_price` (number input + helper "Để trống nếu không sale. Khi có, frontend sẽ hiển thị giá gạch ngang bên cạnh giá bán." + preview `formatVND`).
- Field `description` (textarea 4 rows, char counter `X / 5000` ở góc dưới phải, helper dưới "Mô tả chi tiết giúp khách hàng hiểu câu chuyện và đặc điểm sản phẩm.").

#### Section 3 — Hình ảnh & media (glass card, p-6, space-y-4)

- H2 "HÌNH ẢNH & MEDIA".
- Field `image_url` (input URL + button outline "Upload" bên phải — click mở file picker, UI-only; sau khi chọn file sẽ hiển thị local preview thumbnail 64×64 ở góc phải input. KHÔNG upload thật, chỉ dùng `URL.createObjectURL(file)` cho preview và KHÔNG include data URL vào submit payload).
- Preview ảnh chính: glass card con bên dưới, 128×128 thumbnail, nếu không có ảnh thì hiển thị placeholder "Chưa có ảnh" với icon `Image` 32px muted.
- Field `gallery` (multi-row input):
  - Mỗi row: input URL + thumbnail 48×48 preview (hoặc placeholder) + icon button `Trash2` (32×32 ghost) để xoá.
  - Nút outline "+ Thêm ảnh" cuối danh sách (max 20).
  - Helper: "Tối đa 20 ảnh. Ảnh đầu tiên dùng làm thumbnail chính nếu image_url trống."

#### Section 4 — Phân loại & bộ sưu tập (glass card, p-6, space-y-4)

- H2 "PHÂN LOẠI".
- Field `collection_id` (select với option đầu `— Không thuộc bộ sưu tập nào —`, các option sau load từ `/api/collections` (chỉ `is_published = true`), label = collection name).
- Field `season_tags` (chip input):
  - Input nhỏ bên trái có placeholder "Thêm tag…", Enter để commit.
  - Mỗi tag đã thêm = chip glass với nút X xoá.
  - Dưới input: dòng "Gợi ý:" + 5 chip xám nhạt (HERITAGE_2026 / WINTER / SUMMER_2026 / VINTAGE_AUTUMN / VALENTINE_2026) — click để add nhanh.

#### Section 5 — Review & actions (glass card, p-6)

- KHÔNG có section này — actions nằm ở footer sticky dưới cùng (xem §6.4).

### 6.3 Upload button (UI-only note cho Stitch)

File picker chỉ preview local, không upload lên storage. Khi user chọn file:
1. Validate là image (`file.type.startsWith('image/')`).
2. Tạo `URL.createObjectURL(file)`, set làm preview.
3. Submit form sẽ gửi URL rỗng (chưa upload thật) — backend sẽ nhận image_url trống nếu user chưa paste URL thật. Nên hiển thị banner cảnh báo: "Bạn đã chọn file local nhưng chưa upload. Vui lòng paste URL ảnh thật hoặc upload lên storage trước khi lưu." (warning tint).

### 6.4 Footer sticky (actions)

Dưới cùng page, full width, glass card đậm hơn (border-top gold/30, backdrop blur cao hơn), padding `py-4 px-6`, flex justify-between:

- Left: helper text `Các trường có dấu * là bắt buộc.` (text-xs text-text-muted/50).
- Right: 3 button:
  - Ghost "Xem trước" (mở `/san-pham/[slug]` ở tab mới — dùng slug hiện tại, có thể slug rỗng → disable).
  - Outline "Hủy" (back to `/dashboard/products`).
  - Primary "Tạo sản phẩm" (submit form, spinner khi loading, disabled khi form invalid).

### 6.5 Form behavior chi tiết

- **Client-side validation** (Zod `CreateProductSchema`) trước khi submit, hiển thị inline error dưới mỗi field:
  - Mỗi field có 1 dòng error text-xs text-error min-h-4 (để tránh layout shift).
  - Field invalid: border-error/50.
  - Focus vào field đầu tiên invalid khi submit fail.
- **Slug auto-generate logic:** khi user blur khỏi `title`:
  - Nếu `slug` đang rỗng HOẶC slug hiện tại bằng slug tự sinh trước đó từ title cũ → tự động sinh lại từ title mới.
  - Nếu user đã tự sửa slug (khác slug tự sinh) → KHÔNG override.
  - Hàm slugify: lowercase → bỏ dấu tiếng Việt (NFD + remove combining marks) → thay ký tự không phải `[a-z0-9]` bằng `-` → collapse nhiều `-` thành 1 → trim `-` ở 2 đầu.
- **Slug uniqueness check (optional, debounced 500ms):** gọi `GET /api/admin/products?keyword=<slug>` filter `slug.eq`, nếu count > 0 thì hiển thị warning dưới field (KHÔNG block submit, vì backend sẽ trả 409 nếu trùng). Helper text: "Slug này đã tồn tại — chọn slug khác để tránh lỗi." (warning tint).
- **Submit flow:**
  1. Validate client-side.
  2. `POST /api/admin/products` với payload = form values.
  3. Loading state: button spinner + disable form + hiện overlay glass mờ "Đang tạo sản phẩm…".
  4. On 201 → toast success góc trên-phải (gold tint) "✓ Đã tạo sản phẩm." + redirect `/dashboard/products` sau 1.2s.
  5. On 409 `SLUG_EXISTS` → focus slug field, hiện error.
  6. On 409 `CODE_EXISTS` → focus code field, hiện error.
  7. On 500 → toast error (error tint) "Tạo sản phẩm thất bại. Thử lại sau." + giữ form values.

### 6.6 Empty state (chưa cần — form luôn có field trống sẵn)

---

## 7. Trang cần Generate — **Edit Product** (`/dashboard/products/[id]/edit`)

### 7.1 Route & shell

- **Route:** `app/(admin)/dashboard/products/[id]/edit/page.tsx` ('use client').
- **Data load:** khi mount, `GET /api/admin/products` filter `id.eq.<id>` (hoặc dùng `getAdminProductById` — chưa expose qua API public; tạm thời có thể fetch pageSize=1 + filter keyword, hoặc tạo thêm endpoint `GET /api/admin/products/[id]` — đề xuất thêm endpoint này).
- **Loading state:** hiển thị skeleton form (5 glass card với placeholder `animate-pulse`).
- **Error state:** nếu load fail → red bar "Không tải được sản phẩm" + button "Thử lại". Nếu 404 → "Sản phẩm không tồn tại" + button "← Quay lại danh sách".

### 7.2 Header (khác New Product)

- Breadcrumb: `Products / {title}` (text-xs text-text-muted/50, mono). `title` từ data.
- H1: title sản phẩm (font-heading text-2xl font-bold text-text-base tracking-tight) — KHÔNG dùng "Edit Product" cố định, mà hiển thị tên sản phẩm thật.
- Subtitle: `Slug: {slug} · Code: {code || "—"} · Cập nhật lần cuối: {updated_at || "—"}` (text-sm text-text-muted/60, mono phần slug/code).
- Right: 3 button:
  - Ghost icon-only `ExternalLink` (32×32) → mở `/san-pham/{slug}` ở tab mới (preview trên storefront).
  - Outline "← Quay lại".
  - Primary "Lưu thay đổi" (submit, spinner khi loading, disabled khi form chưa dirty hoặc invalid).

### 7.3 Form layout

**GIỐNG HỆT New Product** (5 sections, cùng field, cùng control, cùng helper text), với 2 khác biệt:

1. **Pre-fill tất cả field** từ data load về.
2. **Slug auto-generate KHÔNG hoạt động** ở Edit (vì slug đã tồn tại; user muốn đổi thì sửa thủ công).

### 7.4 Banner cảnh báo (chỉ Edit)

Ngay dưới header, **trước Section 1**, hiển thị 1 warning banner glass card với icon `AlertCircle` 16px:

- Nếu `status === 'SOLD_OUT'`: `"Sản phẩm đang ở trạng thái Hết hàng. Khách hàng sẽ không thấy trên storefront trừ khi bạn đổi sang Có sẵn."` (warning tint).
- Nếu `created_at` < 30 ngày: `"Sản phẩm mới — chưa có đơn hàng nào. Theo dõi tại Dashboard → Orders."` (info tint, icon `Info`).

### 7.5 Form behavior

- **Dirty tracking:** so sánh form values với data ban đầu. Button "Lưu thay đổi" disabled khi !dirty hoặc invalid. Hiển thị chip nhỏ `Đã có thay đổi chưa lưu` (text-xs text-gold/70, có dot gold pulse) góc trên-phải của H1 khi dirty.
- **Submit flow:**
  1. Client-side validate.
  2. `PATCH /api/admin/products/[id]` với payload = **CHỈ những field đã thay đổi** (so với data ban đầu) — dùng `Object.fromEntries(Object.entries(payload).filter(([k, v]) => v !== original[k]))`. Giảm payload, tăng tốc, tránh ghi đè nhầm field khác.
  3. On 200 → toast success "✓ Đã lưu thay đổi." + update local state với data mới + reset dirty flag.
  4. On 409 `SLUG_EXISTS` / `CODE_EXISTS` → focus field tương ứng, error inline.
  5. On 500 → toast error + giữ form.
- **Discard changes:** nút "Hủy thay đổi" (ghost, nằm cạnh nút Lưu) — chỉ hiện khi dirty. Click → confirm "Hủy mọi thay đổi?" → reset form về data ban đầu.

### 7.6 Danger zone (chỉ Edit, ở cuối form)

Sau 5 sections, **1 glass card** với border-error/30 + bg-error/5, p-6:

- H2 "VÙNG NGUY HIỂM" (text-error, font-heading uppercase).
- Text: "Xóa sản phẩm là hành động không thể hoàn tác. Sản phẩm sẽ bị gỡ khỏi mọi bộ sưu tập và đơn hàng cũ vẫn giữ nguyên (do dùng snapshot)."
- Right: button outline-error "Xóa sản phẩm này" (text-error border-error/40 hover:bg-error/10).
- Click → modal confirm:
  - Glass card overlay (bg-black/60 backdrop-blur).
  - Modal glass-card p-8 max-w-md centered, có icon `AlertCircle` 32px text-error ở top.
  - H3 "Xóa sản phẩm này?"
  - Body: `Bạn sắp xóa vĩnh viễn "{title}". Hành động này KHÔNG thể hoàn tác.`
  - Helper: `Slug: {slug} · Code: {code || "—"}` (mono, muted).
  - 2 button: ghost "Hủy" + primary-error "Xóa vĩnh viễn" (bg-error text-background hover:bg-error/90).
  - Loading state: spinner trên nút Xóa, disable cả 2 nút.
  - Success: toast error "Đã xóa." + redirect `/dashboard/products`.
  - Failure: toast error "Xóa thất bại."

---

## 8. Cải thiện Bulk Import (optional — nếu Stitch refine)

Trang `/dashboard/products/bulk-upload` đã đầy đủ, nhưng Stitch có thể thêm:

- **Recent imports history** (1 glass card phía dưới cùng, chỉ hiện nếu có data): bảng 5 lần import gần nhất, columns: `Thời gian | User | Inserted | Failed | [View]`. Lưu ý: CẦN backend endpoint mới `/api/admin/products/bulk/history` (chưa có).
- **Drag-drop nhiều file**: hiện tại chỉ 1 file. Nâng cấp: thả nhiều file, mỗi file là 1 batch riêng.
- **Download error report CSV**: sau khi import fail, nút "Tải báo cáo lỗi (CSV)" để user mở Excel xem.

Nếu không thêm gì thì giữ nguyên như §4.2.

---

## 9. Components & utilities CẦN TÁI SỬ DỤNG (mockup phải match)

| Thứ | Path | Dùng cho |
|---|---|---|
| `formatVND(n)` | `lib/utils.ts` | Mọi hiển thị giá |
| `MATERIAL_LABELS` | `lib/utils.ts` | Map `BAC_925 → "Bạc 925"` |
| `CATEGORY_LABELS` | `lib/utils.ts` | Map `NHAN → "Nhẫn"` |
| `TIER_LABELS` | `lib/utils.ts` | Map `SSS → "Mới nguyên seal"` |
| `cn(...)` | `lib/utils.ts` | Merge className |
| `<Button>` | `components/ui/button.tsx` | Primary/secondary/ghost (variant + size) |
| `<Card>` / `<CardContent>` | `components/ui/card.tsx` | Glass card wrap (nếu dùng) |
| `ProductRow` type | `lib/supabase/types.ts` | Type full DB row |
| `CreateProductSchema` | `lib/admin/products-schema.ts` | Validate form (Zod) |
| Icons | `lucide-react` | Mọi icon |

---

## 10. Những điều CẦN / KHÔNG CẦN

### 10.1 CẦN
- Dùng **đúng 17 field** ở §3. KHÔNG bịa thêm field (story_quote, story_body, highlight_*, meta_title/description tồn tại trong DB nhưng CHƯA có trong CreateProductSchema — KHÔNG đưa vào form, sẽ thêm ở phase sau).
- Dùng **đúng enum value** (`BAC_925`, `NHAN`, `SSS`, `AVAILABLE`…) và **đúng label VN** ở §3.1–3.4.
- Hiển thị giá = `formatVND(price)` (ví dụ `₫2.450.000`).
- Mọi label/button/message **bằng tiếng Việt** (trừ brand "Emerald Vault" và admin label "Bulk Import" / "Products" / "Dashboard" theo convention EN-viết-hoa của Figma gốc).
- Glass card style (§2.2) phải xuất hiện ở MỌI panel/table/form-section.
- Nút primary = gold (§2.4) dùng cho action chính duy nhất của mỗi page.
- Có **loading + error + empty state** cho mọi async operation.
- Toast notification góc trên-phải (fixed top-6 right-6, glass card tint success/error, tự dismiss 3s) — dùng `sonner` hoặc custom.
- Modal confirm (xóa) dùng overlay glass + modal glass card, max-w-md centered.

### 10.2 KHÔNG CẦN
- KHÔNG dùng màu sáng (white background, vibrant blue/red) — phải giữ dark theme.
- KHÔNG dùng font khác Cinzel/Inter/mono.
- KHÔNG dùng rounded lớn (max `rounded-sm` = 2px) hoặc shadow đậm.
- KHÔNG dùng emoji làm icon chính (chỉ dùng cho button label "📥 Bulk Upload" / "📄 JSON Template" / "📊 CSV Template" theo style đã có).
- KHÔNG thêm field DRAFT vào status (chỉ AVAILABLE / SOLD_OUT).
- KHÔNG thêm tier A/B/C (chỉ SSS/SS/S).
- KHÔNG vẽ minh họa sản phẩm thật — chỉ dùng placeholder ảnh Unsplash đã có trong template.
- KHÔNG cần login page / forgot password / signup (out of scope).

---

## 11. Validation messages (tiếng Việt, copy y hệt trong mockup)

| Rule | Message (VI) |
|---|---|
| Title required | "Tên sản phẩm là bắt buộc (tối thiểu 2 ký tự)." |
| Slug invalid | "Slug chỉ chứa chữ thường, số và dấu gạch ngang (vd: `nhan-bac-opal`)." |
| Slug exists | "Slug này đã tồn tại — chọn slug khác." |
| Code exists | "Mã sản phẩm (code) này đã tồn tại." |
| Material required | "Vui lòng chọn chất liệu." |
| Category required | "Vui lòng chọn danh mục." |
| Image URL invalid | "URL ảnh không hợp lệ. Dùng `https://…` hoặc đường dẫn `/images/…`." |
| Price required | "Giá bán là bắt buộc." |
| Price invalid | "Giá phải là số nguyên dương." |
| Tier required | "Vui lòng chọn phân hạng chất lượng." |
| Description too long | "Mô tả tối đa 5000 ký tự." |
| Gallery > 20 | "Tối đa 20 ảnh trong gallery." |
| Save success | "✓ Đã tạo sản phẩm." / "✓ Đã lưu thay đổi." |
| Delete success | "Đã xóa sản phẩm." |
| Generic error | "Đã có lỗi xảy ra. Vui lòng thử lại." |

---

## 12. Quick checklist khi Stitch generate

- [ ] Có 5 glass card sections trong form (Thông tin cơ bản / Giá / Hình ảnh / Phân loại / [Edit: Vùng nguy hiểm])
- [ ] Header có breadcrumb + H1 + subtitle + 2–3 button bên phải
- [ ] Footer sticky có helper text + 2–3 button (Xem trước / Hủy / Submit)
- [ ] `quality_tier` là radio group 3 nút với badge style
- [ ] `is_featured` là toggle switch
- [ ] `status` là 2 chip toggle
- [ ] `season_tags` là chip input có gợi ý
- [ ] `gallery` là multi-row có nút + Thêm ảnh
- [ ] Validation inline dưới mỗi field
- [ ] Loading skeleton cho Edit page khi đang fetch data
- [ ] Modal confirm cho delete (Edit page)
- [ ] Dirty tracking + nút "Hủy thay đổi" (Edit page)
- [ ] Warning banner cho SOLD_OUT (Edit page)
- [ ] Toast notification góc trên-phải
- [ ] Toàn bộ dùng dark theme + glass card + gold accent
- [ ] Slug/Code field có font mono
- [ ] Price field có preview `formatVND` realtime
- [ ] Description có char counter

---

**HẾT.** Paste toàn bộ file này vào Google Stitch cùng với 2 screenshot/mockup hiện có của Products List và Bulk Import (nếu đã render) để Stitch có visual baseline chính xác.
