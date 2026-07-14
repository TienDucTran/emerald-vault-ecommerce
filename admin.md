# ADMIN DASHBOARD — PHẠM VI QUẢN LÝ & TRIỂN KHAI

> File tham chiếu cho module Admin của Emerald Vault. Tổng hợp từ `flows.md` §3.2, §7, §11 và khảo sát codebase thực tế. Mọi task admin phải đối chiếu với file này trước khi code.

---

## 0. TỔNG QUAN & TRẠNG THÁI HIỆN TẠI

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| **Auth admin (login / 403)** | ❌ Chưa có | Chưa có `middleware.ts`, chưa có `requireAdmin()` |
| **Layout admin (sidebar + gate)** | ❌ Chưa có | Chưa có `app/(admin)/layout.tsx` |
| **Tổng quan (dashboard)** | ❌ Chưa có | `app/(admin)/dashboard/page.tsx` |
| **Sản phẩm (list/new/bulk)** | ❌ Chưa có | Có `lib/supabase/queries/products.ts` (read-only) — chưa có UI admin và route mutation |
| **Bộ sưu tập (CRUD)** | ❌ Chưa có | Có `lib/supabase/queries/collections.ts` (read-only) |
| **Đơn hàng (list/detail)** | ❌ Chưa có | |
| **Thanh toán MoMo (monitor)** | ❌ Chưa có | MoMo API (`/api/momo/*`) cũng chưa có |
| **Analytics nội bộ** | ❌ Chưa có | |
| **Cấu hình (settings)** | ❌ Chưa có | |
| **Newsletter subscribers** | ❌ Chưa có | |
| **RLS policies** | ❌ Chưa có | `supabase/migrations/0003_rls_policies.sql` chưa viết |
| **Bootstrap admin đầu tiên** | ❌ Chưa có | Cần chạy SQL tay để set `profiles.role='admin'` |

> **Rủi ro hiện tại**: Không có middleware, không có RLS — DB đang mở sau lớp anon key. Mọi admin route phải kèm role-check ở server trước khi dùng service-role client.

---

## 1. KIẾN TRÚC ADMIN

```
/admin/login          (public, KHÔNG có admin chrome)
        │
        ▼  (Đăng nhập Supabase Auth — email + password)
        │
   [middleware.ts]  matcher: ['/dashboard/:path*', '/api/admin/:path*']
        │  supabase.auth.getUser() + check profiles.role === 'admin'
        │  ├─ no user       → redirect /admin/login
        │  └─ role != admin → redirect /403
        ▼
/dashboard/*          (route group app/(admin)/dashboard/...)
   layout.tsx         (Sidebar + Header + Auth gate server-side)
        │
        ├─ /                  Tổng quan
        ├─ /products          Danh sách + filter + edit
        ├─ /products/new      Tạo đơn lẻ
        ├─ /products/bulk-upload   Bulk upload (XLSX/CSV)
        ├─ /collections       Danh sách + CRUD
        ├─ /collections/[id]  Edit
        ├─ /orders            Danh sách + filter
        ├─ /orders/[id]       Chi tiết + cập nhật trạng thái
        ├─ /payments          MoMo monitor (payment_transactions)
        ├─ /newsletter        Subscribers + export CSV
        ├─ /analytics         Revenue, conversion, AOV
        └─ /settings          Site config, shipping, MoMo creds UI
```

### Auth model

- **Bảng `auth.users`** (Supabase) + `app_metadata.role = 'admin'` HOẶC `profiles.role = 'admin'` (khuyến nghị dùng `profiles` cho dễ đổi quyền mà không đụng Auth).
- **`middleware.ts`** (root project) dùng `@supabase/ssr` đọc cookie, gọi `supabase.auth.getUser()`, query `profiles.role`, redirect nếu fail.
- **Server-side guard** trong MỌI `/api/admin/*` route: lại gọi `getUser()` + check role (middleware có thể bypass qua cookie edge-case) — chỉ khi pass mới dùng `createAdminClient()` ở `lib/supabase/admin.ts`.

