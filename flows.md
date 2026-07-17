# LUỒNG XỬ LÝ CHUẨN — HỆ THỐNG TRANG SỨC SI NHẬT

> File tham chiếu duy nhất cho mọi implementation. Tổng hợp kiến trúc, schema, API, UI structure, payment (MoMo), SEO, analytics & vận hành. Mọi thay đổi flow phải update file này trước khi code.

---

## 0. TRẠNG THÁI TỔNG THỂ (auto-generated, cập nhật 2026-07-17 — Sprint "Login + Admin Block")

> Báo cáo tổng hợp từ audit codebase. Tổng ~150 mục trong 18 sections của file này.
> Chi tiết đầy đủ + danh sách job pending theo priority xem **[§19. STATUS — JOB PENDING](#19-status--job-pending)** ở cuối file.

| Trạng thái | Số lượng | % |
|---|---|---|
| ✅ DONE | ~88 | 59% |
| 🟡 PARTIAL | ~22 | 15% |
| ❌ NOT STARTED | ~40 | 26% |

**Customer flow** (mua hàng, thanh toán, tài khoản): gần như end-to-end, chạy được — **đã có VietQR làm payment chính (MVP)**.
**Admin products CRUD + bulk import**: xong thật (real data).
**Admin dashboard + orders + collections + newsletter**: ✅ real data (sprint "Unblock vận hành" 2026-07-17).
**VietQR flow** (migration 0008 + customer + admin): ✅ done (sprint "VietQR + Unblock" 2026-07-17).
**Login + Admin Block** (sprint 2026-07-17): ✅ done — fix race condition kẹt loading, admin block mua hàng, customer_id sync theo email.

**3 gap lớn nhất**:
1. ❌ **MoMo env chưa populate** — Phase 2 (khi có MST, cần làm theo `docs/momo-sandbox-setup.md` 8 bước ~20 phút). Hiện tại VietQR đã cover MVP payment.
2. ❌ **AI Chatbot §15** — vẫn 0%
3. 🟡 **End-user account §18** — auth pages + account dashboard **gần xong** (4 auth page + 5 APIs + 1 migration 0011 + UI guard), còn tab nội dung (đơn/địa chỉ/yêu thích/đánh giá) là polish Phase 2.

**Top 3 quick-win (< 2h)**: ~~populate MoMo env~~ (defer Phase 2) → setup VietQR env (`BANK_CODE` + `BANK_ACCOUNT_NUMBER` + `BANK_ACCOUNT_NAME`) → ~~mount GA4 + hook~~ ✅ done → ~~migration pg_cron `release_expired_locks`~~ ✅ done → **apply migration 0011** (`link_my_guest_orders` + backfill customer_id) → **add `customer_id` column to orders** (chưa làm — xem §2.4).

---

## 1. KIẾN TRÚC TỔNG THỂ

> **Status**: ✅ done — stack, layout, fonts, env. 🟡 thiếu Sentry, env validation, structured logging.

```
[Client Browser]
   │
   ├── HTTPS ──► [Vercel Edge / Next.js App Router 14+]
   │                  │
   │                  ├── Server Components (SSR/ISR)  ── fetch qua Supabase server client
   │                  ├── Client Components             ── GSAP, countdown, cart state (Zustand)
   │                  ├── Route Handlers (/api/*)       ── business logic
   │                  ├── Middleware.ts                 ── JWT role-check cho /dashboard, /api/admin
   │                  │
   │                  ├── @next/third-parties/google ──► [GA4]
   │                  ├── MoMo captureWallet /v2/gateway/api/create  ──► [MoMo]
   │                  └── MoMo IPN POST /api/momo/ipn               ◄── [MoMo server]
   │
   └── (script)      ▼
                [Supabase Project]
                ├── PostgreSQL    (8 bảng + 1 RPC + 1 cron job)
                ├── Storage       (bucket: jewelry-images — public, .webp)
                └── Auth          (JWT + metadata.role, @supabase/ssr)
```

### Stack quyết định
- **Framework**: Next.js 14+ (App Router, RSC)
- **DB / BaaS**: Supabase (Postgres + Storage + Auth)
- **State client**: Zustand (cart, lock countdown)
- **Animation**: GSAP + ScrollTrigger
- **Form**: react-hook-form + zod
- **UI base**: Tailwind CSS + shadcn/ui (hoặc Radix primitives) — retro/dark theme
- **Payment**: **MoMo captureWallet** (theo docs https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/)
- **Analytics**: GA4 qua `@next/third-parties/google`
- **Deploy**: Vercel (production + preview branches)

### Env vars bắt buộc
```bash
# Public (browser đọc được)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://emerald-vault.vn
# Server-only
SUPABASE_SERVICE_ROLE_KEY=        # bypass RLS, KHÔNG expose
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_REDIRECT_URL=https://emerald-vault.vn/momo/return
MOMO_IPN_URL=https://emerald-vault.vn/api/momo/ipn
# GA4 Data API (cho /admin/analytics)
GA4_PROPERTY_ID=                  # dạng số, lấy từ GA4 Admin
GA4_SERVICE_ACCOUNT_JSON=         # inline JSON (khuyến nghị Vercel) — hoặc GOOGLE_APPLICATION_CREDENTIALS=path
```

---

## 2. DATABASE SCHEMA (chuẩn hóa)

> **Status**: ✅ 8 bảng core + 5 RPC + RLS. ❌ pg_cron `release_expired_locks`, ❌ pgvector/chatbot schema, ❌ `DRAFT` enum, ❌ `newsletter_subscribers` table.

### 2.1. Bảng `collections`
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) UNIQUE NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2. Bảng `products` (đã bổ sung field)
```sql
CREATE TYPE quality_tier_enum AS ENUM ('SSS', 'SS', 'S');
CREATE TYPE product_category_enum AS ENUM ('NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY');
CREATE TYPE material_enum AS ENUM ('BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG');
CREATE TYPE product_status_enum AS ENUM ('AVAILABLE', 'SOLD_OUT');

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  -- Nội dung
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  material material_enum NOT NULL,
  category product_category_enum NOT NULL,
  -- Media
  image_url TEXT NOT NULL,                      -- Ảnh chính (Supabase Storage public URL)
  gallery TEXT[] DEFAULT '{}',                  -- Ảnh phụ
  -- Giá & tồn kho (ĐỒ SI: luôn quantity=1, encode trong status)
  price NUMERIC(12,0) NOT NULL,
  status product_status_enum DEFAULT 'AVAILABLE',
  -- Phân loại chiến dịch
  is_featured BOOLEAN DEFAULT false,
  quality_tier quality_tier_enum NOT NULL,
  season_tags VARCHAR(50)[] DEFAULT '{}',
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_status        ON products(status);
CREATE INDEX idx_products_filters       ON products(is_featured, quality_tier);
CREATE INDEX idx_products_collection    ON products(collection_id);
CREATE INDEX idx_products_slug          ON products(slug);
CREATE INDEX idx_products_season        ON products USING GIN(season_tags);
```

### 2.3. Bảng `inventory_locks` (tách riêng khỏi products)
```sql
CREATE TYPE lock_status_enum AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONVERTED');

CREATE TABLE inventory_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_id VARCHAR(120) NOT NULL,              -- anonymous-id từ cookie
  status lock_status_enum DEFAULT 'ACTIVE',
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,              -- locked_at + 10 phút
  released_at TIMESTAMPTZ,
  order_id UUID
);

-- Partial index: chỉ index các lock còn hiệu lực
CREATE INDEX idx_locks_product_active ON inventory_locks(product_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_locks_expires        ON inventory_locks(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_locks_client         ON inventory_locks(client_id);
```

### 2.4. Bảng `orders` + `order_items`
```sql
CREATE TYPE order_status_enum AS ENUM (
  'NEW',              -- COD mới tạo
  'WAITING_PAYMENT',  -- BANK_TRANSFER: QR đã tạo, chờ user CK
  'WAITING_CONFIRM',  -- BANK_TRANSFER: user đã báo CK, chờ admin verify
  'CONFIRMED',        -- Đã xác nhận (COD: khi giao / BANK: admin confirm / MoMo: IPN success)
  'SHIPPING',
  'DONE',
  'CANCELLED'
);
CREATE TYPE payment_method_enum AS ENUM ('MOMO', 'COD', 'BANK_TRANSFER');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,             -- 'EV-20260713-0001'
  -- Customer link (sprint "Login + Admin Block" 2026-07-17)
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- set khi user login đặt hàng; NULL = guest
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(120),
  customer_address TEXT,
  province VARCHAR(80),
  district VARCHAR(80),
  notes TEXT,
  total_amount NUMERIC(12,0) NOT NULL,
  shipping_fee NUMERIC(12,0) DEFAULT 0,
  payment_method payment_method_enum NOT NULL,
  payment_status payment_status_enum DEFAULT 'PENDING',
  status order_status_enum DEFAULT 'NEW',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: customer chỉ đọc được orders của mình (auth.uid() = customer_id)
-- Admin đọc/ghi tất cả qua service_role.
-- Guest checkout: customer_id = NULL, customer_email = email khách nhập
--   → sau khi user đăng ký/đăng nhập cùng email, gọi RPC link_my_guest_orders() để backfill.
CREATE INDEX idx_orders_code     ON orders(code);
CREATE INDEX idx_orders_phone    ON orders(customer_phone);
CREATE INDEX idx_orders_email    ON orders(customer_email);  -- dùng cho backfill theo email
CREATE INDEX idx_orders_customer ON orders(customer_id);     -- dùng cho /tai-khoan/don-hang
CREATE INDEX idx_orders_status   ON orders(status, created_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  price NUMERIC(12,0) NOT NULL,
  snapshot_title VARCHAR(255) NOT NULL,
  snapshot_image TEXT NOT NULL,
  snapshot_material material_enum
);

CREATE INDEX idx_orders_code     ON orders(code);
CREATE INDEX idx_orders_phone    ON orders(customer_phone);
CREATE INDEX idx_orders_status   ON orders(status, created_at DESC);
```

### 2.5. Bảng `payment_transactions` (theo dõi MoMo)
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- MoMo fields
  momo_request_id VARCHAR(50) UNIQUE NOT NULL,  -- requestId gửi MoMo (idempotency key)
  momo_order_id VARCHAR(200) NOT NULL,          -- orderId trên MoMo
  momo_trans_id BIGINT,                          -- transId từ IPN
  amount NUMERIC(12,0) NOT NULL,
  pay_type VARCHAR(20),                          -- 'webApp' | 'app' | 'qr' | 'miniapp'
  result_code INT,                               -- 0 = success
  message TEXT,
  signature VARCHAR(255),                        -- MoMo trả về, để audit
  -- State
  status VARCHAR(20) DEFAULT 'CREATED',          -- CREATED | REDIRECTED | SUCCESS | FAILED
  ipn_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_tx_momo_order ON payment_transactions(momo_order_id);
```

### 2.6. Bảng `profiles` (user metadata)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'customer',          -- 'customer' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile khi user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.7. RPC functions
```sql
-- === lock_item: Khóa 1 sản phẩm, tránh race-condition ===
CREATE OR REPLACE FUNCTION lock_item(p_product_id UUID, p_client_id VARCHAR)
RETURNS inventory_locks
LANGUAGE plpgsql
AS $$
DECLARE
  v_status product_status_enum;
  v_lock inventory_locks;
BEGIN
  SELECT status INTO v_status FROM products WHERE id = p_product_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF v_status = 'SOLD_OUT' THEN RAISE EXCEPTION 'PRODUCT_SOLD_OUT'; END IF;

  IF EXISTS (
    SELECT 1 FROM inventory_locks
    WHERE product_id = p_product_id
      AND status = 'ACTIVE'
      AND expires_at > NOW()
      AND client_id <> p_client_id
  ) THEN RAISE EXCEPTION 'PRODUCT_LOCKED_BY_OTHER'; END IF;

  INSERT INTO inventory_locks (product_id, client_id, locked_at, expires_at, status)
  VALUES (p_product_id, p_client_id, NOW(), NOW() + INTERVAL '10 minutes', 'ACTIVE')
  ON CONFLICT (product_id) WHERE status = 'ACTIVE'
  DO UPDATE SET locked_at = NOW(), expires_at = NOW() + INTERVAL '10 minutes'
  RETURNING * INTO v_lock;

  RETURN v_lock;
END;
$$;

-- === release_expired_locks: Cron job (chạy mỗi phút) ===
-- Bật qua Supabase Dashboard → Database → Extensions → pg_cron
SELECT cron.schedule('release-expired-locks', '* * * * *', $$
  UPDATE inventory_locks
  SET status = 'EXPIRED', released_at = NOW()
  WHERE status = 'ACTIVE' AND expires_at <= NOW();
$$);

