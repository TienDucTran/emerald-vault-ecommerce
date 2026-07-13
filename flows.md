# LUỒNG XỬ LÝ CHUẨN — HỆ THỐNG TRANG SỨC SI NHẬT

> File tham chiếu duy nhất cho mọi implementation. Tổng hợp kiến trúc, schema, API, UI structure, payment (MoMo), SEO, analytics & vận hành. Mọi thay đổi flow phải update file này trước khi code.

---

## 1. KIẾN TRÚC TỔNG THỂ

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
```

---

## 2. DATABASE SCHEMA (chuẩn hóa)

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
CREATE TYPE order_status_enum AS ENUM ('NEW', 'CONFIRMED', 'SHIPPING', 'DONE', 'CANCELLED');
CREATE TYPE payment_method_enum AS ENUM ('MOMO', 'COD', 'BANK_TRANSFER');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,             -- 'EV-20260713-0001'
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

---

## 3. SƠ ĐỒ TRANG (SITEMAP / PAGES)

### 3.1. Customer-facing routes (App Router)
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
├── thu-tuc-dat-hang/page.tsx    # CHECKOUT (form tên, SĐT, địa chỉ, chọn MoMo)
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
```
app/
└── (admin)/
    └── dashboard/
        ├── layout.tsx            # Sidebar + auth gate
        ├── page.tsx              # TỔNG QUAN (revenue, count, alerts)
        ├── products/
        │   ├── page.tsx          # LIST (filter, search, edit, archive)
        │   ├── new/page.tsx      # TẠO MỚI (single form)
        │   └── bulk-upload/page.tsx  # BULK UPLOAD (xlsx/csv + table)
        ├── collections/
        │   ├── page.tsx          # LIST + CRUD
        │   └── [id]/page.tsx     # EDIT
        ├── orders/
        │   ├── page.tsx          # LIST (filter, status update, export CSV)
        │   └── [id]/page.tsx     # CHI TIẾT + cập nhật trạng thái
        ├── analytics/page.tsx    # Embed GA4 Looker Studio
        └── settings/page.tsx     # Site config, shipping fee, v.v.
```

### 3.3. API routes
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
    └── collections/route.ts      # POST/PATCH/DELETE — admin only
```

---

## 4. CẤU TRÚC COMPONENT (Atomic Design)

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
              → redirect /thu-tuc-dat-hang
```

**Edge case xử lý**:
- User đóng browser → `pg_cron` set `EXPIRED` sau 10' → sản phẩm AVAILABLE
- User refresh → localStorage + cookie khôi phục cart
- 2 user click cùng lúc → RPC `SELECT FOR UPDATE` đảm bảo chỉ 1 thắng

---

## 7. LUỒNG 3 — CHECKOUT + THANH TOÁN MOMO

### 7.1. Checkout form
```
[User ở /gio-hang → click "Đặt hàng"]
        │
        ▼
[/thu-tuc-dat-hang/page.tsx — Client Component]
   <CustomerForm/> (tên, SĐT, email, tỉnh/quận, địa chỉ, ghi chú)
   <PaymentMethodSelector/> (radio: MoMo / COD)
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

---

## 8. LUỒNG 4 — TRA CỨU ĐƠN HÀNG (GUEST)

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

| Event | Trigger | Params quan trọng |
|---|---|---|
| `view_item` | Mount ProductDetail | `id, name, price, category, material, quality_tier, currency` |
| `add_to_cart` | User click "Giữ hàng" (legacy) | `id, name, price, quantity: 1` |
| `lock_item_success` | Lock API 200 | `productId, price` (custom event) |
| `lock_item_timeout` | Countdown = 0 | `productId, lockDuration` (custom event) |
| `begin_checkout` | User vào /thu-tuc-dat-hang | `value, items[]` |
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

## 10. LUỒNG 6 — AUTH & PHÂN QUYỀN

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

---

## 11. LUỒNG 7 — ADMIN BULK UPLOAD

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

- **Metadata**: mỗi page có `generateMetadata` với title/desc/OG image.
- **JSON-LD**: `Product` (chi tiết), `BreadcrumbList` (collection), `Organization` (footer).
- **Sitemap** (`app/sitemap.ts`): list products + collections, revalidate mỗi giờ.
- **Robots** (`app/robots.ts`): allow all, disallow `/dashboard/`, `/api/`.
- **Image**: Next/Image + `images.remotePatterns` cho Supabase + `formats: ['image/avif','image/webp']`.
- **Core Web Vitals target**: LCP < 2.5s, CLS < 0.1, INP < 200ms.
- **Preload**: hero image, font (Cormorant Garamond + Inter subset).

---

## 13. BẢO MẬT & VẬN HÀNH

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

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY=

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
```