### Env vars cần thêm (chỉ server)
```bash
# Đã có trong flows.md §14
SUPABASE_SERVICE_ROLE_KEY=        # bắt buộc cho /api/admin/*
```

### Packages cần cài bổ sung
```bash
npm i xlsx                         # SheetJS — parse .xlsx/.csv
npm i @tanstack/react-table        # table mạnh cho list products/orders
npm i date-fns                     # format ngày
npm i @next/third-parties          # (GA4, đã liệt kê trong flows.md)
```

---

## 2. DANH SÁCH BẢNG ADMIN PHẢI QUẢN LÝ

> Tất cả schema đã chuẩn hóa trong `flows.md` §2. Bảng dưới liệt kê action admin cần thực hiện trên từng bảng.

### 2.1. `products` (Sản phẩm)
| Action | API | Mô tả |
|---|---|---|
| List + filter | `GET /api/admin/products` | Filter: `collection_id`, `category`, `material`, `quality_tier`, `status`, `is_featured`, `season_tags`, search `title`. Pagination. |
| Create | `POST /api/admin/products` | Form đơn (1 ảnh + gallery) → upload Storage → insert row |
| Update | `PATCH /api/admin/products/[id]` | Đổi giá, tier, season, status, is_featured, gallery, description, ảnh |
| Archive | `PATCH /api/admin/products/[id]` `{status: 'SOLD_OUT'}` | Hoặc soft-archive nếu muốn hiển thị lại |
| Delete (hard) | `DELETE /api/admin/products/[id]` | Cẩn thận FK `order_items`; cảnh báo nếu đã từng bán |
| Bulk import | `POST /api/admin/bulk-import` | XLSX/CSV → validate zod → upload ảnh song song → insert transaction |

**Trường cần validate** (zod):
- `title` (1-255), `slug` (auto từ title, unique)
- `price` > 0, `material`, `category`, `quality_tier` (enum)
- `image_url` bắt buộc, `gallery` optional
- `status` enum, `is_featured` bool, `season_tags` string[]

**Upload ảnh**:
- Bucket `jewelry-images` (public), convert `.webp` client-side trước khi upload (giảm bandwidth).
- API nhận `multipart/form-data` → dùng `createAdminClient().storage.from('jewelry-images').upload()`.
- Trả về `publicUrl`, lưu vào `image_url` / `gallery`.

### 2.2. `collections` (Bộ sưu tập)
| Action | API | Mô tả |
|---|---|---|
| List | `GET /api/admin/collections` | Tất cả, kể cả `is_published = false` |
| Create | `POST /api/admin/collections` | Name, slug auto, cover_image upload |
| Update | `PATCH /api/admin/collections/[id]` | Đổi cover, description, display_order, is_published |
| Delete | `DELETE /api/admin/collections/[id]` | Soft nếu có product FK; hiển thị confirm |

**Lưu ý FK**: `products.collection_id` dùng `ON DELETE SET NULL` (xem flows.md §2.1) — an toàn, không lệch sản phẩm.

### 2.3. `orders` + `order_items` (Đơn hàng)
| Action | API | Mô tả |
|---|---|---|
| List | `GET /api/admin/orders` | Filter: `status`, `payment_status`, `payment_method`, date range, search by `code` / `customer_phone` |
| Detail | `GET /api/admin/orders/[id]` | Kèm items, payment_transactions, timeline |
| Update status | `PATCH /api/admin/orders/[id]` `{status}` | NEW → CONFIRMED → SHIPPING → DONE (hoặc CANCELLED) |
| Confirm COD thủ công | `PATCH /api/admin/orders/[id]` `{payment_status: 'PAID', status: 'CONFIRMED'}` | Khi shipper báo đã thu tiền |
| Refund | `PATCH /api/admin/orders/[id]` `{payment_status: 'REFUNDED'}` | Có thể kèm ghi chú nội bộ (cần thêm bảng `order_notes` P2) |
| Export CSV | `GET /api/admin/orders/export` | Filter giống list, trả CSV stream |