-- === confirm_payment: cập nhật order + product sau khi MoMo báo PAID ===
CREATE OR REPLACE FUNCTION confirm_payment(p_order_id UUID, p_momo_trans_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE orders SET payment_status = 'PAID', status = 'CONFIRMED', updated_at = NOW()
  WHERE id = p_order_id;
  UPDATE products SET status = 'SOLD_OUT'
  WHERE id IN (SELECT product_id FROM order_items WHERE order_id = p_order_id);
  UPDATE inventory_locks SET status = 'CONVERTED'
  WHERE order_id = p_order_id;
END;
$$;
```

### 2.8. Bảng `bank_transfers` (migration 0008 — VietQR flow)

> **Status**: ✅ done 2026-07-17 — lưu trữ thông tin QR + bill cho mỗi đơn BANK_TRANSFER. 1:1 với `orders` (mỗi order BANK chỉ có 1 bank_transfer row).

```sql
CREATE TABLE bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- QR info
  qr_image_url TEXT NOT NULL,                -- URL từ vietqr.io (FREE, không cần API key)
  bank_code VARCHAR(10) NOT NULL,            -- 'VCB' | 'TCB' | 'MB' | ... (xem lib/bank/types.ts)
  bank_bin VARCHAR(10) NOT NULL,             -- BIN ngân hàng (vd: '970436' cho VCB)
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(120) NOT NULL,        -- Uppercase, không dấu
  amount NUMERIC(12,0) NOT NULL,             -- Số tiền cần CK (= order.total)
  transfer_content VARCHAR(100) NOT NULL,    -- Nội dung CK (= orderCode, để admin đối chiếu)
  qr_expires_at TIMESTAMPTZ,                 -- NOW() + 24h (countdown cho user)
  -- Workflow timestamps
  user_confirmed_at TIMESTAMPTZ,             -- User bấm "Tôi đã chuyển" → status WAITING_CONFIRM
  bill_image_url TEXT,                       -- User upload bill CK lên bucket 'payment-bills'
  bill_uploaded_at TIMESTAMPTZ,
  admin_confirmed_at TIMESTAMPTZ,            -- Admin verify → status CONFIRMED + PAID
  admin_note TEXT,                           -- Ghi chú của admin (vd: "Đã nhận 24/07, ship 25/07")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_transfers_order ON bank_transfers(order_id);

-- RLS: service_role only (admin qua API, user qua API verify order ownership)
ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;
-- Public không đọc trực tiếp; admin qua service_role; user qua API check order.customer_phone
```

**Storage bucket `payment-bills`** (tạo cùng migration 0008):
- Public read (admin xem được qua URL trực tiếp)
- Auth write (user upload qua API `POST /api/orders/[code]/bank-proof`)
- Max 5MB, chỉ nhận `image/jpeg | image/png | image/webp`

**State machine**:
```
[QR created] ──user "Tôi đã chuyển"──► [user_confirmed_at set, order.status = WAITING_CONFIRM]
       │
       └─user upload bill──► [bill_image_url set, order.status = WAITING_CONFIRM]
                                                                              │
                                                                              ▼
                                                          admin verify ──► [admin_confirmed_at set,
                                                                               order.status = CONFIRMED,
                                                                               order.payment_status = PAID,
                                                                               locks = CONVERTED,
                                                                               products = SOLD_OUT]
```

---

## 3. SƠ ĐỒ TRANG (SITEMAP / PAGES)

### 3.1. Customer-facing routes (App Router)

> **Status**: ✅ done — 16 page + sitemap.ts + robots.ts + not-found.
```
app/
├── layout.tsx                    # RootLayout: <GoogleAnalytics/>, fonts, theme
├── page.tsx                      # TRANG CHỦ
├── san-pham/
│   ├── page.tsx                  # DANH SÁCH (filter: collection, category, tier, price)
│   └── [slug]/page.tsx           # CHI TIẾT SẢN PHẨM
├── bo-suu-tap/
│   ├── page.tsx                  # TẤT CẢ COLLECTIONS
│   └── [slug]/page.tsx           # CHI TIẾT COLLECTION
├── gio-hang/page.tsx             # GIỎ HÀNG (countdown lock)
├── thanh-toan/page.tsx           # CHECKOUT (form tên, SĐT, địa chỉ, chọn MoMo)
├── momo/
│   └── return/page.tsx           # RETURN URL từ MoMo (loading + redirect)
├── don-hang/
│   └── [code]/page.tsx           # TRA CỨU ĐƠN (nhập SĐT)
├── cau-chuyen/page.tsx           # ABOUT / STORY
├── lien-he/page.tsx              # CONTACT
├── chinh-sach/                   # Policy pages
│   ├── van-chuyen/page.tsx
│   ├── doi-tra/page.tsx
│   └── bao-mat/page.tsx
├── sitemap.ts                    # Dynamic sitemap
├── robots.ts
└── not-found.tsx                 # 404 retro style
```

### 3.2. Admin routes

> **Status**: 🟡 → ✅ real data: dashboard, orders list/detail, collections CRUD, newsletter. ✅ analytics page real (GA4 Data API + orders). ❌ inventory page còn mock, ❌ payments page còn mock, ❌ settings page còn mock, ❌ AI Chatbot §15.
```
app/
└── (admin)/
    └── dashboard/
        ├── layout.tsx            # Sidebar + auth gate
        ├── page.tsx              # ✅ REAL — KPIs + recent orders + chart + alerts
        ├── products/             # (đã real: list + new + edit + bulk-upload)
        ├── collections/
        │   ├── page.tsx          # ✅ REAL — list + reorder
        │   ├── new/page.tsx      # ✅ NEW — create form
        │   └── [id]/page.tsx     # ✅ REAL — edit form
        ├── orders/
        │   ├── page.tsx          # ✅ REAL — list + filter + export
        │   └── [id]/page.tsx     # ✅ REAL — detail + status update
        ├── analytics/page.tsx    # ✅ REAL
        ├── newsletter/page.tsx   # ✅ REAL — list + export
        ├── inventory/page.tsx    # ❌ MOCK (P2)
        ├── payments/page.tsx     # ❌ MOCK (P2)
        └── settings/page.tsx     # ❌ MOCK (P2)
```

### 3.3. API routes

> **Status**: 🟡 customer API 10/12 done. Admin: ✅ dashboard, orders (list/detail/export), collections (CRUD + reorder), newsletter, analytics. ❌ /api/chat (chatbot §15).
```
app/api/
├── lock-item/route.ts            # POST — gọi RPC lock_item
├── unlock-item/route.ts          # POST — release lock sớm
├── orders/route.ts               # POST — tạo order (từ cart)
├── orders/[code]/route.ts        # GET — chi tiết đơn (kèm phone verify)
├── orders/[code]/status/route.ts # GET — polling trạng thái (cho trang return)
├── momo/
│   ├── create/route.ts           # POST — tạo payment_url (gọi MoMo captureWallet)
│   └── ipn/route.ts              # POST — nhận IPN từ MoMo (server-to-server)
└── admin/
    ├── bulk-import/route.ts      # POST — admin only
    ├── collections/
    │   ├── route.ts              # GET (lite) + POST — admin only
    │   ├── list/route.ts         # GET (rich, paginated) — admin only
    │   ├── [id]/route.ts         # GET + PATCH + DELETE
    │   └── reorder/route.ts      # POST batch update display_order
    ├── orders/
    │   ├── route.ts              # GET (list + filter)
    │   ├── [id]/route.ts         # GET + PATCH (status)
    │   └── export/route.ts       # GET CSV
    ├── dashboard/route.ts        # GET — overview KPIs + recent
    ├── newsletter/
    │   ├── route.ts              # GET + DELETE
    │   └── export/route.ts       # GET CSV
    ├── analytics/route.ts        # ✅ GET ?days=N
    ├── media/                    # (Phase 1-2: list + delete, Phase 3-4 pending)
    └── uploads/route.ts          # POST multipart — admin upload image
```

---

## 4. CẤU TRÚC COMPONENT (Atomic Design)

> **Status**: 🟡 ~60% done. UI primitives còn thiếu: input, dialog, skeleton, count-down, shine-image. cart/collection components còn inline. chatbot có 1 stub file.

```
components/
├── ui/                           # ATOMIC — shadcn-style retro/dark themed
│   ├── button.tsx                # variant: gold, ghost, outline
│   ├── input.tsx
│   ├── badge.tsx                 # tier SSS/SS/S với gold border
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── skeleton.tsx
│   ├── toast.tsx
│   ├── count-down.tsx            # Reusable countdown (props: expiresAt, onExpire)
│   └── shine-image.tsx           # Hover shine flash effect (CSS only, no GSAP)
│
├── product/                      # MOLECULE / ORGANISM
│   ├── product-card.tsx          # Card grid item (hover effect, status overlay)
│   ├── product-grid.tsx          # Grid responsive (3/4/5 cols)
│   ├── product-gallery.tsx       # Main image + thumbs (chi tiết)
│   ├── product-meta.tsx          # Title, tier, material, price
│   ├── product-story.tsx         # Mô tả dài + provenance
│   └── product-skeleton.tsx
│
├── cart/
│   ├── cart-item.tsx             # 1 item trong giỏ + countdown + remove
│   ├── cart-summary.tsx          # Tổng tiền + checkout button
│   └── empty-cart.tsx
│
├── checkout/
│   ├── customer-form.tsx         # Tên, SĐT, địa chỉ, ghi chú
│   ├── payment-method-selector.tsx  # MoMo / COD radio
│   └── order-summary.tsx
│
├── collection/
│   ├── collection-card.tsx
│   ├── collection-hero.tsx
│   └── collection-filter.tsx     # Filter category, tier
│
├── layout/
│   ├── navbar.tsx                # Logo + nav + cart icon (countdown badge)
│   ├── footer.tsx
│   ├── mobile-menu.tsx
│   └── admin-sidebar.tsx
│
├── home/
│   ├── hero-section.tsx          # Full-bleed video/ảnh + CTA
│   ├── featured-collections.tsx
│   ├── latest-arrivals.tsx
│   ├── story-teaser.tsx
│   └── newsletter-signup.tsx
│
├── analytics/
│   └── consent-banner.tsx        # Cookie consent (Nghị định 13/2023 VN)
│
└── seo/
    ├── json-ld-product.tsx       # Schema.org Product
    ├── json-ld-breadcrumb.tsx
    └── json-ld-organization.tsx
```

```
hooks/
├── use-cart.ts                   # Zustand store: items, expiresAt, total
├── use-countdown.ts              # tick từ expiresAt
├── use-anonymous-id.ts           # uuid v4 lưu cookie, tạo lần đầu
├── use-jewelry-analytics.ts      # GA4 events (xem flows §9)
└── use-gsap-sparkle.ts           # GSAP hover effect
```

```
lib/
├── supabase/
│   ├── client.ts                 # createBrowserClient (cho Client Components)
│   ├── server.ts                 # createServerClient (cho Server Components)
│   └── admin.ts                  # createClient w/ service_role (cho API routes)
├── momo/
│   ├── client.ts                 # signRequest(), createPayment()
│   ├── signature.ts              # buildSignature() theo Hmac_SHA256
│   └── types.ts                  # TS types cho MoMo request/response
├── analytics/
│   └── events.ts                 # trackViewProduct, trackPurchase, ...
├── utils.ts                      # formatVND, slugify, etc.
└── constants.ts                  # LOCK_DURATION_MS=600_000, MOMO_BANK_CODE, ...
```

---

## 5. LUỒNG 1 — KHÁCH XEM SẢN PHẨM

> **Status**: 🟡 Server fetch + JSON-LD + metadata done. ❌ GA4 `view_item` chưa fire.

```
[User click card trên grid / URL chia sẻ]
        │
        ▼
[Server Component /san-pham/[slug]/page.tsx]
   supabase-server.from('products').select('*').eq('slug', slug).single()
        │
        ▼
[Render <ProductGallery/> + <ProductMeta/> + <ProductStory/>]
[generateMetadata({ title, description, openGraph, jsonLd })]
        │
        ▼ (client mount)
[useJewelryAnalytics.trackViewProduct(product) → GA4 view_item]
```

- ISR `revalidate = 60` cho trang danh sách, dynamic cho chi tiết
- JSON-LD `Product` inject trong metadata (price, availability, image)

---

## 6. LUỒNG 2 — LOCK SẢN PHẨM ĐỘC BẢN (10 PHÚT)

> **Status**: 🟡 RPC + API + Zustand + countdown + unlock done. ❌ pg_cron `release_expired_locks`, ❌ GA4 lock events.

```
[User click "Giữ hàng 10 phút" trên ProductCard / ProductDetail]
        │
        ▼
[POST /api/lock-item  { productId }]
        │  clientId lấy từ cookie 'ev_client_id' (uuid v4)
        ▼
[Route Handler]
   supabase.rpc('lock_item', { p_product_id, p_client_id })
        │  RPC: SELECT ... FOR UPDATE
        │  → AVAILABLE: insert inventory_locks
        │  → SOLD_OUT: throw
        │  → locked by other: throw
        ▼
[Response 200 { lockId, expiresAt }]
        │
        ▼
[Client]
   zustand cart store: add item + set expiresAt
   localStorage backup (chống mất khi refresh)
   toast "Đã giữ hàng, còn 10:00"
   trackLockProduct → GA4 lock_item_success
   redirect /gio-hang
        │
        ▼
[Cart page /gio-hang]
   useCountdown(expiresAt) hiển thị MM:SS
        │
        ├─► Tick tới 0
        │     │
        │     ▼
        │   [POST /api/unlock-item] (idempotent)
        │     supabase.update status='EXPIRED'
        │     cart store: remove item
        │     trackLockTimeout → GA4 lock_item_timeout
        │     toast: "Món đồ đã được nhả lại kho cho nhà sưu tầm khác"
        │
        └─► User click "Tiến hành đặt hàng"
              → redirect /thanh-toan
```

**Edge case xử lý**:
- User đóng browser → `pg_cron` set `EXPIRED` sau 10' → sản phẩm AVAILABLE
- User refresh → localStorage + cookie khôi phục cart
- 2 user click cùng lúc → RPC `SELECT FOR UPDATE` đảm bảo chỉ 1 thắng

---

## 7. LUỒNG 3 — CHECKOUT + THANH TOÁN (3 PHƯƠNG THỨC)

> **Status**: ✅ COD + VietQR động + manual confirm + upload bill (MVP). 🟡 MoMo API + signature + IPN + idempotency done, chờ populate env (Phase 2 khi có MST). ❌ cron cancel PENDING > 30min.

**3 phương thức thanh toán hỗ trợ**:
- **COD** (cash on delivery) — chuyển khoản khi nhận hàng, đơn giản nhất.
- **BANK_TRANSFER** (VietQR động) — phương thức chính cho MVP, FREE không cần MST. Xem §7.1.1.
- **MOMO** (captureWallet) — Phase 2, khi có MST doanh nghiệp.

### 7.1. Checkout form
```
[User ở /gio-hang → click "Đặt hàng"]
         │
        ▼
[/thanh-toan/page.tsx — Client Component]
   <CustomerForm/> (tên, SĐT, email, tỉnh/quận, địa chỉ, ghi chú)
   <PaymentMethodSelector/> (radio: Chuyển khoản ngân hàng [VietQR] / MoMo [Phase 2] / COD)
   <OrderSummary/> (subtotal, ship, total)
        │
        ▼
[User click "Đặt hàng"]
        │
        ├─► COD:
        │     │
        │     ▼
        │   [POST /api/orders  { items, customer, payment: 'COD' }]
        │     │  1. Verify locks ACTIVE & thuộc clientId
        │     │  2. Tạo order + order_items (transaction)
        │     │  3. Set locks status = 'CONVERTED'
        │     │  4. Set products status = 'SOLD_OUT'
        │     │  5. Trả { orderCode, paymentMethod: 'COD' }
        │     ▼
        │   [Client] redirect /don-hang/[code]
        │     toast "Đặt hàng thành công, thanh toán khi nhận hàng"
        │     trackPurchase (non-interaction: false) → GA4 purchase
        │
        └─► MoMo:
              │
              ▼
            [POST /api/orders  { items, customer, payment: 'MOMO' }]
               │  → tạo order ở status PENDING
               │  → tạo payment_transactions row
               │  → trả { orderCode, orderId, paymentTxId }
              │
              ▼
            [POST /api/momo/create  { orderId }]
               │  1. Lấy order + items từ DB
               │  2. Build payload:
               │     - partnerCode, accessKey, secretKey
               │     - requestId = uuid (idempotency)
               │     - orderId = orderCode
               │     - amount = total
               │     - orderInfo, redirectUrl, ipnUrl
               │     - items[] (id, name, price, quantity=1, ...)
               │     - extraData = base64({ orderId })
               │     - signature = HmacSHA256(sorted_params, secretKey)
               │  3. POST https://test-payment.momo.vn/v2/gateway/api/create
               │  4. Lưu momo_request_id vào payment_transactions
               │  5. Trả { payUrl, deeplink, qrCodeUrl }
              │
              ▼
            [Client] window.location.href = payUrl
            → user thanh toán trên MoMo app/web
            → MoMo redirect về MOMO_REDIRECT_URL/?orderId=...&resultCode=...
```

### 7.1.1. VietQR flow (BANK_TRANSFER — phương thức chính MVP)

> **Status**: ✅ done 2026-07-17 — `lib/bank/{types,vietqr,config}.ts` + migration 0008 + customer flow + admin flow. **FREE**, không cần MST/đăng ký kinh doanh, dùng được tài khoản cá nhân. Dùng [vietqr.io](https://vietqr.io) API (FREE, không cần API key) generate URL QR động từ BIN + STK + amount + content.

```
[User chọn "Chuyển khoản ngân hàng" ở /thanh-toan]
       │
       ▼
[POST /api/orders  { items, customer, payment: 'BANK_TRANSFER' }]
   → validate getBankConfig().isConfigured (return 503 nếu false — admin chưa set BANK_* env)
   → tạo order status = 'WAITING_PAYMENT' (KHÔNG convert locks/products ngay)
   → set inventory_locks.status = 'CONVERTED' (vì user đã chọn mua — locks hold là chính thức)
   → tạo bank_transfers row với:
      - qr_image_url = vietqr.io URL (template: https://img.vietqr.io/image/{bank_bin}-{account_no}-compact.png?addInfo={content}&amount={amount}&accountName={name})
      - qr_expires_at = NOW() + 24h
      - transfer_content = orderCode (admin dùng để đối chiếu khi nhận tiền)
   → trả { orderCode, redirectUrl: '/don-hang/[code]/thanh-toan' }
       │
       ▼
[Client redirect /don-hang/[code]/thanh-toan]
   → hiển thị QR + countdown 24h + STK + số tiền + nội dung CK (= orderCode)
   → 2 nút:
      - "Tôi đã chuyển" → POST /api/orders/[code]/confirm-paid
      - "Upload bill" → POST /api/orders/[code]/bank-proof (multipart, image)
   → copy-to-clipboard cho STK, số tiền, nội dung CK
       │
       ├─► User bấm "Tôi đã chuyển"
       │     → POST /api/orders/[code]/confirm-paid
       │     → bank_transfers.user_confirmed_at = NOW()
       │     → orders.status = 'WAITING_CONFIRM'
       │     → toast "Đã ghi nhận, admin sẽ xác nhận trong ít phút"
       │     → page hiển thị "Đang chờ admin xác nhận..."
       │
       └─► User upload bill
             → POST /api/orders/[code]/bank-proof (multipart FormData với file 'bill')
             → validate order.customer_phone (so với input) — chống upload hộ
             → validate file: jpeg/png/webp, max 5MB
             → upload lên bucket 'payment-bills' qua supabaseAdmin
             → bank_transfers.bill_image_url = publicUrl
             → bank_transfers.bill_uploaded_at = NOW()
             → nếu chưa có user_confirmed_at → set = NOW() + status WAITING_CONFIRM
             → toast "Đã upload bill CK, admin sẽ xác nhận sớm"
       │
       ▼
[Admin vào /admin/orders/[code] → thấy card "Thanh toán ngân hàng"]
   → timeline 3 mốc: QR tạo | User confirm (với timestamp) | Admin confirm
   → bill thumbnail (nếu có) — click để mở full size
   → nút "Xác nhận đã nhận tiền" → mở confirm-bank-dialog
       │
       ▼
[PATCH /api/admin/orders/[id]  { action: 'confirm_bank_payment', adminNote }]
   → bank_transfers.admin_confirmed_at = NOW()
   → bank_transfers.admin_note = input.adminNote
   → orders.status = 'CONFIRMED', payment_status = 'PAID'
   → set inventory_locks.status = 'CONVERTED' (cho product của order)
   → set products.status = 'SOLD_OUT'
   → dashboard KPI `pendingBankConfirmations` giảm 1
   → toast "Đã xác nhận thanh toán"
```

**Lưu ý bảo mật**:
- API `/api/orders/[code]/*` (customer) yêu cầu verify `customer_phone` để chống user khác thao tác.
- API `/api/admin/orders/[id]/*` (admin) yêu cầu `requireAdmin()`.
- File bill: validate MIME type + size ở cả client và server.
- Không log STK, số tiền, hoặc nội dung CK ra console.

**Edge case**:
- User click "Tôi đã chuyển" 2 lần → idempotent (UPDATE WHERE user_confirmed_at IS NULL).
- User upload bill 2 lần → replace bill_image_url.
- QR hết hạn 24h nhưng user chưa CK → page hiển thị "Đã hết hạn, vui lòng liên hệ admin" + disable 2 nút.
- Admin click "Xác nhận" 2 lần → idempotent (UPDATE WHERE admin_confirmed_at IS NULL).

### 7.2. Return URL (user redirect về từ MoMo)
```
[/momo/return/page.tsx?orderId=EV-...&resultCode=0&...]
        │
        ▼
[Client] Hiển thị loading "Đang xác nhận thanh toán..."
        │
        ▼
[GET /api/orders/[code]/status] (polling mỗi 2s, tối đa 30s)
        │
        ├─► status = 'CONFIRMED' (payment_status = 'PAID')
        │     → redirect /don-hang/[code]
        │     → trackPurchase → GA4 purchase
        │
        └─► Sau 30s vẫn 'PENDING'
              → hiển thị "Đang chờ MoMo xác nhận, vui lòng kiểm tra lại sau"
              → nút "Tôi đã thanh toán" (re-poll) | "Thử lại" (re-call /api/momo/create)
```

### 7.3. IPN webhook (server-to-server, source of truth)
```
[MoMo POST /api/momo/ipn  với body: { orderId, resultCode, transId, signature, ... }]
        │
        ▼
[Route Handler — public, verify bằng signature]
   1. Verify signature:
      raw = "accessKey=...&amount=...&extraData=...&message=...&orderId=...
             &orderInfo=...&orderType=momo_wallet&partnerCode=...&payType=...
             &requestId=...&responseTime=...&resultCode=...&transId=..."
      expected = HmacSHA256(raw, MOMO_SECRET_KEY)
      → if (expected !== received) return 204 (silent drop)
   2. Idempotency: check payment_transactions.momo_request_id đã SUCCESS chưa
      → if yes: return 204
   3. Tìm order theo code (= momo_order_id)
   4. resultCode === 0?
      ├─► YES:
      │     supabase.rpc('confirm_payment', { p_order_id, p_momo_trans_id })
      │     payment_transactions.status = 'SUCCESS'
      │     → return 204
      └─► NO:
            payment_transactions.status = 'FAILED'
            orders.payment_status = 'FAILED'
            → return 204
```

**Quan trọng**: IPN là source of truth, KHÔNG tin tưởng redirect URL. User có thể đóng tab sau khi thanh toán thành công → IPN vẫn về server.

### 7.4. Signature (HMAC-SHA256) — triển khai
```ts
// lib/momo/signature.ts
import crypto from 'node:crypto';

export function buildRequestSignature(params: Record<string, string>, secretKey: string) {
  // Create: sort keys a-z, join with &, prefix with accessKey
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHmac('sha256', secretKey)
    .update(`accessKey=${process.env.MOMO_ACCESS_KEY}&${sorted}`)
    .digest('hex');
}

export function verifyIpnSignature(body: MoMoIpnBody, secretKey: string) {
  const raw = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${body.amount}`
    + `&extraData=${body.extraData}&message=${body.message}&orderId=${body.orderId}`
    + `&orderInfo=${body.orderInfo}&orderType=${body.orderType}`
    + `&partnerCode=${body.partnerCode}&payType=${body.payType}`
    + `&requestId=${body.requestId}&responseTime=${body.responseTime}`
    + `&resultCode=${body.resultCode}&transId=${body.transId}`;
  const expected = crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
  return expected === body.signature;
}
```

### 7.5. Idempotency strategy
- `payment_transactions.momo_request_id` UNIQUE → nếu user click "Đặt hàng" 2 lần, request thứ 2 fail ở insert → trả về payUrl cũ (lookup theo orderId).
- IPN có thể về nhiều lần → check status đã SUCCESS thì skip.
- Cron job dọn `PENDING` orders > 30 phút (status = 'CANCELLED').

**VietQR (BANK_TRANSFER)**: Không cần idempotency phức tạp như MoMo — QR đã có sẵn `amount` + `transfer_content` (= orderCode) embed sẵn, nên:
- User click "Tôi đã chuyển" 2 lần → UPDATE WHERE `user_confirmed_at IS NULL` (idempotent).
- User upload bill 2 lần → replace `bill_image_url` (idempotent, last-write-wins).
- Admin verify 2 lần → UPDATE WHERE `admin_confirmed_at IS NULL` (idempotent).
- Việc đối chiếu tiền thật làm **thủ công**: admin xem `bill_image_url` + check app ngân hàng với `transfer_content = orderCode`.

---

## 8. LUỒNG 4 — TRA CỨU ĐƠN HÀNG (GUEST)

> **Status**: ✅ done — path đổi từ `POST /lookup` thành `GET /api/orders/[code]?phone=`.

```
[User vào /don-hang/[code]]
        │
        ▼
[Form nhập SĐT verify]
        │
        ▼
[POST /api/orders/[code]/lookup  { phone }]
   → supabase: select * from orders where code = ? and customer_phone = ?
   → nếu khớp: trả order details
   → nếu sai: 404
        │
        ▼
[<OrderDetail/> hiển thị:
   - Mã đơn
   - Trạng thái đơn (NEW/CONFIRMED/SHIPPING/DONE)
   - Trạng thái thanh toán (PENDING/PAID/FAILED)
   - Timeline trạng thái
   - Sản phẩm (snapshot)
   - Thông tin giao hàng
]
```

- Cho phép guest tra cứu mà không cần đăng nhập (chỉ cần code + phone).
- Admin xem mọi đơn không cần verify.

---

## 9. LUỒNG 5 — GA4 EVENTS

> **Status**: ✅ done — Consent default-deny + banner + `<GoogleAnalytics/>` mount + 8 events wired (view_item, lock_item_success, lock_item_timeout, begin_checkout, add_payment_info, purchase, view_collection + add_to_cart legacy).
> ✅ `/admin/analytics` page đã dùng **GA4 Data API** (server-side, service account) + orders từ Supabase — xem §9.1.

| Event | Trigger | Params quan trọng |
|---|---|---|
| `view_item` | Mount ProductDetail | `id, name, price, category, material, quality_tier, currency` |
| `add_to_cart` | User click "Giữ hàng" (legacy) | `id, name, price, quantity: 1` |
| `lock_item_success` | Lock API 200 | `productId, price` (custom event) |
| `lock_item_timeout` | Countdown = 0 | `productId, lockDuration` (custom event) |
| `begin_checkout` | User vào /thanh-toan | `value, items[]` |
| `add_payment_info` | Chọn phương thức | `method: 'MOMO'\|'COD'` |
| `purchase` | Order PAID (COD tạo xong / MoMo IPN resultCode=0) | `transaction_id, value, currency, items[], shipping` |
| `view_collection` | Mount /bo-suu-tap/[slug] | `collection_id, collection_name` |

**Pattern an toàn SSR**:
```ts
// hooks/use-jewelry-analytics.ts
const send = (name: string, params: Record<string, unknown>) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
};
```

**Cookie consent (Nghị định 13/2023 VN)**:
```tsx
// Trong layout.tsx, default chưa consent
<Script id="ga-consent-default" strategy="beforeInteractive">
  {`window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    ad_storage: 'denied', analytics_storage: 'denied',
    wait_for_update: 500
  });`}
</Script>
{/* <ConsentBanner/> → khi user click "Chấp nhận" → gtag('consent','update',{analytics_storage:'granted'}) */}
```

---

## 9.1. LUỒNG 5b — ADMIN ANALYTICS (GA4 DATA API + ORDERS)

> **Status**: ✅ done. Trang `/admin/analytics` dùng số liệu thật từ GA4 Data API (server-side, service account) + orders từ Supabase.

### Kiến trúc
```
[Browser /admin/analytics]
        │
        │  GET /api/admin/analytics?days=7
        ▼
[Route Handler — Node runtime, requireAdmin]
        │
        ├─► [lib/analytics/ga4.ts]  BetaAnalyticsDataClient
        │      service account: GA4_SERVICE_ACCOUNT_JSON | GOOGLE_APPLICATION_CREDENTIALS
        │      property: GA4_PROPERTY_ID
        │      queries: runReport, runRealtimeReport
        │      metrics: sessions, eventCount, conversions, newUsers, totalUsers,
        │               bounceRate, activeUsers, dailySessions, countrySessions
        │
        └─► [lib/analytics/orders.ts]  supabaseAdmin (service_role)
               queries: getOrderStats, getTopProductsByRevenue, getDailyRevenue
               filter: payment_status = 'PAID' trong range
        │
        ▼
[Response JSON]  →  [Page render] 4 KPI card + funnel + traffic + top products + daily chart
```

### Env cần thêm
```bash
GA4_PROPERTY_ID=123456789              # dạng số, GA4 Admin → Property column
GA4_SERVICE_ACCOUNT_JSON='{...}'       # inline JSON (Vercel-friendly)
# hoặc
GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json  # dev local
```

### Setup service account (1 lần)
1. Google Cloud Console → IAM & Admin → Service Accounts → Create.
2. Grant role: **Viewer** (chỉ đọc data).
3. Tạo key JSON → copy nội dung dán vào `GA4_SERVICE_ACCOUNT_JSON` (escape newline nếu cần).
4. GA4 Admin → Property → Property Access Management → Add service account email với role **Viewer**.

### Caching / rate-limit
- Hiện không cache — mỗi lần load page = 1 batch Promise.all.
- Nếu traffic cao, thêm `unstable_cache` (Next.js) hoặc Upstash Redis TTL 60s.
- GA4 Data API quota: 250K tokens/project/ngày (free).

### Graceful degradation
- Nếu thiếu `GA4_PROPERTY_ID` hoặc service account → `isGA4Configured() = false`.
- API vẫn trả 200, `data.ga4.configured = false`, các field GA4 = `null`.
- Page hiển thị banner warning + KPI cards GA4 = "—", orders vẫn render bình thường.

### Files
```
lib/analytics/
├── ga4.ts           # BetaAnalyticsDataClient singleton + isGA4Configured()
├── queries.ts       # typed wrappers: getSessions, getEventCount, getKeyEvents,
│                    #   getNewUsers, getBounceRate, getActiveUsers30m,
│                    #   getSessionsByDay, getSessionsByCountry, pctDelta
└── orders.ts        # getOrderStats, getTopProductsByRevenue, getDailyRevenue
app/api/admin/analytics/route.ts   # GET ?days=7 — combine GA4 + orders
app/(admin)/admin/analytics/page.tsx  # client page, fetch + render + delta %
```

---

## 10. LUỒNG 6 — AUTH & PHÂN QUYỀN

> **Status**: ✅ done — middleware + /admin/login + /403. require-user đổi tên thành require-customer.
> 🆕 Sprint "Login + Admin Block" (2026-07-17): fix race condition kẹt loading, admin block mua hàng, customer_id sync theo email — xem §10.1, §10.2, §10.3.

```
[Request tới /dashboard/* hoặc /api/admin/*]
        │
        ▼
[middleware.ts (Edge)]
   supabase.auth.getUser() (từ cookie via @supabase/ssr)
   if (!user) → redirect /login
   select role from profiles where id = user.id
   if (role !== 'admin') → redirect /403
   → cho qua
```

- Admin đăng nhập bằng email/password (Supabase Auth).
- End-user (khách mua) KHÔNG cần đăng ký → guest checkout.
- Trang `/login` riêng cho admin (đường dẫn `/admin/login` để khách không thấy).

### 10.1. 🆕 Customer login flow — fix race condition kẹt loading (sprint 2026-07-17)

> **Vấn đề đã sửa**: Sau khi signIn thành công, `router.push(nextParam)` được gọi ngay → browser gửi request RSC với cookie session **chưa commit xong** → middleware/Server nhận `!user` → redirect ngược `/login` → component remount → loop vô tận → spinner "Đang kiểm tra phiên đăng nhập..." quay mãi.

```
[User mở /tai-khoan/dang-nhap?next=/tai-khoan/ho-so]
        │
        ▼
[useEffect mount]
   supabase.auth.getUser()
   ├─ có user → router.replace(next) + setCheckingSession(false) [fallback]
   └─ không    → setCheckingSession(false) → render form
        │
        ▼
[User submit form]
   await supabase.auth.signInWithPassword(...)
   ├─ error   → setError + setLoading(false) → return
   └─ success → waitForSession(2000ms) — poll getSession() mỗi 100ms
                  ├─ session ready → setLoading(false) → router.push(next) → router.refresh()
                  └─ timeout 2s    → setError('Không thể xác nhận phiên...') + setLoading(false)
```

**Files**:
- `app/(store)/tai-khoan/dang-nhap/page.tsx` — thêm `waitForSession()` helper + `setLoading(false)` ở success + fallback `setCheckingSession(false)` trong effect.

**Edge case**:
- Cookie bị chặn (extension privacy) → timeout 2s → báo lỗi rõ, không kẹt vĩnh viễn.
- User spam click submit → button vẫn disabled (loading=true cho tới khi timeout/redirect).
- Reload giữa chừng → effect check `getUser()` lại, nếu đã login thì replace; không loop.

### 10.2. 🆕 Admin block mua hàng (sprint 2026-07-17)

> **Vấn đề**: Trước đó `/thanh-toan` và `/api/orders` không check role → admin có thể đặt hàng → order bị "mồ côi" (admin không thể xem trong `/tai-khoan/*` vì `requireCustomer` throw 403).

**Defense in depth — 3 lớp**:

| Layer | File | Hành vi |
|---|---|---|
| 1. **Page guard** | `app/(store)/thanh-toan/page.tsx` | Server Component check `getCurrentUser().role === 'admin'` → render `<AdminCheckoutBlocked />` (fallback page giải thích + link về `/admin` / `/` / `/tai-khoan/dang-xuat`). **KHÔNG** redirect /403 (UX kém). |
| 2. **API guard** | `app/api/orders/route.ts` | Đầu route: `createServerClient` (cookie-bound) + `auth.getUser()` + check `profile.role === 'admin'` → return `403 { error: 'NOT_CUSTOMER', message: '...' }`. Cũng set `customer_id` ở đây nếu user login. |
| 3. **UI guard** | `app/(store)/gio-hang/page.tsx` | Client detect role sau mount → disable button "Tiến hành thanh toán" + show warning box (icon `ShieldAlert`) + đổi text thành "Admin không thể đặt hàng". |

**Helper mới**: `getCurrentUser()` trong `lib/auth/require-customer.ts` — trả `{ user, role, profile } | null`, **không filter role** (khác với `requireCustomer()` chỉ chấp nhận role='customer').

**Admin UX** khi vào `/thanh-toan`:
- Thấy page với icon `ShieldAlert` vàng
- Giải thích: "Đơn hàng sẽ bị mồ côi — admin không thể xem lại trong /tai-khoan/don-hang"
- 2 button: "Về Admin Panel" (gold) + "Về trang chủ" (ghost)
- Link nhỏ: "Cần đăng xuất admin? → Đăng xuất"

### 10.3. 🆕 Customer ID sync theo email (sprint 2026-07-17)

> **Vấn đề**: Trước đó API `/api/orders` **không set `customer_id`** (luôn NULL) → RLS `orders_self_read` (auth.uid() = customer_id) fail → `/tai-khoan/don-hang` luôn trả 0 orders.

**Fix**:

| Action | Cách |
|---|---|
| **Orders mới (user login)** | API `/api/orders` set `customer_id = auth.uid()` ngay khi insert. |
| **Orders cũ (guest)** | Migration 0011: RPC `link_my_guest_orders()` match theo `customer_email = auth.users.email`, set `customer_id = auth.uid()`. Gọi từ client sau login/signup. |
| **Backfill tự động** | Migration 0011 có `DO $$ ... $$` block lặp qua tất cả auth.users, update orders có email khớp. Log `[0011] BACKFILL DONE: N orders linked`. |

**Files**:
- `app/api/orders/route.ts` — set `customer_id: currentUserId` trong INSERT.
- `supabase/migrations/0011_link_orders_by_email.sql` — mở rộng `link_guest_orders_to_user` (match email thay vì phone) + tạo mới `link_my_guest_orders` RPC + backfill auto.
- `lib/auth/require-customer.ts` — thêm `getCurrentUser()` helper.

**Migration 0011 cần apply**:
1. Mở Supabase Dashboard → SQL Editor.
2. Paste nội dung file `supabase/migrations/0011_link_orders_by_email.sql`.
3. Run → sẽ thấy log `[0011] Linked X orders for user ...` và `[0011] BACKFILL DONE: N total orders linked to users`.
4. Verify: `SELECT id, code, customer_id, customer_email FROM orders WHERE customer_id IS NOT NULL;` → phải có orders linked.

**Trade-off**:
- Match theo email (khuyến nghị) > match theo SĐT (rủi ro 2 user cùng SĐT test).
- Email customer nhập lúc guest checkout phải khớp email đăng ký → nếu user đăng ký email khác, đơn cũ vẫn NULL. Acceptable cho MVP.

---

## 11. LUỒNG 7 — ADMIN BULK UPLOAD

> **Status**: 🟡 Page + API real (session này). ❌ xlsx parse, ❌ publish-drafts flow (DRAFT enum missing).

```
[Admin /dashboard/products/bulk-upload]
        │
        ▼
[Chọn collection_id từ dropdown]
        │
        ├─► Mode A: Drag-drop .xlsx/.csv
        │     SheetJS parse → validate từng row (zod schema)
        │     → preview table, fix errors inline
        │
        └─► Mode B: Quick-form table (thêm row tay)
              → mỗi row có Title/Price/Tier/Season/Image
        │
        ▼
[Upload ảnh song song lên Supabase Storage]
   Promise.all(files.map(f => supabase.storage
     .from('jewelry-images')
     .upload(`${uuid()}.webp`, f, { contentType: 'image/webp' })))
   → lấy publicUrl[]
        │
        ▼
[POST /api/admin/bulk-import  { collection_id, items: [...] }]
   middleware: role=admin
   1. zod validate toàn bộ payload
   2. Insert từng row (transaction — rollback nếu 1 fail)
   3. Return { inserted, errors: [] }
        │
        ▼
[UI: toast "Đã đăng X sản phẩm", redirect /dashboard/products]
```

---

## 12. SEO & PERFORMANCE

> **Status**: ✅ done — metadata + JSON-LD + sitemap + robots + next.config. ❌ CWV monitoring, ❌ hero preload.

- **Metadata**: mỗi page có `generateMetadata` với title/desc/OG image.
- **JSON-LD**: `Product` (chi tiết), `BreadcrumbList` (collection), `Organization` (footer).
- **Sitemap** (`app/sitemap.ts`): list products + collections, revalidate mỗi giờ.
- **Robots** (`app/robots.ts`): allow all, disallow `/dashboard/`, `/api/`.
- **Image**: Next/Image + `images.remotePatterns` cho Supabase + `formats: ['image/avif','image/webp']`.
- **Core Web Vitals target**: LCP < 2.5s, CLS < 0.1, INP < 200ms.
- **Preload**: hero image, font (Cormorant Garamond + Inter subset).

---

## 13. BẢO MẬT & VẬN HÀNH

> **Status**: 🟡 RLS + MoMo signature + idempotency done. ❌ rate-limit, ❌ Sentry, ❌ env validation, ❌ structured logging.

- **Rate-limit** `/api/lock-item`, `/api/orders`, `/api/momo/*` (Upstash Redis @vercel/edge): 10 req / phút / IP.
- **RLS (Row Level Security)**:
  - `products`, `collections`: SELECT public, INSERT/UPDATE admin only.
  - `orders`: SELECT admin only; client tra cứu qua API verify (code + phone).
  - `inventory_locks`, `payment_transactions`: service_role only.
- **MoMo security**:
  - Secret key KHÔNG bao giờ lộ client.
  - Verify signature IPN trước khi update DB.
  - Idempotency: check `momo_request_id` UNIQUE.
- **Backup**: Supabase PITR bật (Pro plan).
- **Env**: validate lúc startup (zod schema).
- **Error tracking**: Sentry.
- **Logging**: structured JSON, redact phone/email.

---

## 14. ENV & CONFIG

> **Status**: 🟡 next.config done. .env thiếu ~12 var quan trọng: GA, MoMo (5), AI (4), Redis (2), Sentry, S3 bucket, SITE_URL.

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY=

# === Bank QR (VietQR — FREE, không cần MST) ===
# Dùng tài khoản cá nhân được. Xem danh sách BANK_CODE ở lib/bank/types.ts
BANK_CODE=VCB                      # Mã ngân hàng (vd: VCB, TCB, MB, ACB, ...)
BANK_ACCOUNT_NUMBER=1234567890     # Số tài khoản nhận tiền
BANK_ACCOUNT_NAME=NGUYEN VAN A     # Uppercase, không dấu (vd: NGUYEN VAN A)

# === MoMo (Phase 2 — khi có MST doanh nghiệp) ===
# Xem docs/momo-sandbox-setup.md 8 bước. Hiện để trống, không block MVP.
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_REDIRECT_URL=http://localhost:3000/momo/return
MOMO_IPN_URL=http://localhost:3000/api/momo/ipn
# Production dùng https://payment.momo.vn/v2/gateway/api/create
# Test dùng https://test-payment.momo.vn/v2/gateway/api/create

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

SENTRY_DSN=
```

### `next.config.js` bắt buộc
```js
module.exports = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '<project-id>.supabase.co' }
    ],
    formats: ['image/avif', 'image/webp']
  },
  experimental: { serverActions: { bodySizeLimit: '10mb' } } // bulk-upload
};
```

---

## 15. LUỒNG 8 — AI CHATBOT TƯ VẤN SẢN PHẨM

> **Status**: ❌ NOT STARTED (0%). pgvector + chat tables + match_products + embed trigger + /api/chat + 7 components + use-chat-session.

### 15.1. Mục tiêu & Use case
- Khách hỏi tự nhiên: *"Có nhẫn bạc 925 nào dưới 2 triệu không?"*, *"Mùa hè này có bộ sưu tập gì?"*, *"Nhẫn mệnh kim thì chọn chất liệu gì?"*
- Bot trả lời dựa trên **dữ liệu thật** từ DB (không hallucinate giá/tên), kèm card sản phẩm click được → tăng conversion.

### 15.2. Stack chọn
| Layer | Công nghệ | Lý do |
|---|---|---|
| Framework | **Vercel AI SDK 7** (`ai`, `@ai-sdk/react`) | Native Next.js App Router, streaming, tool calling |
| Model | **Google `gemini-2.5-flash`** (FREE tier) hoặc OpenAI `gpt-4o-mini` | Xem bảng so sánh §15.2.1 |
| Embedding | **Google `gemini-embedding-001`** (FREE 1500 req/ngày) | Free, hỗ trợ tiếng Việt tốt |
| Vector DB | **Supabase pgvector** | Tận dụng DB hiện có, không vendor mới |
| UI | Floating bubble góc phải màn hình, mở rộng thành panel | Retro dark + gold border, khớp brand |

#### 15.2.1. So sánh model AI (chi phí + tier miễn phí)

| Model | Provider | Free tier | Trả phí | Tiếng Việt | Tool calling | Gợi ý |
|---|---|---|---|---|---|---|
| **`gemini-2.5-flash`** | Google AI Studio | ✅ **15 RPM, 1M TPM, 500 RPD** | $0.075/1M in, $0.30/1M out | ⭐⭐⭐⭐ | ✅ | **Khuyến nghị #1** — free, nhanh, đủ tốt |
| **`gemini-2.5-pro`** | Google AI Studio | ✅ 5 RPM, 250K TPM | $1.25/1M in | ⭐⭐⭐⭐⭐ | ✅ | Dùng khi cần suy luận phức tạp |
| `gpt-4o-mini` | OpenAI | ❌ | $0.15/1M in, $0.60/1M out | ⭐⭐⭐⭐ | ✅ | Rẻ nhất nếu đã có key |
| `gpt-4.1-nano` | OpenAI | ❌ | $0.10/1M in, $0.40/1M out | ⭐⭐⭐⭐ | ✅ | Rẻ hơn 4o-mini |
| `claude-3-5-haiku` | Anthropic | ❌ | $0.80/1M in, $4/1M out | ⭐⭐⭐⭐⭐ | ✅ | Đắt, chỉ dùng khi cần |
| `deepseek-chat` | DeepSeek | ❌ | $0.14/1M in (cache hit free) | ⭐⭐⭐ | ✅ | Rẻ nếu chấp nhận data CN |
| `llama-3.3-70b` (Groq) | Groq | ✅ **30 RPM** | $0.59/1M in | ⭐⭐⭐ | ✅ | Free + cực nhanh, có thể thay thế |
| `llama-3.1-8b` (Groq) | Groq | ✅ **30 RPM** | $0.05/1M in | ⭐⭐⭐ | ✅ | Free + rẻ, model nhỏ |
| Local Ollama (qwen2.5, llama) | Self-host | ✅ Free (điện + RAM) | $0 | ⭐⭐⭐⭐ (qwen) | ⚠️ cần setup | **Khuyến nghị #2** nếu có VPS |

#### 15.2.2. Chiến lược đề xuất (multi-provider với fallback)

**Phase 1 (MVP, $0)**: Dùng **Gemini 2.5 Flash** làm primary (free tier 1M tokens/ngày = ~2000 conversations), **Groq Llama 3.3 70B** làm fallback khi Gemini hết quota.

**Phase 2 (scale)**: Mua OpenAI key ($5 deposit đủ dùng 1 năm cho traffic nhỏ) để có model tốt hơn + ổn định hơn cho production.

**Phase 3 (enterprise)**: Self-host Ollama + Qwen 2.5 7B trên VPS nếu muốn zero-cost + data privacy tuyệt đối.

#### 15.2.3. Code pattern: switch provider dễ dàng

```ts
// lib/chatbot/client.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Primary → fallback chain
export const chatModel = process.env.AI_PRIMARY === 'openai'
  ? openai('gpt-4o-mini')
  : process.env.AI_PRIMARY === 'groq'
    ? groq('llama-3.3-70b-versatile')
    : google('gemini-2.5-flash'); // default: free

// Embedding
export const embeddingModel = process.env.EMBED_PRIMARY === 'openai'
  ? openai.embedding('text-embedding-3-small')
  : google.embedding('gemini-embedding-001');
```

#### 15.2.4. Embedding miễn phí (alternatives cho OpenAI)

| Model | Provider | Free tier | Dim | Gợi ý |
|---|---|---|---|---|
| **`gemini-embedding-001`** | Google | ✅ 1500 req/ngày | 768 | **Khuyến nghị #1** |
| `text-embedding-004` | Google | ✅ 1500 req/ngày | 768 | Tương tự gemini-embedding-001 |
| `nomic-embed-text` | Ollama local | ✅ Free (local) | 768 | Tự host, unlimited |
| `mxbai-embed-large` | Ollama local | ✅ Free (local) | 1024 | Chất lượng cao hơn nomic |
| `voyage-3` | Voyage AI | ❌ | 1024 | Đắt, chỉ khi cần RAG cực chuẩn |

**Lưu ý**: Nếu đổi từ OpenAI 1536-dim sang Gemini 768-dim → phải `DROP EXTENSION vector;` và tạo lại cột với dim mới, hoặc giữ 1536-dim và dùng `gemini-embedding-001` với `outputDimensionality: 1536` (hỗ trợ).

### 15.3. Schema bổ sung (RAG + memory)
```sql
-- Bật extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Bảng embedding cho products
ALTER TABLE products
  ADD COLUMN embedding vector(1536),
  ADD COLUMN embedding_text TEXT;  -- text đã embed (để debug)

CREATE INDEX idx_products_embedding ON products
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Lịch sử chat (lưu để admin đọc, training sau)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(120) NOT NULL,         -- anonymous-id từ cookie
  user_id UUID REFERENCES auth.users(id),  -- null nếu guest
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,              -- 'user' | 'assistant' | 'tool'
  content TEXT NOT NULL,
  tool_calls JSONB,                       -- nếu assistant gọi tool
  tool_results JSONB,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
```

### 15.4. Pipeline embed (chạy 1 lần hoặc khi admin sửa product)
```
[Trigger: AFTER INSERT/UPDATE ON products]
        │
        ▼
[Trigger function: embed_product()]
   1. Build text = title + ' | ' + description + ' | ' + material + ' | ' + category + ' | ' + season_tags
   2. Call OpenAI Embeddings API (text-embedding-3-small)
   3. UPDATE products SET embedding = $1, embedding_text = $2 WHERE id = NEW.id
        │
        ▼
[Hoặc batch script: npm run embed:all (dùng khi first setup)]
```

### 15.5. Tool definitions (chatbot gọi structured query)
```ts
// lib/chatbot/tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const searchProducts = tool({
  description: 'Tìm sản phẩm theo tên, danh mục, mùa, chất liệu, giá, tier',
  parameters: z.object({
    keyword: z.string().optional().describe('Tên/mô tả sản phẩm (tiếng Việt)'),
    category: z.enum(['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY']).optional(),
    material: z.enum(['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG']).optional(),
    season: z.string().optional().describe('VD: SUMMER_2026, VINTAGE_AUTUMN'),
    qualityTier: z.enum(['SSS', 'SS', 'S']).optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    onlyAvailable: z.boolean().default(true),
    limit: z.number().default(5),
  }),
  execute: async (params) => {
    let q = supabase.from('products').select('id, title, slug, price, image_url, material, quality_tier, status');
    if (params.keyword)        q = q.ilike('title', `%${params.keyword}%`);
    if (params.category)       q = q.eq('category', params.category);
    if (params.material)       q = q.eq('material', params.material);
    if (params.qualityTier)    q = q.eq('quality_tier', params.qualityTier);
    if (params.season)         q = q.contains('season_tags', [params.season]);
    if (params.minPrice)       q = q.gte('price', params.minPrice);
    if (params.maxPrice)       q = q.lte('price', params.maxPrice);
    if (params.onlyAvailable)  q = q.eq('status', 'AVAILABLE');
    const { data } = await q.order('is_featured', { ascending: false }).limit(params.limit);
    return data ?? [];
  },
});

export const semanticSearch = tool({
  description: 'Tìm sản phẩm bằng ngữ nghĩa (câu hỏi tự nhiên, không cần keyword chính xác)',
  parameters: z.object({
    query: z.string().describe('Câu hỏi tự nhiên của khách'),
    limit: z.number().default(5),
  }),
  execute: async ({ query, limit }) => {
    const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query });
    const { data } = await supabase.rpc('match_products', {
      query_embedding: emb.data[0].embedding,
      match_count: limit,
    });
    return data ?? [];
  },
});

export const getProductDetail = tool({
  description: 'Lấy chi tiết 1 sản phẩm theo tên/slug',
  parameters: z.object({ slug: z.string() }),
  execute: async ({ slug }) => {
    const { data } = await supabase.from('products').select('*').eq('slug', slug).single();
    return data;
  },
});

export const getCurrentCollections = tool({
  description: 'Lấy danh sách collection đang published',
  parameters: z.object({}),
  execute: async () => {
    const { data } = await supabase.from('collections').select('id, name, slug, cover_image_url').eq('is_published', true).order('display_order');
    return data ?? [];
  },
});
```

### 15.6. RPC semantic search
```sql
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_status product_status_enum DEFAULT 'AVAILABLE'
)
RETURNS TABLE (
  id UUID, title VARCHAR, slug VARCHAR, price NUMERIC,
  image_url TEXT, material material_enum, quality_tier quality_tier_enum,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.slug, p.price, p.image_url, p.material, p.quality_tier,
         1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.embedding IS NOT NULL
    AND p.status = filter_status
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 15.7. Route handler + streaming
```
app/api/chat/route.ts
        │
        ▼
[POST /api/chat  { messages: [...], sessionId? }]
        │
        ▼
[Route Handler]
   1. Get/create chat_session (theo client_id cookie)
   2. Insert user message vào chat_messages
   3. Lấy last 10 messages làm context (sliding window)
   4. Gọi streamText:
        model: openai('gpt-4o-mini')
        system: SYSTEM_PROMPT (xem §15.8)
        tools: [searchProducts, semanticSearch, getProductDetail, getCurrentCollections]
        maxSteps: 4 (cho phép multi-step tool calls)
   5. Trả về stream text/event cho client
   6. Khi stream complete: insert assistant message + tool results vào DB
        │
        ▼
[Client <ChatWidget/> dùng useChat() từ @ai-sdk/react]
   - Hiển thị tin nhắn streaming
   - Khi message có tool results, render <ProductCard/> cho mỗi product
   - Auto-scroll
```

### 15.8. System prompt (tiếng Việt, retro tone)
```text
Bạn là "Bà Chủ Tiệm" — chuyên gia tư vấn trang sức si Nhật vintage tại Emerald Vault.
Tính cách: ấm áp, am hiểu, hơi bí ẩn, dùng giọng văn cổ điển pha chút Á Đông.

Quy tắc BẮT BUỘC:
1. KHÔNG tự bịa tên/giá sản phẩm. LUÔN dùng tool searchProducts hoặc semanticSearch trước khi trả lời.
2. Mỗi lần đề cập sản phẩm, kèm link /san-pham/{slug}.
3. Nếu khách hỏi mùa, dùng getCurrentCollections.
4. Trả lời ngắn gọn (2-4 câu), cuối mỗi tin nhắn gợi ý 1 câu follow-up.
5. Nếu không tìm thấy, nói thành thật: "Hiện tiệm chưa có món này, em có thể để lại SĐT để tiệm thông báo khi có hàng không ạ?"
6. KHÔNG hứa giảm giá, không so sánh với thương hiệu khác.
7. Format tiền: "2.500.000đ" (không dùng $ hay ký hiệu khác).
```

### 15.9. Component UI
```
components/chatbot/
├── chat-widget.tsx          # Floating bubble + panel (Client Component)
├── chat-trigger.tsx         # Button góc phải, gold border, có pulse animation
├── chat-panel.tsx           # Full panel: header + messages + input
├── chat-message.tsx         # Render 1 message (text hoặc có tool results)
├── chat-product-card.tsx    # Mini card sản phẩm trong message
├── chat-input.tsx           # Textarea + Enter to send
└── chat-welcome.tsx         # Tin nhắn chào + gợi ý câu hỏi
```

### 15.10. Component sơ đồ
```
app/layout.tsx
  └── <ChatWidget/>     # Mount global ở mọi page (trừ /admin/*)
         └── useChat()  # Vercel AI SDK hook
              │
              ▼ POST /api/chat
         [Server stream + tool calls]
              │
              ▼
         [Render messages + ProductCard nếu có tool result]
```

### 15.11. Cost estimate (Phase 1: $0 với Gemini free tier)

**Gemini 2.5 Flash free tier**:
- 15 RPM, 1M TPM (tokens/phút), 500 RPD (requests/ngày)
- 1 conversation ~20 lượt × 500 tokens = 10K tokens
- → ~**100 conversations/ngày miễn phí** (giới hạn 500 RPD)
- Embedding free: 1500 requests/ngày → batch embed 1500 products = 1 ngày là xong

**Nếu vượt free tier** (Gemini 2.5 Flash trả phí):
- $0.075/1M input, $0.30/1M output
- 1000 conversations/ngày × 10K tokens = 10M tokens
- → ~$0.75 input + $3 output = **~$3.75/ngày = $112/tháng**

**OpenAI GPT-4o-mini** (nếu dùng):
- ~$0.005/conversation
- 1000 conversations/ngày = **$5/ngày = $150/tháng**

**Self-host Ollama** (nếu có VPS 4GB+ RAM):
- 1 lần cài model (Qwen 2.5 7B ~5GB)
- Chi phí: điện + RAM của VPS
- Tốt nhất cho data privacy, không giới hạn
- **Khuyến nghị nếu traffic > 500 conversations/ngày**

### 15.12. Tracking & Analytics
- GA4 event mới: `chat_opened`, `chat_message_sent`, `chat_product_clicked`, `chat_recommended_to_checkout`
- Admin dashboard: `/dashboard/chat` — list sessions, messages, tool calls (optional MVP+)

### 15.13. Bảo mật & Rate limit
- Rate-limit `/api/chat`: **20 messages / phút / IP** (Upstash Redis)
- Không cho phép hỏi nội dung admin (`role === 'admin'` bị filter khỏi context)
- System prompt có guardrail chống prompt injection
- System prompt thông báo: "Bạn chỉ tư vấn về trang sức si Nhật tại Emerald Vault"
- Optional: thêm **OpenAI moderation API** check input trước khi gửi
- Dùng `output: 'text'` (không phải 'object') để tránh model tự structure

### 15.14. Dependencies cần cài
```bash
# Pick 1 (or all for fallback chain):
npm i @ai-sdk/google                    # Gemini - FREE tier
npm i @ai-sdk/groq                      # Groq - FREE tier
npm i @ai-sdk/openai                    # OpenAI - trả phí
npm i ai @ai-sdk/react                  # Core + UI hook
# pgvector: chỉ cần SQL migration, không cần package
```

### 15.15. Env vars thêm
```bash
# Free tier mặc định (Gemini)
GOOGLE_AI_API_KEY=                     # https://aistudio.google.com/apikey (FREE)
AI_PRIMARY=gemini                      # 'gemini' | 'openai' | 'groq'

# Optional fallback
GROQ_API_KEY=                          # https://console.groq.com (FREE 30 RPM)
OPENAI_API_KEY=                        # https://platform.openai.com (trả phí)

# Embedding
EMBED_PRIMARY=gemini                   # 'gemini' | 'openai'
# Nếu dùng Gemini embedding, KHÔNG cần OPENAI_API_KEY
```

### 15.16. Files cần tạo
```
supabase/migrations/0004_chatbot_schema.sql    # pgvector + chat_sessions + chat_messages + match_products
supabase/migrations/0005_embed_trigger.sql     # trigger auto-embed on product change
scripts/embed-all-products.ts                  # batch embed script
lib/chatbot/
├── tools.ts           # searchProducts, semanticSearch, getProductDetail, getCurrentCollections
├── system-prompt.ts   # "Bà Chủ Tiệm" persona
└── client.ts          # openai client singleton
app/api/chat/route.ts                          # POST stream handler
components/chatbot/*                            # UI components
hooks/use-chat-session.ts                       # tạo/lấy sessionId từ cookie

---

## 16. UI/UX PATTERNS TỪ LAURELLE & LILLICOCO (bổ sung vào plan)

> **Status**: 🟡 Navbar + announcement + tier-showcase + trust-strip + accordions done. ❌ zoom-image, latest-drops, newsletter-popup, comparison-table, mobile-menu.

> Chi tiết phân tích đầy đủ: xem `analysis.md`. Đây là phần tóm tắt các pattern cần thêm vào `components/` và `pages/`.

### 16.1. Navigation Structure (Final)

```
Navbar items:
├── SI NHẬT (dropdown)
│   ├── Nhẫn         /san-pham?category=NHAN
│   ├── Dây chuyền   /san-pham?category=DAY_CHUYEN
│   ├── Bông tai     /san-pham?category=BONG_TAI
│   ├── Vòng tay     /san-pham?category=VONG_TAY
│   └── Mặt dây      /san-pham?category=MAT_DAY
├── BỘ SƯU TẬP     /bo-suu-tap
│   └── Grid các collection (cover + name + launch_date badge)
├── THEO CHẤT LIỆU  (dropdown)
│   ├── Bạc 925      /san-pham?material=BAC_925
│   ├── Mạ vàng 18K  /san-pham?material=MA_VANG_18K
│   ├── Mạ vàng 24K  /san-pham?material=MA_VANG_24K
│   └── Vàng 18K     /san-pham?material=VANG_18K
├── THEO TIER        (dropdown)
│   ├── SSS          /san-pham?tier=SSS
│   ├── SS           /san-pham?tier=SS
│   └── S            /san-pham?tier=S
├── CÂU CHUYỆN       /cau-chuyen
└── LIÊN HỆ         /lien-he
```

### 16.2. Components MỚI cần bổ sung vào §4

```
components/
├── layout/
│   ├── announcement-bar.tsx      # Top bar xoay vòng (sale, freeship, ...)
│   └── (navbar.tsx, footer.tsx, mobile-menu.tsx — đã có)
│
├── product/
│   ├── product-card.tsx          # ĐÃ CÓ — thêm hover swap ảnh
│   ├── product-grid.tsx          # ĐÃ CÓ
│   ├── product-gallery.tsx       # ĐÃ CÓ — thêm zoom
│   ├── product-meta.tsx          # ĐÃ CÓ
│   ├── product-story.tsx         # ĐÃ CÓ — long-form editorial
│   ├── product-skeleton.tsx      # ĐÃ CÓ
│   ├── product-count.tsx         # MỚI — "Hiển thị 12 / 45 sản phẩm"
│   ├── product-breadcrumb.tsx    # MỚI — breadcrumb
│   ├── recently-viewed.tsx       # MỚI — 6 sản phẩm vừa xem
│   ├── zoom-image.tsx            # MỚI — hover zoom chi tiết
│   └── product-accordion.tsx     # MỚI — Shipping / Returns / Care
│
├── home/
│   ├── hero-section.tsx          # ĐÃ CÓ
│   ├── featured-collections.tsx  # ĐÃ CÓ
│   ├── latest-arrivals.tsx       # ĐÃ CÓ — đổi tên thành "Si Mới Về"
│   ├── latest-drops.tsx          # MỚI — pattern Lillicoco (có launch_at)
│   ├── tier-showcase.tsx         # MỚI — SSS/SS/S explainer
│   ├── story-teaser.tsx          # ĐÃ CÓ
│   ├── trust-strip.tsx           # MỚI — 4 trust icons
│   └── newsletter-popup.tsx      # MỚI — modal sau 30s
│
├── ui/
│   ├── wishlist-button.tsx       # MỚI — heart icon, lưu localStorage
│   ├── newsletter-form.tsx       # MỚI — email subscribe
│   ├── comparison-table.tsx      # MỚI (P2) — so sánh sản phẩm
│   ├── (button, input, badge, card, dialog, skeleton, count-down, shine-image — đã có)
│
└── care/
    ├── care-guide.tsx            # MỚI — hướng dẫn bảo quản
    └── authentication-guide.tsx  # MỚI — cách phân biệt đồ si
```

### 16.3. Pages MỚI cần thêm vào §3.1

```
app/
├── cach-phan-biet-do-si/page.tsx     # MỚI — content marketing SEO
├── huong-dan-bao-quan/page.tsx       # MỚI — content marketing SEO
├── san-pham/page.tsx                 # UPDATE — thêm breadcrumb, product-count
├── (admin)/dashboard/
│   ├── newsletter/page.tsx           # MỚI — list subscribers, export CSV
│   └── reviews/page.tsx              # MỚI (P2) — moderate reviews
```

### 16.4. Schema bổ sung

```sql
-- Bảng newsletter
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(120) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- Bổ sung fields cho collections (cho "Latest Drops" pattern Lillicoco)
ALTER TABLE collections
  ADD COLUMN launch_at TIMESTAMPTZ,            -- ngày giờ drop
  ADD COLUMN story_text TEXT,                  -- "Inspired by..." narrative
  ADD COLUMN hero_gallery TEXT[] DEFAULT '{}', -- 3 ảnh hero
  ADD COLUMN meta_title VARCHAR(200),
  ADD COLUMN meta_description TEXT;

-- Bảng reviews (P2)
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name VARCHAR(120),
  customer_email VARCHAR(120),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_product ON product_reviews(product_id) WHERE is_approved = true;
```

### 16.5. Trust Strip (4 icons — tham khảo Laurelle)

```
Row ngang dưới hero, 4 cột:
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  🛡️ CHÍNH   │  ⏱️ GIỮ HÀNG │  🚚 FREESHIP │  🔒 BẢO    │
│  HÃNG 100%  │  10 PHÚT    │  TỪ 2 TRIỆU │  MẬT TT    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 16.6. PDP layout (tham khảo Lillicoco)

```
┌─────────────────────────────────────────────────────────────┐
│  BREADCRUMB: Trang chủ / Nhẫn / Nhẫn bạc SSS tên-mẫu       │
├──────────────────────────────────┬──────────────────────────┤
│                                  │  [SSS] badge gold        │
│   ┌─────────────┐                │  Title (Cinzel, lớn)     │
│   │  ẢNH CHÍNH  │                │  ────────────            │
│   │   1 / 5     │                │  "Bạc 925 - Nhật 1960s"  │
│   │             │                │  Era tag                 │
│   └─────────────┘                │  ────────────            │
│   [1][2][3][4][5]  thumbnails    │  2.500.000đ  (Gold lớn) │
│                                  │  ────────────            │
│   Ảnh gallery dọc (scroll)       │  Story 2-3 dòng          │
│                                  │                          │
│                                  │  [GIỮ HÀNG 10 PHÚT] btn │
│                                  │  [♡ Wishlist]            │
│                                  │  ────────────            │
│                                  │  Trust micro-icons       │
├──────────────────────────────────┴──────────────────────────┤
│  ▼ CÂU CHUYỆN MÓN ĐỒ (long-form, có ảnh minh họa)         │
│  ▼ THÔNG SỐ KỸ THUẬT (accordion)                            │
│  ▼ VẬN CHUYỂN & ĐỔI TRẢ (accordion)                        │
│  ▼ HƯỚNG DẪN BẢO QUẢN (accordion)                           │
├─────────────────────────────────────────────────────────────┤
│  BẠN CÓ THỂ THÍCH: 4 sản phẩm cùng tier/category           │
│  RECENTLY VIEWED: 6 sản phẩm                                │
└─────────────────────────────────────────────────────────────┘
```

### 16.7. Tier Showcase Section (homepage — điểm khác biệt EV)

```
┌─────────────────────────────────────────────────────────────┐
│                  PHÂN CẤP CHẤT LƯỢNG                        │
│                                                             │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│   │   SSS    │      │    SS    │      │    S     │         │
│   │ MỚI NGUYÊN│     │ TRÊN 95% │      │ TRÊN 90% │         │
│   │   SEAL   │      │  NGUYÊN  │      │  CHẤT    │         │
│   │          │      │   BẢN   │      │  LƯỢNG   │         │
│   │  Hiếm có │      │  Phổ    │      │  Phù hợp │         │
│   │  Tag gốc │      │  biến   │      │  tặng    │         │
│   └──────────┘      └──────────┘      └──────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 16.8. Kết quả: ưu tiên bổ sung vào todo.md

Đã update sang `todo.md` phần 🟡 P1 — section F (UI/UX) bổ sung các task mới.

---

## 17. LUỒNG 9 — AUTO PRODUCT PIPELINE (ẢNH → AI → EXCEL → ADMIN)

> **Status**: 🟡 Backend bulk API + admin page done. ❌ AI Vision generator script, ❌ Excel template, ❌ DRAFT enum.

### 17.1. Mục tiêu
Tự động hoá quy trình đăng sản phẩm hàng loạt cho đồ **si Nhật vintage** (mỗi món độc bản, số lượng 1):
1. Chụp/quét ảnh sản phẩm thật
2. AI vision (Gemini/OpenAI) tự sinh miêu tả, tên, tags, chất liệu, SEO
3. Xuất ra **Excel** theo bộ sưu tập / theo ngày khuy kiện
4. Import vào admin (hoặc auto-push nếu backend có sẵn)
5. Publish lên website

**Lưu ý quan trọng**: KHÔNG tự động hoá qua giao diện web ChatGPT/Gemini (dễ vỡ, vi phạm ToS, dính captcha). Gọi thẳng **API** của họ — ổn định, rẻ, không vi phạm.

### 17.2. Kiến trúc tổng thể
```
[Smartphone / Scanner]
   │ upload ảnh (jpg/webp, 1200x1200+)
   ▼
[Google Drive / Local folder]
   │ folder structure:
   │   /2026-07-14-khuy-kien/IMG_0001.jpg
   │   /2026-07-14-khuy-kien/IMG_0002.jpg
   │   /2026-07-21-vintage-summer/...
   ▼
[Script Node.js: scripts/ai-product-generator.ts]
   │
   ├── 1. Scan folder → list ảnh + collection name (từ tên folder)
   ├── 2. Upload ảnh lên Supabase Storage trước → lấy publicUrl[]
   │      (để script ghi URL vào Excel, không mang ảnh nhúng)
   ├── 3. Với mỗi ảnh, gọi Vision API (Gemini 2.5 Flash / GPT-4o-mini)
   │      prompt: structured output JSON với schema chuẩn
   ├── 4. Validate JSON (zod schema) → retry 1 lần nếu fail
   ├── 5. Append row vào Excel (ExcelJS), 1 file / collection
   │      file: products-{collection-slug}-{YYYY-MM-DD}.xlsx
   │
   ▼
[Excel file — người duyệt/sửa tay ~5 phút]
   │
   ├── Option A: Upload file vào admin form → bulk import
   └── Option B: (sau này) Script gọi thẳng API /api/admin/products/bulk
   ▼
[Backend: POST /api/admin/products/bulk]
   │
   ├── 1. Validate toàn bộ payload (zod)
   │      - SKU trùng → reject dòng đó
   │      - Thiếu price / collection_id → reject
   │      - collection không tồn tại → reject
   ├── 2. Insert từng dòng, KHÔNG fail cả batch
   │      trả về { inserted: [...], errors: [{row, reason}, ...] }
   ├── 3. Hỗ trợ flag draft: true (tạo nháp, chờ admin publish)
   │
   ▼
[Admin Products list] — review drafts → bấm Publish
   ▼
[Supabase products table] — status=AVAILABLE
   ▼
[Website tự động hiển thị qua ISR / revalidate]
```

### 17.3. Stack quyết định
| Layer | Công nghệ | Lý do |
|---|---|---|
| Script | **Node.js + TypeScript** | Cùng stack với Next.js, dùng lại types/zod |
| AI Vision | **Gemini 2.5 Flash** (default, FREE tier) | 15 RPM, 500 RPD free, đủ tốt cho tiếng Việt |
| Fallback AI | OpenAI `gpt-4o-mini` hoặc Groq `llama-3.2-90b-vision` | Khi Gemini hết quota |
| Excel | **ExcelJS** (Node) | Hỗ trợ style, formula, multi-sheet |
| Image upload | Supabase Storage (`admin-uploads` bucket) | Tận dụng infra hiện có |
| Trigger | Manual CLI (MVP) → sau này: watch folder / cron / webhook Drive | Linh hoạt theo nhu cầu |

### 17.4. Cấu trúc folder ảnh
```
/inbox/
├── 2026-07-14-khuy-kien/
│   ├── IMG_0001.jpg           # ảnh 1
│   ├── IMG_0002.jpg           # ảnh 2
│   └── notes.md               # optional: ghi chú tay (giá gốc, nguồn)
├── 2026-07-21-vintage-summer/
│   └── ...
└── _archive/                  # đã xử lý xong
```

**Quy ước đặt tên folder**:
- Format: `YYYY-MM-DD-{collection-slug}/`
- Collection slug khớp với bảng `collections` trong DB (tạo sẵn hoặc auto-create)

### 17.5. Script AI Generator (`scripts/ai-product-generator.ts`)

```ts
// Pseudocode
import { GoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const ProductSchema = z.object({
  title: z.string().max(255),                    // "Nhẫn bạc 925 cổ Nhật 1960s"
  slug: z.string().max(255),                    // "nhan-bac-925-co-nhat-1960s-001"
  description_short: z.string().max(160),       // SEO meta description
  description_long: z.string(),                 // 200-400 từ, có cảm xúc retro
  material: z.enum(['BAC_925','MA_VANG_18K','MA_VANG_24K','VANG_18K','KIM_CUONG']),
  category: z.enum(['NHAN','DAY_CHUYEN','BONG_TAI','VONG_TAY','MAT_DAY']),
  quality_tier: z.enum(['SSS','SS','S']),
  era_year: z.string().optional(),              // "1960s", "Showa 35"
  tags: z.array(z.string()).max(10),            // ["vintage", "showa", "minimalist"]
  suggested_price_vnd: z.number().int().positive(),
  seo_title: z.string().max(60),
  seo_keywords: z.array(z.string()).max(8),
});

const SYSTEM_PROMPT = `
Bạn là chuyên gia trang sức si Nhật vintage tại Emerald Vault.
Phân tích ảnh và trả về JSON mô tả sản phẩm theo schema.
- title: Tiếng Việt, tối đa 60 ký tự, có cảm xúc retro
- description_long: 200-400 từ, kể chuyện về nguồn gốc/era/cảm hứng
- material: CHỈ chọn 1 trong enum. Nếu không chắc → 'BAC_925' (mặc định an toàn)
- suggested_price_vnd: Ước lượng theo thị trường VN hiện tại
  - SSS (mới nguyên seal): 3.000.000 - 15.000.000
  - SS (95% nguyên bản): 1.500.000 - 5.000.000
  - S (trên 90% chất lượng): 500.000 - 2.000.000
- tags: dùng cho filter, viết thường, không dấu
- KHÔNG bịa thông tin không thấy trong ảnh
`;

async function processImage(imagePath: string, collectionSlug: string) {
  // 1. Upload ảnh lên Supabase
  const supabase = createClient(URL, KEY);
  const fileName = `${collectionSlug}/${uuid()}.webp`;
  const { data: upload } = await supabase.storage
    .from('admin-uploads')
    .upload(fileName, await readFile(imagePath), { contentType: 'image/webp' });
  const imageUrl = supabase.storage.from('admin-uploads').getPublicUrl(fileName).data.publicUrl;

  // 2. Gọi AI vision
  const imageBuffer = await readFile(imagePath);
  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: ProductSchema,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: SYSTEM_PROMPT },
        { type: 'image', image: imageBuffer },
      ],
    }],
  });

  return { ...object, image_url: imageUrl, source_image: path.basename(imagePath) };
}

async function main() {
  const inboxDir = './inbox';
  const folders = await readdir(inboxDir);
  
  for (const folder of folders) {
    if (folder.startsWith('_')) continue;
    const [date, ...slugParts] = folder.split('-').slice(0, 4); // "2026-07-14-khuy-kien"
    const collectionSlug = slugParts.join('-');
    const images = (await readdir(`${inboxDir}/${folder}`)).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
    
    // Tạo Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');
    sheet.columns = [
      { header: 'Title', key: 'title', width: 50 },
      { header: 'Slug', key: 'slug', width: 40 },
      { header: 'Material', key: 'material', width: 15 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Quality Tier', key: 'quality_tier', width: 12 },
      { header: 'Price (VND)', key: 'price', width: 15 },
      { header: 'Description Short', key: 'description_short', width: 50 },
      { header: 'Description Long', key: 'description_long', width: 80 },
      { header: 'Image URL', key: 'image_url', width: 60 },
      { header: 'Tags', key: 'tags', width: 30 },
      { header: 'SEO Title', key: 'seo_title', width: 40 },
      { header: 'SEO Keywords', key: 'seo_keywords', width: 30 },
      { header: 'Source Image', key: 'source_image', width: 20 },
    ];
    
    for (const img of images) {
      try {
        const product = await processImage(`${inboxDir}/${folder}/${img}`, collectionSlug);
        sheet.addRow({
          ...product,
          price: product.suggested_price_vnd,
          tags: product.tags.join(', '),
          seo_keywords: product.seo_keywords.join(', '),
        });
        console.log(`✓ ${img} → ${product.title}`);
      } catch (err) {
        sheet.addRow({ title: `[ERROR] ${img}`, description_long: err.message });
        console.error(`✗ ${img}: ${err.message}`);
      }
    }
    
    const outFile = `./outbox/products-${collectionSlug}-${date}.xlsx`;
    await workbook.xlsx.writeFile(outFile);
    console.log(`📄 ${outFile}`);
  }
}
```

### 17.6. Backend API: `POST /api/admin/products/bulk`

**Request**:
```json
{
  "collection_id": "uuid",
  "default_values": {
    "status": "AVAILABLE",
    "is_featured": false
  },
  "products": [
    {
      "title": "Nhẫn bạc 925 cổ Nhật 1960s",
      "slug": "nhan-bac-925-co-nhat-1960s-001",
      "description_short": "...",
      "description_long": "...",
      "material": "BAC_925",
      "category": "NHAN",
      "quality_tier": "SSS",
      "price": 3500000,
      "image_url": "https://...",
      "tags": ["vintage", "showa"],
      "season_tags": ["VINTAGE_AUTUMN"],
      "gallery": [],
      "draft": true
    }
  ]
}
```

**Response**:
```json
{
  "inserted": [
    { "row": 1, "id": "uuid", "slug": "..." }
  ],
  "errors": [
    { "row": 3, "slug": "...", "reason": "Slug already exists" }
  ],
  "summary": {
    "total": 10,
    "inserted": 8,
    "failed": 2
  }
}
```

**Validation rules** (zod schema):
- `slug` unique (check DB trước khi insert)
- `price` > 0
- `material`, `category`, `quality_tier` trong enum
- `image_url` accessible (HEAD request check 200)
- `collection_id` tồn tại
- Nếu `draft: true` → set `status = 'DRAFT'` (cần thêm enum)

**Thêm enum**:
```sql
-- Trong migration 0006
ALTER TYPE product_status_enum ADD VALUE 'DRAFT';
```

### 17.7. Admin UI: Form Import Excel

**Route**: `/(admin)/dashboard/products/import`

**Flow**:
1. Upload file .xlsx (drag-drop)
2. Parse bằng `xlsx` (SheetJS) ngay trên client
3. Hiển thị preview table với:
   - Dòng OK: nền xanh nhạt
   - Dòng lỗi: nền đỏ nhạt + tooltip lý do (validate client-side trước)
4. Dropdown chọn `collection_id` (bắt buộc)
5. Toggle: `Save as draft` | `Publish immediately`
6. Click "Import X products"
7. Loading state, gọi API, hiển thị kết quả
8. Nút "View in Products list" → chuyển trang

**Component**:
```
components/admin/
├── excel-uploader.tsx          # Drag-drop + parse
├── import-preview-table.tsx    # Bảng với dòng lỗi highlight
├── import-result-modal.tsx     # Kết quả sau khi submit
└── bulk-import-form.tsx        # Wrapper + collection selector
```

### 17.8. Excel Template (cột chuẩn)

Template file cố định, người dùng tải về từ admin → điền tay HOẶC script AI tự xuất ra:

| Cột | Bắt buộc | Mô tả | Enum / Format |
|---|---|---|---|
| Title | ✓ | Tên sản phẩm | max 255 ký tự |
| Slug | ✓ | URL-friendly | kebab-case, unique |
| Material | ✓ | Chất liệu | BAC_925 \| MA_VANG_18K \| MA_VANG_24K \| VANG_18K \| KIM_CUONG |
| Category | ✓ | Loại | NHAN \| DAY_CHUYEN \| BONG_TAI \| VONG_TAY \| MAT_DAY |
| Quality Tier | ✓ | Phân hạng | SSS \| SS \| S |
| Price (VND) | ✓ | Giá bán | số nguyên > 0 |
| Description Short | | Meta description | max 160 ký tự |
| Description Long | | Mô tả chi tiết | markdown/text |
| Image URL | ✓ | URL public | https://... |
| Gallery URLs | | Ảnh phụ, cách nhau dấu `;` | |
| Tags | | Filter tags, cách nhau dấu `,` | |
| Season Tags | | VD: SUMMER_2026, cách nhau dấu `,` | |
| Is Featured | | Nổi bật | true \| false |
| Era Year | | VD: 1960s, Showa 35 | optional |
| SEO Title | | max 60 ký tự | |
| SEO Keywords | | cách nhau dấu `,` | |

### 17.9. Workflow thực tế (end-to-end)

**Hàng ngày (15 phút)**:
1. Chụp/quét ảnh sản phẩm mới (~10-20 món/ngày)
2. Thả vào folder `/inbox/2026-07-14-khuy-kien/`
3. Chạy CLI: `npm run ai:generate -- --collection=khuy-kien`
4. AI xử lý xong → Excel xuất hiện ở `/outbox/`
5. Mở Excel, duyệt/sửa giá (5-10 phút) — đây là bước QC duy nhất
6. Vào admin → Products → Import Excel → upload → Preview → Import as draft
7. Vào Products list, bấm "Publish All Drafts" cho collection đó
8. Website tự động hiển thị (ISR revalidate hoặc webhook trigger)

**Lưu ý quan trọng**: Bước **duyệt tay ở giữa** (Excel preview) nên giữ lại — AI viết tốt ~90% nhưng giá/tên SKU/phân loại cần mắt người xác nhận trước khi lên website.

### 17.10. Lộ trình triển khai (4-5 ngày công)

**Phase 1 — Backend foundation (1-2 ngày)**
- [ ] Migration `0006_add_draft_status.sql` (thêm enum value)
- [ ] `POST /api/admin/products/bulk` với zod validation
- [ ] Trả về per-row result (inserted + errors)
- [ ] Test bằng Postman/curl với payload JSON

**Phase 2 — Script AI generator (1 ngày)**
- [ ] `scripts/ai-product-generator.ts` với ExcelJS
- [ ] Prompt template + structured output (zod schema)
- [ ] Upload ảnh lên Supabase Storage trước
- [ ] CLI: `npm run ai:generate`
- [ ] Test với 5-10 ảnh thật, check output quality

**Phase 3 — Admin UI (1-2 ngày)**
- [ ] Form upload Excel + parse client-side
- [ ] Preview table với row-level error highlight
- [ ] Dropdown collection + toggle draft/publish
- [ ] Submit gọi API + hiển thị kết quả
- [ ] Nút "Download template" trong admin

**Phase 4 — Polish (optional)**
- [ ] Auto-publish flow (bỏ qua Excel, gọi API trực tiếp)
- [ ] Watch folder (chokidar) thay vì manual CLI
- [ ] Google Drive API integration (auto-pull ảnh mới)
- [ ] Webhook revalidate sau khi bulk import xong

### 17.11. Dependencies cần cài
```bash
# AI providers (chọn 1 hoặc cài hết để fallback)
npm i @ai-sdk/google                    # Gemini - FREE tier (khuyến nghị)
npm i @ai-sdk/openai                    # OpenAI - trả phí
npm i ai                                # Core AI SDK

# Excel
npm i exceljs                           # Server-side (Node script)
npm i xlsx                              # Client-side (admin parse)

# Image processing (optional - resize trước khi upload)
npm i sharp                             # Compress + convert to webp
```

### 17.12. Env vars thêm
```bash
# AI provider (đã có sẵn trong §15.15)
GOOGLE_AI_API_KEY=
AI_PRIMARY=gemini

# Storage bucket mới
ADMIN_UPLOADS_BUCKET=admin-uploads
```

### 17.13. Cost estimate

**Gemini 2.5 Flash (free tier)**:
- 15 RPM, 1M TPM, 500 RPD
- 1 ảnh ~1-2K tokens input (image) + ~500 tokens output (JSON)
- → **~300-400 ảnh/ngày miễn phí** (giới hạn 500 RPD)
- Đủ dùng cho batch 10-20 sản phẩm/ngày

**Nếu vượt free tier** (trả phí):
- $0.075/1M input tokens, $0.30/1M output tokens
- 100 ảnh/ngày × 2K tokens = 200K input + 50K output
- → ~$0.015 input + $0.015 output = **~$0.03/ngày = $1/tháng**

**Rẻ hơn cà phê** — không phải lo về cost.

### 17.14. Edge cases & lưu ý

- **AI trả về JSON không hợp lệ**: retry 1 lần với prompt "Please return valid JSON only". Nếu vẫn fail → ghi row `[ERROR]` vào Excel để xử lý tay.
- **Slug trùng**: tự động append `-001`, `-002` nếu detect trùng.
- **Ảnh mờ/chất lượng kém**: AI có thể từ chối hoặc trả quality_tier thấp → admin review trong Excel.
- **Rate limit**: script delay 1s giữa các request để tránh hit 15 RPM của Gemini free.
- **Collection chưa tồn tại**: form admin KHÔNG cho phép tạo collection mới kèm import. Phải tạo collection trước → mới import được.
- **Bản quyền ảnh**: nếu dùng ảnh từ nguồn khác (không tự chụp) → cần document nguồn trong cột `source_image` hoặc field riêng.

### 17.15. Security & permissions
- API `/api/admin/products/bulk` yêu cầu `role: 'admin'` (middleware check như các API admin khác)
- Rate-limit: 10 requests / phút / IP (Upstash Redis)
- Validate `image_url` phải từ Supabase Storage domain (chống inject URL độc hại)
- Log mọi bulk operation với admin user_id, timestamp, số lượng insert
- Không cho phép xoá products qua bulk API (chỉ insert)

### 17.16. Files cần tạo
```
supabase/migrations/0006_add_draft_status.sql
scripts/ai-product-generator.ts
scripts/lib/ai-vision.ts               # Wrapper gọi Gemini/OpenAI
scripts/lib/excel-exporter.ts          # ExcelJS logic
scripts/lib/supabase-upload.ts         # Upload ảnh lên storage
app/api/admin/products/bulk/route.ts
components/admin/excel-uploader.tsx
components/admin/import-preview-table.tsx
components/admin/import-result-modal.tsx
components/admin/bulk-import-form.tsx
app/(admin)/dashboard/products/import/page.tsx
templates/product-import-template.xlsx  # File template download
docs/auto-product-pipeline.md           # Hướng dẫn sử dụng
```

---

## 18. LUỒNG 10 — TRANG TÀI KHOẢN KHÁCH HÀNG (`/tai-khoan`)

> **Status**: ✅ 6 tab + 4 auth page + addresses/wishlist/reviews APIs done. ❌ xac-nhan-email, ❌ account/don-hang/[code]. ❌ auto-link guest orders on signup. ❌ reviews chưa hiển thị trên PDP.

> Quyết định ngày 2026-07-15: BỔ SUNG flow tài khoản khách hàng (end-user) — vẫn giữ **guest checkout** cho khách không đăng ký, NHƯNG cho phép khách **tự nguyện đăng ký** để có: tra cứu đơn nhanh, wishlist sync, đánh giá, sổ địa chỉ, theo dõi đơn realtime. Không bắt buộc — tôn trọng UX đơn giản của flow cũ.
>
> **Không phải** thay thế §10 (admin auth) hay §7 (guest checkout). Hai flow chạy song song: khách có thể checkout không cần tài khoản (như cũ), HOẶC đăng nhập để trải nghiệm tiện hơn.

### 18.1. Mục tiêu & Use case

| Use case | Lợi ích |
|---|---|
| Tra cứu tất cả đơn của tôi (không cần nhớ từng mã) | Tăng retention, dễ theo dõi lịch sử mua |
| Wishlist đồng bộ giữa thiết bị | Hiện tại chỉ localStorage, mất khi đổi máy |
| Đánh giá sản phẩm đã mua (verified buyer) | Social proof → tăng conversion |
| Lưu sổ địa chỉ giao hàng | Checkout 1-click |
| Theo dõi trạng thái đơn real-time qua dashboard | Giảm ticket hỏi "đơn tôi đến đâu" |
| Nhận thông báo drop hàng mới / restock | Re-engagement |

### 18.2. Quyết định thiết kế

| Quyết định | Chọn | Lý do |
|---|---|---|
| Đăng ký/đăng nhập bằng | **Email + Password** + **Magic Link (OTP email)** | Magic link giảm friction, email/password cho user quay lại |
| Số trường đăng ký tối thiểu | `email` + `full_name` + `phone` | Đủ để giao hàng + tra cứu đơn |
| Liên kết khách hiện tại với user mới | Match `customer_phone` của `orders` ↔ `profiles.phone` | Auto-import đơn cũ vào tài khoản mới |
| Storage địa chỉ | Bảng `addresses` riêng (mới) | Hiện address denormalize trong `orders`, không query được |
| Storage wishlist | Supabase table `wishlist_items` (mới) + giữ localStorage làm fallback | Sync giữa thiết bị |
| Auth gate cho `/tai-khoan/*` | `requireUser()` (tương tự `requireAdmin()`) | Redirect `/dang-nhap?next=/tai-khoan` nếu chưa login |
| Bảo vệ route API mới | Middleware update: thêm `/api/account/:path*` (any logged-in user) | Mở rộng §10 |

### 18.3. Database schema bổ sung

```sql
-- ============================================
-- Migration 0009: End-user account + address book + wishlist
-- ============================================

-- 1) Bảng addresses (sổ địa chỉ)
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(40) DEFAULT 'Nhà riêng',        -- "Nhà riêng" | "Văn phòng" | custom
  recipient_name VARCHAR(120) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  address_line TEXT NOT NULL,                    -- Số nhà, đường
  province VARCHAR(80) NOT NULL,
  district VARCHAR(80) NOT NULL,
  ward VARCHAR(80),                              -- Phường/Xã (optional)
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses(user_id) WHERE is_default = true;
CREATE INDEX idx_addresses_user_all ON addresses(user_id);

-- Chỉ cho phép 1 địa chỉ default / user
CREATE UNIQUE INDEX idx_addresses_one_default ON addresses(user_id) WHERE is_default = true;

-- RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON addresses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Bảng wishlist (sync server-side)
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON wishlist_items(user_id, created_at DESC);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON wishlist_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Bảng product_reviews (P2 → đẩy lên MVP+ cho verified buyer)
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name VARCHAR(120) NOT NULL,           -- snapshot từ profile tại thời điểm review
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  content TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT false,   -- auto-true nếu user đã mua product
  is_approved BOOLEAN DEFAULT false,             -- admin moderate
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product_approved ON product_reviews(product_id, created_at DESC) WHERE is_approved = true;
CREATE INDEX idx_reviews_user ON product_reviews(user_id);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
-- Public đọc review đã duyệt
CREATE POLICY "Public read approved reviews" ON product_reviews
  FOR SELECT USING (is_approved = true);
-- User chỉ sửa review của mình trong 7 ngày
CREATE POLICY "Users edit own reviews within 7 days" ON product_reviews
  FOR UPDATE USING (
    auth.uid() = user_id
    AND created_at > NOW() - INTERVAL '7 days'
  );
-- Tạo mới: bất kỳ ai cũng tạo được (kể cả guest — dùng customer_name)
CREATE POLICY "Anyone can create review" ON product_reviews
  FOR INSERT WITH CHECK (true);

-- 4) RPC: link_guest_orders_to_user (gọi 1 lần khi user vừa đăng ký)
CREATE OR REPLACE FUNCTION link_guest_orders_to_user(p_user_id UUID, p_phone VARCHAR)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Cập nhật customer_email cho orders trùng phone mà chưa có email
  UPDATE orders
  SET customer_email = (SELECT email FROM auth.users WHERE id = p_user_id)
  WHERE customer_phone = p_phone
    AND (customer_email IS NULL OR customer_email = '');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5) RPC: check_verified_purchase (dùng cho review)
CREATE OR REPLACE FUNCTION is_verified_purchase(p_user_id UUID, p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_phone = (SELECT phone FROM profiles WHERE id = p_user_id)
      AND oi.product_id = p_product_id
      AND o.status IN ('CONFIRMED', 'SHIPPING', 'DONE')
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

-- 6) Bổ sung profiles: avatar + marketing opt-in
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### 18.4. Sitemap bổ sung

```
app/
├── dang-nhap/page.tsx                      # MỚI — Email + Magic Link
├── dang-ky/page.tsx                        # MỚI — Signup form (full_name, email, phone, password)
├── quen-mat-khau/page.tsx                  # MỚI — Reset password qua email
├── xac-nhan-email/page.tsx                 # MỚI — Thông báo verify email
└── tai-khoan/                              # MỚI — Layout + 6 trang con
    ├── layout.tsx                          # Auth gate + sidebar nav
    ├── page.tsx                            # Redirect → /tai-khoan/ho-so
    ├── ho-so/page.tsx                      # Tab 1: Hồ sơ
    ├── don-hang/page.tsx                   # Tab 2: Đơn hàng của tôi
    ├── dia-chi/page.tsx                    # Tab 3: Sổ địa chỉ
    ├── yeu-thich/page.tsx                  # Tab 4: Wishlist
    ├── danh-gia/page.tsx                   # Tab 5: Đánh giá của tôi
    └── bao-mat/page.tsx                    # Tab 6: Bảo mật
```

```
app/api/
├── auth/
│   ├── magic-link/route.ts                 # MỚI — POST gửi OTP email
│   └── reset-password/route.ts             # MỚI — POST request reset
└── account/                                # MỚI — Protected by requireUser
    ├── profile/route.ts                    # GET / PATCH
    ├── addresses/route.ts                  # GET / POST
    ├── addresses/[id]/route.ts             # PATCH / DELETE
    ├── addresses/[id]/default/route.ts     # POST — set default
    ├── wishlist/route.ts                   # GET / POST (add)
    ├── wishlist/[productId]/route.ts       # DELETE (remove)
    ├── orders/route.ts                     # GET — list orders by phone
    ├── reviews/route.ts                    # GET (own) / POST
    └── reviews/[id]/route.ts               # PATCH / DELETE
```

### 18.5. Auth flow (end-user)

```
[User click icon User ở navbar]
        │
        ├─► Chưa đăng nhập → /dang-nhap?next=/tai-khoan
        │
        └─► Đã đăng nhập → /tai-khoan/ho-so

[/dang-nhap]
┌────────────────────────────────────────┐
│  [Tab] Email + Mật khẩu | Magic Link  │
├────────────────────────────────────────┤
│  Email: [_____________]                │
│  Password: [__________]                │
│  [ĐĂNG NHẬP]                          │
│                                        │
│  Chưa có tài khoản? Đăng ký →          │
│  Quên mật khẩu? →                      │
└────────────────────────────────────────┘

        │
        ▼
[supabase.auth.signInWithPassword / signInWithOtp]
        │
        ├─► Thành công:
        │     - Auto link guest orders (RPC link_guest_orders_to_user)
        │     - Sync localStorage wishlist → DB (POST /api/account/wishlist nhiều lần)
        │     - Redirect → /tai-khoan
        │
        └─► Lỗi: Hiển thị toast "Email hoặc mật khẩu không đúng"
```

**Đăng ký**:
```
[/dang-ky]
Email: [_____________]
Họ tên: [_____________]
Số ĐT: [_____________]
Mật khẩu: [__________]   (min 8, có số + chữ)
[Xác nhận mật khẩu]
[ĐĂNG KÝ]
        │
        ▼
[supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })]
        │
        ▼
[Trigger handle_new_user() tạo profile với full_name + phone]
        │
        ▼
[/xac-nhan-email] "Vui lòng kiểm tra email để xác nhận tài khoản"
[Đồng thời signIn tự động nếu auto-confirm ON trong Supabase]
```

### 18.6. Tabs trang tài khoản (tổng hợp)

| # | Tab | Route | Mục đích | Data source |
|---|---|---|---|---|
| 1 | **Hồ sơ** | `/tai-khoan/ho-so` | Xem/sửa thông tin cá nhân | `profiles` + `auth.users` |
| 2 | **Đơn hàng của tôi** | `/tai-khoan/don-hang` | List + filter + chi tiết | `orders` WHERE `customer_phone` = user's phone |
| 3 | **Sổ địa chỉ** | `/tai-khoan/dia-chi` | CRUD địa chỉ giao hàng | `addresses` |
| 4 | **Yêu thích** | `/tai-khoan/yeu-thich` | Sản phẩm đã thả tim | `wishlist_items` JOIN `products` |
| 5 | **Đánh giá của tôi** | `/tai-khoan/danh-gia` | Reviews đã viết + form viết mới | `product_reviews` |
| 6 | **Bảo mật** | `/tai-khoan/bao-mat` | Đổi MK, sessions, xóa TK | `auth.users` |

### 18.7. Layout UI

```
┌──────────────────────────────────────────────────────────────┐
│  AnnouncementBar (đã có)                                     │
│  Navbar (đã có) — icon User sáng gold nếu đang ở /tai-khoan  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┬────────────────────────────────────────────┐  │
│  │ SIDEBAR  │  HEADER TAB + CONTENT                       │  │
│  │ (240px)  │                                             │  │
│  │          │  ┌──────────────────────────────────────┐  │  │
│  │  [Avatar] │  │  "Hồ sơ của tôi"                     │  │  │
│  │  Tên     │  │                                      │  │  │
│  │  SĐT     │  │  [Form fields]                       │  │  │
│  │          │  │                                      │  │  │
│  │ ─────    │  │  [Lưu thay đổi]                      │  │  │
│  │ • Hồ sơ  │  └──────────────────────────────────────┘  │  │
│  │ • Đơn    │                                             │  │
│  │ • Địa chỉ                                              │  │
│  │ • Yêu   │                                             │  │
│  │   thích │                                             │  │
│  │ • Đánh   │                                             │  │
│  │   giá    │                                             │  │
│  │ • Bảo    │                                             │  │
│  │   mật    │                                             │  │
│  │          │                                             │  │
│  │ [Đăng   │                                             │  │
│  │  xuất]  │                                             │  │
│  └──────────┴─────────────────────────────────────────────┘  │
│                                                              │
│  Footer                                                      │
└──────────────────────────────────────────────────────────────┘
```

**Mobile** (<768px): sidebar collapse thành **horizontal scroll chips** phía trên content.

### 18.8. Style tokens & components

| Token | Value | Dùng cho |
|---|---|---|
| `bg-background` | `#0D1117` | Page background |
| `bg-surface` | `#161B22` | Card, sidebar |
| `bg-surface-emerald` | `#12241C` | Sidebar highlight |
| `border-gold/20` | gold 20% | Card border |
| `text-gold` | `#F2CA50` | Active tab, link |
| `text-gold-champagne` | `#F1E5AC` | Highlight price |
| `text-text-base` | `#EAE1D4` | Body text |
| `text-text-muted` | `#D0C5AF` | Label, hint |
| `font-heading` (Cinzel) | — | Section title (latin only) |
| `font-sans` (Inter) | — | Form labels (tiếng Việt) |

**Sidebar item active**: `bg-surface-emerald` + `border-l-2 border-gold` + `text-gold` + `font-heading text-xs uppercase tracking-wider`.

**Status badge (đơn hàng)**:
- `NEW`: `text-blue-400` / `bg-blue-400/10`
- `CONFIRMED`: `text-gold` / `bg-gold/10`
- `SHIPPING`: `text-amber-400` / `bg-amber-400/10`
- `DONE`: `text-success` / `bg-success/10`
- `CANCELLED`: `text-error` / `bg-error/10`

### 18.9. Files cần tạo

```
supabase/migrations/0009_user_account.sql           # addresses, wishlist, reviews, RPC
app/(store)/dang-nhap/page.tsx
app/(store)/dang-ky/page.tsx
app/(store)/quen-mat-khau/page.tsx
app/(store)/xac-nhan-email/page.tsx
app/(store)/tai-khoan/layout.tsx
app/(store)/tai-khoan/page.tsx                     # redirect
app/(store)/tai-khoan/ho-so/page.tsx
app/(store)/tai-khoan/don-hang/page.tsx
app/(store)/tai-khoan/don-hang/[code]/page.tsx
app/(store)/tai-khoan/dia-chi/page.tsx
app/(store)/tai-khoan/yeu-thich/page.tsx
app/(store)/tai-khoan/danh-gia/page.tsx
app/(store)/tai-khoan/bao-mat/page.tsx
app/api/auth/magic-link/route.ts
app/api/auth/reset-password/route.ts
app/api/account/profile/route.ts
app/api/account/addresses/route.ts
app/api/account/addresses/[id]/route.ts
app/api/account/addresses/[id]/default/route.ts
app/api/account/wishlist/route.ts
app/api/account/wishlist/[productId]/route.ts
app/api/account/orders/route.ts
app/api/account/reviews/route.ts
app/api/account/reviews/[id]/route.ts
components/account/account-sidebar.tsx
components/account/account-mobile-tabs.tsx
components/account/profile-form.tsx
components/account/order-list.tsx
components/account/order-list-filters.tsx
components/account/address-card.tsx
components/account/address-form.tsx
components/account/wishlist-grid.tsx
components/account/review-list.tsx
components/account/review-form.tsx
components/account/security-panel.tsx
hooks/use-account-sync.ts                          # localStorage wishlist ↔ DB
lib/auth/require-user.ts                           # tương tự require-admin nhưng customer
lib/validations/account.ts                         # Zod schemas
docs/account-page-spec.md                          # Spec cho Google Stitch
```

### 18.10. Middleware update (mở rộng §10)

```ts
// middleware.ts — thêm matcher
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/tai-khoan/:path*',          // MỚI — yêu cầu đăng nhập
    '/api/account/:path*',        // MỚI — yêu cầu đăng nhập
  ],
};
```

Logic: với matcher mới, **chỉ cần user tồn tại** (không check role). Redirect `/dang-nhap?next=<path>` nếu chưa login. API trả 401 JSON như §10.

### 18.11. Edge cases

| Case | Xử lý |
|---|---|
| User đăng ký bằng email đã có trong `orders.customer_email` | Auto-update `customer_email` các order cũ (nếu NULL) bằng RPC |
| User đăng ký bằng SĐT đã có đơn cũ | Auto-fill profile.phone, RPC `link_guest_orders_to_user` chạy 1 lần |
| User có wishlist localStorage khi đăng nhập lần đầu | Hook `useAccountSync` POST từng item lên `/api/account/wishlist` (dedupe bằng UNIQUE constraint) |
| User xóa tài khoản | RPC `delete_user_account` xóa profile + addresses + wishlist + signOut. Reviews giữ nhưng set `user_id = NULL` (giữ social proof) |
| User A muốn review sản phẩm chưa mua | Vẫn cho review nhưng `is_verified_purchase = false`. Hiển thị badge "Chưa xác minh" |
| 2 user trùng SĐT (vd mua chung) | Orders link theo phone → cả 2 user sẽ thấy đơn. Cảnh báo trong UI |
| Spam review | Rate-limit 5 reviews / ngày / user. Admin moderate `is_approved = false` |

### 18.12. Security & RLS

| Bảng | Policy |
|---|---|
| `addresses` | User chỉ CRUD row của mình (`auth.uid() = user_id`) |
| `wishlist_items` | User chỉ CRUD row của mình |
| `product_reviews` | Public đọc `is_approved = true`; user update row của mình trong 7 ngày; insert mở (kể cả guest) |
| `profiles` | User đọc/update row của mình (đã có từ migration 0003) |

**Rate limit API `/api/account/*`**: 30 req / phút / user (Upstash Redis).
**Rate limit review POST**: 5 / ngày / user.
**API `/api/account/orders`**: chỉ trả orders có `customer_phone` khớp với `profiles.phone` của user hiện tại.

### 18.13. Tương tác với flow hiện tại

- **Checkout (`/thanh-toan`)**: Nếu user đã đăng nhập, **pre-fill** form từ `profiles` + `addresses` (chọn dropdown). Vẫn cho phép sửa từng đơn (không ghi đè profile).
- **Wishlist button (header)**: Khi đã login → gọi API DB. Khi chưa login → gọi localStorage + hiển thị toast nhẹ "Đăng nhập để đồng bộ yêu thích".
- **Navbar icon User**: Click → `/tai-khoan` nếu đã login, `/dang-nhap` nếu chưa. Hiển thị avatar nhỏ nếu có.
- **Tra cứu đơn (`/don-hang/[code]`)**: Vẫn hoạt động bình thường cho guest. Nếu đã login + có đơn này → tự động skip form nhập SĐT.

### 18.14. Migration path (không breaking)

1. Tạo `0009_user_account.sql` (idempotent, thêm bảng mới + ALTER profiles).
2. Triển khai `/dang-nhap`, `/dang-ky` song song — guest checkout **không đổi**.
3. Triển khai `/tai-khoan/*` — opt-in, không ai bị ép.
4. Sau 1 tháng: A/B test xem user đăng ký nhiều không → quyết định có đẩy login lên navbar chính không.

### 18.15. GA4 events mới

| Event | Trigger | Params |
|---|---|---|
| `account_register` | `signUp` thành công | `method: 'email'` |
| `account_login` | `signIn` thành công | `method: 'password' \| 'magic_link'` |
| `account_logout` | Click "Đăng xuất" | — |
| `profile_updated` | PATCH `/api/account/profile` 200 | `fields_changed: string[]` |
| `address_added` | POST `/api/account/addresses` 201 | — |
| `address_set_default` | POST `.../default` | `address_id` |
| `wishlist_synced` | Hook `useAccountSync` xong | `items_synced: number` |
| `review_submitted` | POST `/api/account/reviews` 201 | `product_id, rating, is_verified_purchase` |

---

### 18.16. Liên kết

- Xem chi tiết UI từng tab + design tokens + form schemas cho **Google Stitch** tại `docs/account-page-spec.md`.
- Auth pattern tham chiếu `docs/auth.md` + `flows.md §10`.
- Tailwind tokens dùng lại `tailwind.config.ts` (đã có `gold`, `surface`, `text-*`, `font-heading`, `font-sans`).

```

---

## 19. STATUS — JOB PENDING

> Section này được sinh từ audit codebase ngày 2026-07-16. Mỗi mục có: ID (anchor trong spec), tiêu đề, file/route cần tạo/sửa, mô tả ngắn, và effort ước lượng.
> Cập nhật: tick ✅ khi xong, đổi status ở §0 cho khớp.

### 19.1. Executive summary

| Trạng thái | Số lượng | % |
|---|---|---|
| ✅ DONE | ~58 | 39% |
| 🟡 PARTIAL | ~32 | 21% |
| ❌ NOT STARTED | ~60 | 40% |

**Customer-facing**: gần như hoàn chỉnh (16 page, 5 API, 5 RPC, RLS, full MoMo create+IPN, lock flow, 6 tab account).
**Admin**: shell + auth + sidebar/header + 4 page real-data (products list/new/edit/bulk-upload, session này); 7 page còn mock (orders/collections/dashboard/inventory/payments/settings/newsletter).
**Gap lớn nhất**: AI Chatbot §15 (0%), GA4 events (0% fired), MoMo env (0% populated), rate-limit (0%), Sentry (0%), pg_cron (chỉ có comment, chưa có SQL).

### 19.2. Critical (chặn production)

| # | § | Job | File/route | Effort | Mô tả |
|---|---|---|---|---|---|
| C1 | §15 | **AI Chatbot — full stack** | `app/api/chat/route.ts`, `lib/chatbot/*`, `components/chatbot/*`, migrations `0004_chatbot_schema.sql` + `0005_embed_trigger.sql`, `scripts/embed-all-products.ts` | 2–3 ngày | pgvector + chat_sessions + chat_messages + match_products RPC + embed trigger + Vercel AI SDK + 7 component + use-chat-session. Feature signature. |
| C2 | §9 | **GA4 analytics — fire real events** ✅ DONE | `lib/analytics/events.ts`, `hooks/use-jewelry-analytics.ts`, mount `<GoogleAnalytics/>` trong `app/(store)/layout.tsx` | 2–3h | Hook typed + consent-gated (chỉ fire khi `localStorage[ev_cookie_consent]==='granted'`) + 8 event builders pure function. Wired: view_item (PDP), lock_item_success (HoldButton), lock_item_timeout (gio-hang), begin_checkout + add_payment_info (CheckoutClient), purchase (don-hang/[code] PAID + useRef once-flag), view_collection (CollectionViewTracker). MoMo return không cần wire riêng — redirect về `/don-hang/[code]` đã trigger purchase. Cần set `NEXT_PUBLIC_GA_ID` thật trong `.env` để bắt đầu tracking. |
| C3 | §7 / §14 | **Populate MoMo env + sandbox test** | `.env` / `.env.local` | 1h | 5 env var: MOMO_PARTNER_CODE/ACCESS_KEY/SECRET_KEY/REDIRECT_URL/IPN_URL. Test create + IPN end-to-end trên sandbox. |
| C4 | §6 / §2 | **pg_cron `release_expired_locks`** ✅ DONE | new `supabase/migrations/0010_pg_cron_jobs.sql` | 30m | `SELECT cron.schedule('release-expired-locks', '* * * * *', $$ ... $$)`. Migration đã có: extension + 2 RPC (`release_expired_locks`, `cancel_pending_momo_orders`) + 2 cron jobs + partial index `idx_orders_pending_momo_cron`. Cần enable pg_cron extension trên Supabase Dashboard trước khi apply (xem comment trong file SQL). |
| C5 | §13 | **Rate-limit `/api/lock-item`, `/api/orders`, `/api/momo/*`, `/api/chat`** | new `lib/middleware/rate-limit.ts` (Upstash Redis) | 2h | 10 req/min/IP. Lock flow đang wide open, dễ abuse. |
| C6 | §3.2 | **Admin Orders page real data** | `app/(admin)/dashboard/orders/page.tsx` + `app/api/admin/orders/route.ts` + `app/(admin)/dashboard/orders/[id]/page.tsx` | 3h | Page hiện tại hardcode 10 đơn mock. Cần query `orders` join `order_items`, filter status/date/payment, status update action, CSV export, detail page. |

### 19.3. Important (admin operate được)

| # | § | Job | File/route | Effort | Mô tả |
|---|---|---|---|---|---|
| I1 | §3.3 | **`/api/admin/collections` POST/PATCH/DELETE** | extend `app/api/admin/collections/route.ts` + new `app/api/admin/collections/[id]/route.ts` | 1.5h | Hiện GET-only. |
| I2 | §3.2 | **Admin Collections page real data** | `app/(admin)/dashboard/collections/page.tsx` | 2h | Wire to `api/admin/collections`. |
| I3 | §3.2 | **Admin Collection edit** | `app/(admin)/dashboard/collections/[id]/page.tsx` | 2h | Form: name, slug, cover, hero_gallery, story_text, launch_at, meta_*, display_order, is_published. |
| I4 | §3.2 | **Admin Dashboard real data** | `app/(admin)/dashboard/page.tsx` + `app/api/admin/stats/route.ts` | 2h | 4 StatCard + RevenueChart + SalesByTier + RecentOrdersTable + LowStockAlerts — tất cả đang hardcode. |
| I5 | §3.2 | **Admin Inventory page real data** | `app/(admin)/dashboard/inventory/page.tsx` + query | 1.5h | Real products + active lock count. |
| I6 | §3.2 | **Admin Payments page real data** | `app/(admin)/dashboard/payments/page.tsx` + `app/api/admin/payments/route.ts` | 1.5h | Real `payment_transactions` + retry IPN button. |
| I7 | §3.2 | **Admin Settings persistence** | `app/(admin)/dashboard/settings/page.tsx` + `app/api/admin/settings/route.ts` + new `site_settings` table | 2h | KV-style: shipping_fee, contact info, social URLs. Form hiện không save. |
| I8 | §16.4 | **`newsletter_subscribers` table + public subscribe API + admin page wire** | migration + `app/api/newsletter/subscribe/route.ts` + wire `app/(admin)/dashboard/newsletter/page.tsx` | 1.5h | Capture email pre-launch. |
| I9 | §18.3 | **Auto-link guest orders on signup** ✅ DONE | `app/api/auth/*` signup handler + migration 0011 | 30m | Sau `signUp`, gọi `link_my_guest_orders()` (RPC match theo email). Migration 0011 mở rộng `link_guest_orders_to_user` set `customer_id` thay vì chỉ update email. Backfill tự động cho orders cũ khi apply migration. |
| I10 | §18.4 | **`/tai-khoan/xac-nhan-email` page** | `app/(store)/tai-khoan/xac-nhan-email/page.tsx` | 30m | Post-signup confirmation. |
| I11 | §18.4 | **`/tai-khoan/don-hang/[code]`** | `app/(store)/tai-khoan/don-hang/[code]/page.tsx` | 2h | Account-side order detail (per spec §18.6). |
| I12 | §13 | **Env validation (zod) at startup** | `lib/env.ts` + import trong `app/layout.tsx` | 1h | Validate toàn bộ env, crash early nếu misconfig. |
| I13 | §11/§17 | **`DRAFT` enum value + draft→publish flow** | new migration + bulk-upload toggle + products list "Publish All Drafts" | 2h | Required cho draft workflow §17.6. |
| I14 | §18.6 | **Display approved reviews on PDPs** | `components/product/product-reviews.tsx` + `app/api/products/[slug]/reviews/route.ts` | 2h | Table + API có sẵn (0009), chỉ thiếu UI. |

### 19.4. Nice-to-have (UX polish)

| # | § | Job | File/route | Effort |
|---|---|---|---|---|
| N1 | §4 | **UI primitives còn thiếu** | `components/ui/{input,dialog,skeleton,count-down,shine-image}.tsx` | 2–3h |
| N2 | §4 | **Cart components split out** | `components/cart/{cart-item,cart-summary,empty-cart}.tsx` | 1.5h |
| N3 | §4 | **Collection components** | `components/collection/{collection-card,collection-hero,collection-filter}.tsx` | 1.5h |
| N4 | §16.2 | **product-count + product-breadcrumb** | `components/product/{product-count,product-breadcrumb}.tsx` | 1h |
| N5 | §16.2 | **zoom-image hover effect** | `components/product/zoom-image.tsx` | 1h |
| N6 | §16.2 | **latest-drops section** | `components/home/latest-drops.tsx` | 1h |
| N7 | §16.2 | **newsletter-popup (modal 30s)** | `components/home/newsletter-popup.tsx` | 1h |
| N8 | §16.2 | **newsletter-form (footer)** | `components/ui/newsletter-form.tsx` | 30m |
| N9 | §16.2 | **comparison-table (P2)** | `components/ui/comparison-table.tsx` | 3h |
| N10 | §16.2 | **care-guide + authentication-guide** | `components/care/{care-guide,authentication-guide}.tsx` | 2h |
| N11 | §16.2 | **mobile-menu (slide-out)** | `components/layout/mobile-menu.tsx` | 1.5h |
| N12 | §6 | **`use-gsap-sparkle` hook** | `hooks/use-gsap-sparkle.ts` | 1h |
| N13 | §7 | **Cron: cancel PENDING orders > 30 min** ✅ DONE | gộp trong `supabase/migrations/0010_pg_cron_jobs.sql` | 1h | RPC `cancel_pending_momo_orders()` + cron `cancel-pending-momo-orders` mỗi phút. Đồng thời giải phóng `inventory_locks` ACTIVE trỏ về product của order bị hủy (match qua `order_items` vì `lock_item` RPC hiện chưa set `order_id`). |
| N14 | §9 / §18 | **GA4 account events** | `lib/analytics/events.ts` extensions | 1h |
| N15 | §18.7 | **account-mobile-tabs** | `components/account/account-mobile-tabs.tsx` | 30m |
| N16 | §3.3 | **account order list filter UI** | `components/account/order-list-filters.tsx` | 1h |
| N17 | §12 | **Hero image preload** | `app/(store)/layout.tsx` | 30m |
| N18 | §13 | **Structured logging với redaction** | `lib/log.ts` | 2h |
| N19 | §13 | **Cleanup 39 pre-existing TypeScript errors** | `docs/ts-errors-cleanup.md` (đã liệt kê) | 2-3h | Phát hiện 2026-07-16 sau khi `tsc --noEmit` toàn project. 6 nhóm: Supabase generic narrowing (14 errors), Lucide IconComp (7), mobile-bottom-nav prop (1), account-sidebar getInitials (2), Postgrest update/insert never (8), queries row type (7). `next build` vẫn pass vì file lỗi nằm ngoài route graph hiện tại. |

### 19.5. Infrastructure

| # | § | Job | Effort |
|---|---|---|---|
| F1 | §13 | **Sentry** — install `@sentry/nextjs`, `sentry.{client,server}.config.ts`, env `SENTRY_DSN` | 2h |
| F2 | §13 | **Upstash Redis** — install `@upstash/ratelimit` + `@upstash/redis` | 30m |
| F3 | §13 | **PITR** — enable trong Supabase Dashboard (Pro plan) | 5m |
| F4 | §14 | **Production env switch** — MoMo test → production endpoint | 30m |
| F5 | §13 | **Admin write RLS** — explicit policies cho `products`/`collections` | 1h |
| F6 | §15 | **Chatbot infra: pgvector + tables** — gộp với C1 | (xem C1) |
| F7 | §15 | **match_products RPC + embed trigger** — gộp với C1 | (xem C1) |
| F8 | §17 | **Admin bulk-import form factor split** — refactor page hiện tại thành 4 component | 2h |
| F9 | §17 | **Excel template download** — `templates/product-import-template.xlsx` + download endpoint | 1h |
| F10 | §17 | **AI Vision generator script** — `scripts/ai-product-generator.ts` + `scripts/lib/{ai-vision,excel-exporter,supabase-upload}.ts` | 1 ngày |

### 19.6. Quick-win đề xuất (xếp theo impact)

| # | Job | Impact | Effort | Status |
|---|---|---|---|---|
| 1 | Populate `MOMO_*` env + sandbox test | Unblocks payment | 1h | ❌ Phase 2 |
| 2 | Mount `<GoogleAnalytics/>` + set `NEXT_PUBLIC_GA_ID` | Bắt đầu tracking data | 30m | ✅ DONE |
| 3 | `useJewelryAnalytics` hook + call ở PDP/hold/return | Funnel visibility | 1–2h | ✅ DONE |
| 4 | Migration `00XX_pg_cron_release_locks.sql` | Lock tự expire | 30m | ✅ DONE |
| 5 | Wire admin Orders page real data | Admin operate được | 2h | ✅ DONE |
| 6 | Wire admin Order detail `[id]` | Hoàn thiện admin loop | 1–2h | ✅ DONE |
| 7 | Add `POST/PATCH/DELETE /api/admin/collections` + wire page | Quản lý collection | 2h | ✅ DONE |
| 8 | `newsletter_subscribers` table + public subscribe API + footer form | Capture email pre-launch | 1h | ✅ DONE |
| 9 | `/xac-nhan-email` page + auto-link guest orders on signup | Account flow polish | 30m | 🟡 PARTIAL (auto-link done, /xac-nhan-email page pending) |
| 10 | 5 UI primitives còn thiếu | Unblock nhiều job khác | 2–3h | 🟡 PARTIAL |
| 11 | **🆕 Fix login kẹt loading + Admin block mua hàng** | UX critical | 1h | ✅ DONE 2026-07-17 |
| 12 | **🆕 Apply migration 0011 (customer_id backfill theo email)** | `/tai-khoan/don-hang` thấy đơn | 5m | ❌ PENDING (file sẵn, cần apply) |

**Top 3 ưu tiên cao nhất** cho launch: #1 (payment), #2+#3 (analytics), #4 (lock expiry). Xong 3 cái này → launch v1.

### 19.7. Discrepancies vs spec (cần chốt)

1. `/api/admin/bulk-import` → đã build thành `/api/admin/products/bulk` (REST đẹp hơn). Cần update spec để khớp.
2. `/api/orders/[code]/lookup` (POST) → gộp vào `/api/orders/[code]?phone=` (GET). `don-hang/[code]/page.tsx` đang dùng GET.
3. `lib/auth/require-user.ts` → đã build thành `lib/auth/require-customer.ts`. Có thể đổi tên hoặc update spec.
4. `DRAFT` enum value (spec §17.6) chưa migrate. Cần migration `ALTER TYPE product_status_enum ADD VALUE 'DRAFT'`.
5. Một số component bị rename/inline: `product-meta` → `product-info-panel`, `product-accordion` → `details-accordion`, `components/chatbot/*` → `components/home/chatbot/ChatbotBubble` (1 stub file, không tách 7 file).
6. Env trong `.env` thiếu: `NEXT_PUBLIC_GA_ID`, `MOMO_*` (5), `GOOGLE_AI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `AI_PRIMARY`, `EMBED_PRIMARY`, `UPSTASH_REDIS_*`, `SENTRY_DSN`, `ADMIN_UPLOADS_BUCKET`, `NEXT_PUBLIC_SITE_URL`.
7. **🆕 Sprint "Login + Admin Block" 2026-07-17**:
   - `orders.customer_id` UUID REFERENCES auth.users(id) — thêm vào §2.4 (chưa apply DB migration, cần `ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` + 2 index `idx_orders_email`, `idx_orders_customer`).
   - `link_guest_orders_to_user` đổi signature: bỏ tham số `p_phone`, match theo `customer_email = auth.users.email` thay vì phone (an toàn hơn).
   - `getCurrentUser()` helper mới trong `lib/auth/require-customer.ts` (khác với `requireCustomer()` chỉ chấp nhận role='customer').
   - `/thanh-toan` page có fallback `<AdminCheckoutBlocked />` (không redirect /403).

### 19.8. Quy tắc cập nhật

- Mỗi lần xong một job, **tick ✅ vào cột "Trạng thái" ở §0 + §19.x** tương ứng.
- Cộng số DONE, trừ số NOT STARTED ở §0 cho khớp.
- Thêm job mới (ngoài spec) vào §19.3 hoặc §19.4 tuỳ priority.
- Nếu 1 job được split thành nhiều, thêm từng sub-item.
- Format: giữ đúng bảng markdown + emoji ✅🟡❌❌. Không sửa text trong các section §1–§18 (chỉ §0 + §19 là metadata).