**State machine** (flows.md §2.4):
```
NEW ─► CONFIRMED ─► SHIPPING ─► DONE
  └─► CANCELLED
```

### 2.4. `payment_transactions` (MoMo log)
| Action | API | Mô tả |
|---|---|---|
| List | `GET /api/admin/payments` | Filter: `status`, `result_code`, date range, search `momo_order_id` |
| Detail | `GET /api/admin/payments/[id]` | Kèm full payload MoMo trả về + audit log |
| Retry reconciliation | `POST /api/admin/payments/[id]/recheck` | Gọi `queryStatus` lên MoMo (nếu cần), update lại DB |
| Mark manual | `PATCH /api/admin/payments/[id]` `{admin_note}` | Ghi chú nội bộ, không thay đổi status thật |

**Quan trọng** (flows.md §7.3): IPN là source of truth, không sửa `status` thủ công trừ khi đã xác minh qua MoMo. Admin UI hiển thị badge rõ ràng:
- 🟢 SUCCESS (`resultCode=0`)
- 🟡 REDIRECTED (chưa có IPN)
- 🔴 FAILED (`resultCode!=0`)
- ⚪ CREATED (chưa redirect)

### 2.5. `inventory_locks` (Khóa tạm)
| Action | API | Mô tả |
|---|---|---|
| List active | `GET /api/admin/locks?status=ACTIVE` | Xem khách nào đang giữ hàng (debug support) |
| Force release | `DELETE /api/admin/locks/[id]` | Dùng khi khách gọi điện hỏi / sự cố — set `status='RELEASED'` |
| Cron check | RPC `release_expired_locks` | Đã có trong flows.md §2.7 — chỉ cần verify pg_cron bật |

### 2.6. `profiles` (User role)
| Action | API | Mô tả |
|---|---|---|
| List admins | `GET /api/admin/profiles?role=admin` | Hiển thị ai có quyền |
| Promote | `PATCH /api/admin/profiles/[id]` `{role: 'admin'}` | Cẩn thận — chỉ super-admin mới promote được |
| Demote | `PATCH /api/admin/profiles/[id]` `{role: 'customer'}` | |

> **Bootstrap admin đầu tiên** (chạy tay qua SQL Editor):
> ```sql
> UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'owner@emerald-vault.vn');
> ```

### 2.7. `newsletter_subscribers` (nếu có)
> Chưa thấy schema trong flows.md — cần thêm migration `0006_newsletter.sql`:
> ```sql
> CREATE TABLE newsletter_subscribers (
>   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   email VARCHAR(255) UNIQUE NOT NULL,
>   source VARCHAR(50),          -- 'home' | 'popup' | 'checkout'
>   is_active BOOLEAN DEFAULT true,
>   subscribed_at TIMESTAMPTZ DEFAULT NOW(),
>   unsubscribed_at TIMESTAMPTZ
> );
> ```
>
> | Action | API |
> |---|---|
> | List | `GET /api/admin/newsletter` |
> | Export CSV | `GET /api/admin/newsletter/export` |

### 2.8. Storage bucket `jewelry-images`
- Admin upload qua `createAdminClient().storage.from('jewelry-images')`.
- Public read đã bật (xem flows.md §1).
- **Cần thêm**: tool "dọn ảnh orphan" (ảnh trong storage không còn trong `products.image_url` / `gallery`) — chạy 1 lần/tháng.

---

## 3. SƠ ĐỒ TRANG ADMIN

### 3.1. Customer-facing đã làm xong (tham chiếu) → Admin giờ mới bắt đầu

> Tất cả file dưới đây **CHƯA TỒN TẠI**, cần tạo mới.

```
app/
├── (admin)/
│   └── dashboard/
│       ├── layout.tsx              # Auth gate + Sidebar + Header
│       ├── page.tsx                # TỔNG QUAN
│       ├── products/
│       │   ├── page.tsx            # LIST (filter, search, sort, paginate)
│       │   ├── new/page.tsx        # FORM TẠO MỚI
│       │   ├── [id]/page.tsx       # EDIT
│       │   └── bulk-upload/page.tsx  # XLSX/CSV + table preview
│       ├── collections/
│       │   ├── page.tsx            # LIST + CRUD modal
│       │   └── [id]/page.tsx       # EDIT
│       ├── orders/
│       │   ├── page.tsx            # LIST (filter, export)
│       │   └── [id]/page.tsx       # DETAIL + status update
│       ├── payments/
│       │   ├── page.tsx            # MoMo monitor
│       │   └── [id]/page.tsx       # Payment detail
│       ├── newsletter/page.tsx     # Subscribers + export
│       ├── analytics/page.tsx      # Revenue chart, AOV, conversion
│       └── settings/page.tsx       # Site config, shipping, policy links
├── admin/
│   ├── login/page.tsx              # Form login Supabase Auth
│   └── 403/page.tsx                # Forbidden (retro style)
└── middleware.ts                   # Role check edge

app/api/admin/
├── products/
│   ├── route.ts                    # GET (list) | POST (create)
│   └── [id]/route.ts               # PATCH | DELETE
├── bulk-import/route.ts            # POST multipart
├── collections/
│   ├── route.ts                    # GET | POST
│   └── [id]/route.ts               # PATCH | DELETE
├── orders/
│   ├── route.ts                    # GET (list) | export CSV
│   └── [id]/route.ts               # GET detail | PATCH status
├── payments/
│   ├── route.ts                    # GET list
│   └── [id]/route.ts               # GET detail | PATCH note
├── locks/
│   ├── route.ts                    # GET active
│   └── [id]/route.ts               # DELETE (force release)
├── profiles/
│   ├── route.ts                    # GET admins
│   └── [id]/route.ts               # PATCH role
└── newsletter/
    ├── route.ts                    # GET
    └── export/route.ts             # GET CSV
```

---

## 4. CẤU TRÚC COMPONENT ADMIN

```
components/
├── admin/
│   ├── admin-shell.tsx             # Sidebar + main slot (dùng trong layout.tsx)
│   ├── stat-card.tsx               # Card KPI: revenue, count, AOV
│   ├── revenue-chart.tsx           # Line chart 30 ngày (recharts)
│   ├── recent-orders-table.tsx     # 10 đơn mới nhất (dashboard home)
│   ├── low-stock-alerts.tsx        # Banner: lock sắp expire
│   │
│   ├── product-form.tsx            # Form tạo/sửa 1 sản phẩm
│   ├── product-image-uploader.tsx  # Drag-drop + crop + webp convert
│   ├── product-row.tsx             # 1 row trong table list
│   ├── product-filters.tsx         # Filter bar (collection, category, tier, status)
│   ├── bulk-upload-dropzone.tsx    # XLSX/CSV drop + SheetJS parse
│   ├── bulk-upload-preview.tsx     # Bảng preview row + lỗi inline
│   │
│   ├── collection-form.tsx
│   ├── collection-row.tsx
│   │
│   ├── order-row.tsx
│   ├── order-detail-card.tsx
│   ├── order-status-select.tsx     # Dropdown chuyển NEW→CONFIRMED→...
│   ├── order-timeline.tsx          # Timeline trạng thái
│   ├── order-payment-badge.tsx     # Badge COD/MOMO + PENDING/PAID
│   │
│   ├── payment-row.tsx
│   ├── payment-momo-detail.tsx     # Hiển thị raw MoMo payload
│   ├── payment-status-badge.tsx
│   │
│   ├── newsletter-table.tsx
│   │
│   └── settings-form.tsx           # Site config form
│
├── layout/
│   ├── admin-sidebar.tsx           # Nav trái (icon + label)
│   ├── admin-header.tsx            # Top bar: user menu, logout
│   └── admin-breadcrumb.tsx
```

---

## 5. CHI TIẾT TỪNG TRANG

### 5.1. `/admin/login`
- Form email + password → `supabase.auth.signInWithPassword()`.
- Nếu OK + role=admin → redirect `/dashboard`.
- Nếu OK + role!=admin → set session, redirect `/403` (có nút logout).
- UI retro/dark, logo Emerald Vault, link "← Về trang chủ".

### 5.2. `/dashboard` (Tổng quan)
**KPI cards (4)**:
- Doanh thu hôm nay / tháng này (sum `orders.total_amount` where `payment_status=PAID`).
- Số đơn mới (status=NEW).
- Tỷ lệ chuyển đổi (orders / sessions — lấy từ GA4 API P2 hoặc tính đơn giản).
- Sản phẩm AVAILABLE còn lại.

**Charts**:
- Revenue 30 ngày (line).
- Top 5 sản phẩm bán chạy (bar).

**Tables**:
- 10 đơn hàng mới nhất (link → `/orders/[id]`).
- 5 lock sắp expire (lock còn < 2 phút).

**Alerts**:
- MoMo IPN fail trong 24h qua.
- Newsletter subscribers tăng > 50/ngày.

### 5.3. `/dashboard/products` (Danh sách)
**Filter bar**: collection, category, material, quality_tier, status, is_featured, search title.
**Table** (dùng `@tanstack/react-table`):
- Cột: Ảnh (thumb 48×48) | Title | Slug | Category | Material | Tier | Price | Status | Featured | Updated | Actions (Edit / Archive / Delete).
- Row click → `/products/[id]`.
- Bulk actions: Archive nhiều, Set featured nhiều.
- Pagination (server-side, page size 20).
- Sort theo mọi cột.

**Header**:
- Nút "+ Tạo mới" → `/products/new`.
- Nút "📥 Bulk upload" → `/products/bulk-upload`.
- Nút "📤 Export CSV".

### 5.4. `/dashboard/products/new` và `/dashboard/products/[id]`
Dùng chung `ProductForm` component.

**Form fields**:
- Title (input) — auto-generate slug (editable, check unique qua API).
- Collection (select).
- Category, Material, Quality Tier (select enum).
- Price (number input, format VND).
- Image uploader (main, bắt buộc) + Gallery (nhiều ảnh).
- Description (rich text hoặc textarea đơn giản).
- Status (AVAILABLE / SOLD_OUT).
- is_featured (switch).
- Season tags (multi-input chip: SUMMER_2026, AUTUMN_VINTAGE, ...).

**Submit**:
- Nếu tạo mới: `POST /api/admin/products` (multipart) → upload ảnh song song → insert row → redirect list.
- Nếu edit: `PATCH /api/admin/products/[id]` → nếu ảnh đổi → upload mới, xóa ảnh cũ trong storage.

### 5.5. `/dashboard/products/bulk-upload` (xem flows.md §11)
**2 mode**:
- **Mode A**: Drag-drop `.xlsx` / `.csv` → SheetJS parse → validate từng row qua zod → preview table với row lỗi tô đỏ.
- **Mode B**: Quick-form table (thêm row tay, mỗi row: Title/Price/Tier/Season/Image upload).

**Xử lý**:
- Bước 1: User chọn `collection_id` từ dropdown.
- Bước 2: Upload file / điền table.
- Bước 3: Click "Validate" → highlight row lỗi + tooltip lý do.
- Bước 4: Click "Import" → `POST /api/admin/bulk-import` (multipart) → server upload ảnh song song, insert transaction (rollback nếu 1 row fail).
- Bước 5: Toast "Đã import X sản phẩm" + danh sách row fail (nếu có).

**Template**:
- Nút "📥 Tải template .xlsx" → file mẫu có header + 1 row ví dụ.

### 5.6. `/dashboard/collections`
**Table**: Cover | Name | Slug | Products count | Published | Display order | Updated | Actions.
- Nút "+ Tạo collection" mở dialog (form trong dialog cho nhanh).
- Edit → `/collections/[id]`.
- Toggle `is_published` inline.
- Drag-drop `display_order` (dùng `@dnd-kit/core`).

### 5.7. `/dashboard/orders` (Danh sách)
**Filter**: status, payment_status, payment_method, date range (from/to), search code/phone/customer.
**Table**: Code | Created | Customer | Phone | Total | Payment | Status | Actions.
- Nút "📤 Export CSV" áp dụng filter hiện tại.

### 5.8. `/dashboard/orders/[id]` (Chi tiết)
**Layout 2 cột**:
- **Trái**: Thông tin khách (tên, SĐT, email, địa chỉ, ghi chú).
- **Phải**: Order summary, payment info, timeline.

**Sections**:
- Sản phẩm (snapshot từ `order_items`).
- Payment: badge MoMo/COD + status. Nếu MoMo → link `/payments/[momoTxId]`.
- Timeline trạng thái đơn.
- Nút "Cập nhật trạng thái" mở dialog với dropdown + textarea lý do.

### 5.9. `/dashboard/payments` (MoMo monitor)
**Table**: Created | momo_order_id (= order code) | Amount | resultCode | status | IPN received | Actions.
- Màu row: xanh (SUCCESS), vàng (REDIRECTED/pending), đỏ (FAILED).
- Nút "🔄 Recheck" gọi `POST /api/admin/payments/[id]/recheck` → server gọi MoMo queryStatus → update DB.

**Stats card trên đầu**:
- Total hôm nay / SUCCESS / FAILED / chờ IPN.

### 5.10. `/dashboard/newsletter`
- Table subscribers + filter (ngày, source, is_active).
- Nút "Export CSV" → file email list.
- Nút "Sync to Mailchimp" (P2, optional).

### 5.11. `/dashboard/analytics`
- Embed GA4 Looker Studio (iframe) — link nhập trong `/settings`.
- Hoặc tự tính: revenue chart, AOV, conversion (orders/sessions lấy từ GA4 Data API P2).

### 5.12. `/dashboard/settings`
**Sections**:
- **Site**: Site name, logo URL, contact email/phone, address.
- **Shipping**: Default fee, free-ship threshold.
- **Policies**: Link URL cho 3 trang `/chinh-sach/*` (Vận chuyển, Đổi trả, Bảo mật) — hoặc edit inline content (P2).
- **MoMo**: Chỉ hiển thị status (test/production) — KHÔNG hiển thị secret key. Nút "Test connection" gọi API `/api/admin/settings/momo-test`.
- **GA4**: GA ID (readonly, từ env), Looker Studio URL.

**Storage**: bảng `site_settings` (key-value) — cần migration `0007_site_settings.sql`:
```sql
CREATE TABLE site_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
```

---

## 6. AUTH, MIDDLEWARE, RLS

### 6.1. `middleware.ts` (root)
```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(/* ... cookie adapter ... */);
  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isAdminRoute = path.startsWith('/dashboard') || path.startsWith('/api/admin');

  if (!isAdminRoute) return res;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Check role từ profile (1 query mỗi request — cần cache P2)
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'admin') {
    const url = req.nextUrl.clone();
    url.pathname = '/403';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
};
```

### 6.2. Server-side guard pattern (mọi `/api/admin/*`)
```ts
// lib/auth/require-admin.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requireAdmin() {
  const cookieStore = cookies();
  const supabase = createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHORIZED');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('FORBIDDEN');

  return { user, admin: createAdminClient() };
}
```

### 6.3. RLS policies cần thêm (`0003_rls_policies.sql`)
```sql
-- Products: public SELECT, admin write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (true);
CREATE POLICY "products_admin_write" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Collections: public SELECT if published, admin write
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_public_read" ON collections
  FOR SELECT USING (is_published = true);
CREATE POLICY "collections_admin_all" ON collections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders: admin only (client tra cứu qua API verify code+phone)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- inventory_locks, payment_transactions, chat_*: service_role only
-- (không cần policy vì service_role bypass RLS)
ALTER TABLE inventory_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
```

---

## 7. MIGRATIONS CẦN THÊM (tóm tắt)

| File | Nội dung |
|---|---|
| `0003_rls_policies.sql` | Enable RLS + policies cho products, collections, orders, inventory_locks, payment_transactions |
| `0004_chatbot_schema.sql` | pgvector + chat_sessions + chat_messages + match_products (xem flows.md §15.3) |
| `0005_embed_trigger.sql` | Trigger auto-embed khi INSERT/UPDATE products |
| `0006_newsletter.sql` | Bảng `newsletter_subscribers` |
| `0007_site_settings.sql` | Bảng `site_settings` (key-value) |
| `0008_order_notes.sql` (P2) | Bảng `order_notes` (audit log nội bộ) |

---

## 8. ROADMAP TRIỂN KHAI (đề xuất)

### Sprint 1 — Foundation (3-4 ngày)
- [ ] `middleware.ts` + `/admin/login` + `/403`
- [ ] `app/(admin)/dashboard/layout.tsx` + `admin-sidebar` + `admin-header`
- [ ] `lib/auth/require-admin.ts` helper
- [ ] Migration `0003_rls_policies.sql` + test
- [ ] Bootstrap SQL: tạo user admin đầu tiên
- [ ] `lib/supabase/queries/admin-products.ts` (read-only list với filter)

### Sprint 2 — Products (4-5 ngày)
- [ ] `/dashboard/products` (list, filter, pagination, sort)
- [ ] `/dashboard/products/new` + edit
- [ ] `POST/PATCH/DELETE /api/admin/products`
- [ ] `ProductImageUploader` (webp convert, multi-upload)
- [ ] `/dashboard/products/bulk-upload`
- [ ] `POST /api/admin/bulk-import` (SheetJS + zod validate)
- [ ] Template .xlsx download

### Sprint 3 — Orders & Payments (3-4 ngày)
- [ ] `/dashboard/orders` (list, filter, export CSV)
- [ ] `/dashboard/orders/[id]` (detail, status update)
- [ ] `GET/PATCH /api/admin/orders`
- [ ] `/dashboard/payments` (MoMo monitor)
- [ ] `GET /api/admin/payments` + `POST /api/admin/payments/[id]/recheck`
- [ ] MoMo `queryStatus` integration (nếu cần thiết P1)

### Sprint 4 — Collections, Newsletter, Settings (2-3 ngày)
- [ ] `/dashboard/collections` + CRUD
- [ ] `/dashboard/newsletter` + export
- [ ] `/dashboard/settings` + `site_settings` table
- [ ] `/dashboard` (Tổng quan) với stats + chart

### Sprint 5 — Analytics & polish (2-3 ngày)
- [ ] `/dashboard/analytics` (chart revenue, top products)
- [ ] Audit log (P2 — `order_notes` + `admin_actions` table)
- [ ] Sentry integration cho admin routes
- [ ] E2E test critical paths (Playwright)

---

## 9. CHECKLIST KHI REVIEW PR ADMIN

- [ ] Mọi `/api/admin/*` route đều gọi `requireAdmin()` ở đầu.
- [ ] Mọi mutation dùng `createAdminClient()` (KHÔNG dùng anon client).
- [ ] Không log sensitive (phone, email, secret key) trong server log.
- [ ] Validate input bằng zod, return 400 với message rõ ràng.
- [ ] Upload ảnh check content-type + size limit (5MB/ảnh).
- [ ] Bulk insert dùng transaction (rollback nếu 1 row fail).
- [ ] UI: hiển thị loading state + error toast + success toast.
- [ ] UI: confirm dialog cho delete/archive.
- [ ] Filter/pagination URL state (shareable link).
- [ ] Empty state đẹp khi list rỗng.
- [ ] Mobile responsive (admin cũng dùng tablet đôi khi).

---

## 10. LIÊN KẾT THAM CHIẾU

- `flows.md` §1 — Kiến trúc tổng thể
- `flows.md` §2 — Database schema (8 bảng)
- `flows.md` §3.2 — Sitemap admin
- `flows.md` §7.3-7.4 — MoMo IPN + signature
- `flows.md` §11 — Bulk upload flow
- `flows.md` §13 — Bảo mật & RLS
- `flows.md` §14 — Env vars
- `todo.md` §B (auth) + §I (admin checklist) — file task gốc
- `analysis.md` — UX patterns tham khảo (Lillicoco/Laurelle)
