# TODO — CẦN CHỈNH SỬA & BỔ SUNG

> Cập nhật lần cuối: 2026-07-13 — đã chốt **Payment = MoMo** (theo docs official). Cậu trúc UI/component đã tham chiếu trong `flows.md` §3-4.

---

## ✅ ĐÃ CHỐT

- [x] **Payment gateway**: **MoMo captureWallet** (xem `flows.md` §7) + hỗ trợ **COD** làm fallback.
- [x] **End-user auth**: **Guest checkout** (nhập SĐT mỗi lần), tra cứu đơn qua `code + phone`. Chỉ admin cần đăng nhập.
- [x] **Sitemap & component architecture**: đã chuẩn hóa trong `flows.md` §3-4.
- [x] **Database schema** (8 bảng + 3 RPC + 2 cron): đã chuẩn hóa trong `flows.md` §2.
- [x] **MoMo signature** + **IPN** + **idempotency**: đã document chi tiết trong `flows.md` §7.3-7.5.
- [x] **AI Chatbot tư vấn sản phẩm**: Vercel AI SDK 7 + OpenAI GPT-4o-mini + Supabase pgvector — chi tiết trong `flows.md` §15.
- [x] **Figma MCP**: file `kilo.json` dùng env var `${FIGMA_TOKEN}`, `.env.local` template đã có, `.gitignore` đã bảo vệ secret. User paste token vào `.env.local` rồi restart Kilo.
- [x] **Figma setup checklist**: file `figma-setup-checklist.md` hướng dẫn 6 bước tạo file mẫu (3 phút), `figma-design-tokens.json` chứa design tokens EV + observations từ 2 site.
- [x] **Google Stitch (stitch.withgoogle.com)**: tool AI generate UI từ prompt. Vai trò: tạo nhanh mockup dark theme để paste vào Figma làm inspiration. Không dùng để generate code sản xuất (vì output generic).
- [x] **Storage upload pipeline**: client-side resize → webp + Supabase Storage bucket + admin upload API. Chi tiết xem flows.md §2.2 + mục X. bên dưới.
- [x] **Media Library Phase 1 (read-only)**: list + search + sort + detail drawer. Phase 2/3/4 đang pending. Xem mục X. bên dưới.
- [x] **GA4 analytics — fire real events**: `lib/analytics/events.ts` (8 pure event builders) + `hooks/use-jewelry-analytics.ts` (typed hook, consent-gated qua `localStorage[ev_cookie_consent]`) + `<GoogleAnalytics/>` mount trong `app/(store)/layout.tsx` (chỉ store route group, admin tự loại trừ). Đã wire 6/8 event: view_item, lock_item_success, lock_item_timeout, begin_checkout, add_payment_info, purchase, view_collection. Cần set `NEXT_PUBLIC_GA_ID` thật trong `.env` để bắt đầu nhận data.
- [x] **pg_cron**: migration `supabase/migrations/0010_pg_cron_jobs.sql` (extension + 2 RPC + 2 cron schedule). Cần enable pg_cron trên Supabase Dashboard trước khi apply.
- [ ] **Cleanup 39 pre-existing TypeScript errors** — chi tiết 6 nhóm root cause + file + effort ở `docs/ts-errors-cleanup.md` (Effort 2-3h, không block `next build`). Đã fix 3 errors (cart.ts:97, media-picker.tsx:348, server.ts:17,19) trong session 2026-07-16; 39 còn lại là pre-existing.

---

## 🔴 P0 — BẮT BUỘC (block code nếu chưa xong)

### A. Database & Migration
- [ ] Tạo file `supabase/migrations/0001_initial_schema.sql` (chứa toàn bộ schema §2)
- [ ] Tạo file `supabase/migrations/0002_rpc_functions.sql` (lock_item, confirm_payment, release_expired_locks) — ĐÃ GỘP: `lock_item` + `confirm_payment` ở `0001_initial_schema.sql`; `release_expired_locks` ở `0010_pg_cron_jobs.sql`.
- [ ] Tạo file `supabase/migrations/0003_rls_policies.sql` (RLS cho từng bảng)
- [ ] Tạo file `supabase/seed.sql` (3-5 sản phẩm demo + 1 collection)
- [x] Bật extension `pg_cron` trên Supabase dashboard — MIGRATION READY: `supabase/migrations/0010_pg_cron_jobs.sql` chứa `CREATE EXTENSION pg_cron` + 2 RPC + 2 cron schedule. Cần enable extension trên Dashboard trước khi apply (xem comment trong file). Sau khi apply: `SELECT * FROM cron.job;` để verify.
- [ ] Tạo storage bucket `jewelry-images` (public, max 5MB, .webp)
- [ ] Trigger `handle_new_user()` cho profile auto-create
- [ ] Migration `0006_newsletter.sql` — bảng newsletter_subscribers
- [ ] Migration `0007_collections_enrich.sql` — thêm launch_at, story_text, hero_gallery, meta_title, meta_description
- [ ] Migration `0008_reviews.sql` — bảng product_reviews (P2)

### B. Auth & Middleware
- [ ] Tạo `lib/supabase/{client,server,admin}.ts` với `@supabase/ssr`
- [ ] `middleware.ts` block `/dashboard/*` và `/api/admin/*` nếu không phải admin
- [ ] Trang `/admin/login` (form đăng nhập Supabase Auth)
- [ ] Trang `/403` (retro style)
- [ ] Bootstrap admin đầu tiên: insert profile với `role='admin'`

### C. MoMo Payment
- [ ] `lib/momo/signature.ts` — buildRequestSignature + verifyIpnSignature (HMAC-SHA256)
- [ ] `lib/momo/client.ts` — createPayment() gọi `https://test-payment.momo.vn/v2/gateway/api/create`
- [ ] `lib/momo/types.ts` — TypeScript types cho MoMo request/response/IPN
- [ ] `app/api/momo/create/route.ts` — tạo payment URL, idempotent theo `momo_request_id`
- [ ] `app/api/momo/ipn/route.ts` — verify signature, update DB, return 204
- [ ] `/momo/return/page.tsx` — polling `/api/orders/[code]/status` rồi redirect
- [ ] Test với MoMo sandbox (TÀI KHOẢN TEST ở `developers.momo.vn/v3/vi/docs/payment/onboarding/test-instructions/`)
- [ ] Production switch: đổi base URL từ `test-payment` → `payment.momo.vn` (sau khi MoMo duyệt live)

### D. Cấu hình kỹ thuật
- [ ] `next.config.js` thêm `images.remotePatterns` cho Supabase + `formats: ['avif','webp']`
- [ ] `.env.local` với đầy đủ 12 biến (xem `flows.md` §14)
- [ ] `lib/env.ts` validate env lúc startup (zod)
- [ ] Cài deps: `@supabase/ssr @supabase/supabase-js zustand zod react-hook-form gsap @next/third-parties`

---

## 🟡 P1 — QUAN TRỌNG (sprint đầu)

### E. UI/UX Pages
- [x] `app/layout.tsx` — RootLayout: GoogleAnalytics, fonts (Cormorant Garamond + Inter), ConsentBanner, theme provider — LƯU Ý: GA + ConsentBanner mount ở `app/(store)/layout.tsx` (route group, không phải root). Root layout `app/layout.tsx` chỉ phục vụ `/403`.
- [ ] `app/page.tsx` — Trang chủ: Hero + Featured Collections + Latest Arrivals + Story Teaser
- [ ] `app/san-pham/page.tsx` — Danh sách: filter (collection, category, tier, price), grid responsive
- [ ] `app/san-pham/[slug]/page.tsx` — Chi tiết: ProductGallery + ProductMeta + ProductStory + JSON-LD
- [ ] `app/bo-suu-tap/page.tsx` + `[slug]/page.tsx`
- [ ] `app/gio-hang/page.tsx` — CartItem (with countdown) + CartSummary
- [ ] `app/thu-tuc-dat-hang/page.tsx` — CustomerForm + PaymentMethodSelector + OrderSummary
- [ ] `app/don-hang/[code]/page.tsx` — Tra cứu với verify SĐT
- [ ] `app/cau-chuyen/page.tsx` + `app/lien-he/page.tsx` + `app/chinh-sach/*`

### E2. Pages BỔ SUNG từ analysis
- [ ] `app/cach-phan-biet-do-si/page.tsx` — content SEO, marketing
- [ ] `app/huong-dan-bao-quan/page.tsx` — content SEO
- [ ] Update `app/san-pham/page.tsx` — thêm breadcrumb, product-count
- [ ] `app/(admin)/dashboard/newsletter/page.tsx` — list subscribers, export CSV

### F. Components (theo cấu trúc §4 flows.md)
- [ ] `components/ui/*` — button, input, badge, card, dialog, skeleton, count-down, shine-image
- [ ] `components/product/*` — product-card, product-grid, product-gallery, product-meta, product-story
- [ ] `components/cart/*` — cart-item, cart-summary, empty-cart
- [ ] `components/checkout/*` — customer-form, payment-method-selector, order-summary
- [ ] `components/collection/*` — collection-card, collection-hero, collection-filter
- [ ] `components/layout/*` — navbar, footer, mobile-menu, admin-sidebar
- [ ] `components/home/*` — hero-section, featured-collections, latest-arrivals, story-teaser, newsletter
- [ ] `components/analytics/consent-banner.tsx` (Nghị định 13/2023 VN)
- [ ] `components/seo/json-ld-product.tsx`

### F2. Components BỔ SUNG từ analysis Laurelle/Lillicoco (xem `analysis.md` §5.1)
- [x] `components/layout/announcement-bar.tsx` — top bar xoay vòng (sale, freeship, ...)
- [x] `components/home/trust-strip.tsx` — 4 trust icons (chính hãng / 10' hold / freeship / bảo mật)
- [x] `components/home/tier-showcase.tsx` — SSS/SS/S explainer (điểm khác biệt EV)
- [ ] `components/home/latest-drops.tsx` — pattern Lillicoco (collection có launch_at)
- [ ] `components/home/newsletter-popup.tsx` — modal sau 30s
- [x] `components/product/product-count.tsx` (tích hợp trong `/san-pham`)
- [x] `components/product/product-breadcrumb.tsx` (tích hợp trong PDP + PLP)
- [ ] `components/product/recently-viewed.tsx` — 6 sản phẩm vừa xem
- [ ] `components/product/zoom-image.tsx` — hover zoom chi tiết
- [ ] `components/product/product-accordion.tsx` — Shipping / Returns / Care
- [ ] `components/ui/wishlist-button.tsx` — heart icon, localStorage
- [x] `components/product/filter-sidebar.tsx` — sidebar với checkbox + price range (Lillicoco pattern)
- [x] `components/product/sort-dropdown.tsx` — sort client component
- [x] `components/product/active-filters.tsx` — chips filter active
- [ ] `components/care/care-guide.tsx`
- [ ] `components/care/authentication-guide.tsx`
- [x] Update `product-card.tsx` — hover swap ảnh phụ
- [ ] Update `product-gallery.tsx` — thêm zoom modal
- [x] Update `navbar.tsx` — nav structure mới (§16.1 flows.md)

### G. Hooks
- [ ] `hooks/use-cart.ts` — Zustand store: items, expiresAt, total
- [ ] `hooks/use-countdown.ts` — tick từ expiresAt, onExpire callback
- [ ] `hooks/use-anonymous-id.ts` — uuid v4 lưu cookie
- [x] `hooks/use-jewelry-analytics.ts` — GA4 events (8 hàm: viewItem, addToCart, lockItemSuccess, lockItemTimeout, beginCheckout, addPaymentInfo, purchase, viewCollection; consent-gated qua `localStorage[ev_cookie_consent]`).
- [ ] `hooks/use-gsap-sparkle.ts` — GSAP hover effect

### H. SEO
- [ ] `app/sitemap.ts` — list products + collections, revalidate mỗi giờ
- [ ] `app/robots.ts` — disallow /dashboard, /api
- [ ] JSON-LD `Product` cho trang chi tiết
- [ ] `generateMetadata` cho mỗi page (title, description, OG image)
- [ ] `next-sitemap` hoặc manual sitemap

### I. Admin Dashboard
- [ ] `app/(admin)/dashboard/layout.tsx` — sidebar + auth gate
- [ ] `app/(admin)/dashboard/page.tsx` — overview: revenue, counts, recent orders
- [ ] `app/(admin)/dashboard/products/page.tsx` — list (filter, search, edit, archive)
- [ ] `app/(admin)/dashboard/products/new/page.tsx` — form tạo mới
- [ ] `app/(admin)/dashboard/products/bulk-upload/page.tsx` — SheetJS + table
- [ ] `app/(admin)/dashboard/collections/page.tsx` + `[id]/page.tsx` — CRUD
- [ ] `app/(admin)/dashboard/orders/page.tsx` + `[id]/page.tsx` — list, status update
- [ ] `app/api/admin/bulk-import/route.ts` — middleware check role

### J. Rate-limit & Security
- [ ] Upstash Redis setup (hoặc Vercel KV)
- [ ] Rate-limit `/api/lock-item` (10 req / phút / IP)
- [ ] Rate-limit `/api/orders` (5 req / phút / IP)
- [ ] Rate-limit `/api/momo/*` (theo orderId)
- [ ] Validate zod cho mọi Route Handler input
- [ ] Không log token/JWT/secret

---

## 🟡 P1 — MEDIA LIBRARY & STORAGE (mới)

### X1. Storage Infrastructure (DONE ✅)
- [x] `lib/supabase/storage.ts` — `uploadImage()` + `deleteImage()` dùng service-role client
- [x] `lib/image/client-resize.ts` — `resizeImage()` + `formatBytes()` + `getImageDimensions()` (Canvas API, zero dep, webp 1600px q=0.85)
- [x] `app/api/admin/uploads/route.ts` — POST multipart, `requireAdmin()`, whitelist folder, 10MB cap
- [x] `supabase/migrations/0010_storage_jewelry_images.sql` — bucket `jewelry-images` public + 10MB + 2 policies (public read, admin write)
- [x] Update `components/admin/product-form.tsx` — wired: image chính + gallery dùng resize→upload flow, spinner, toast báo % giảm

### X2. Media Library Phase 1 — Read-only (DONE ✅)
- [x] `docs/media-library-spec.md` — 1087 dòng spec cho Google Stitch (18 sections, ASCII art)
- [x] `components/admin/media/types.ts` — `MediaItem` + `MediaSort` interfaces
- [x] `components/admin/media/media-card.tsx` — card 1 ảnh với hover overlay, usage badge, error fallback
- [x] `components/admin/media/media-grid.tsx` — grid responsive 2→6 cols + skeleton + empty state
- [x] `components/admin/media/media-toolbar.tsx` — search + sort + stats (glass style)
- [x] `components/admin/media/media-detail-drawer.tsx` — drawer chi tiết: preview, metadata, usedIn list, copy URL, ESC close
- [x] `app/api/admin/media/route.ts` — GET list + usage count (PostgREST 1 query cho products)
- [x] `app/(admin)/admin/media/page.tsx` — tổng hợp, debounce search 300ms, prev/next pagination

### X3. Media Library Phase 2 — Delete + Sidebar (DONE ✅)
- [x] `app/api/admin/media/route.ts` — thêm `DELETE` body `{ paths: [] }` với check usage trước (atomic IN_USE 400, IN_USE paths list, 500 DELETE_FAILED w/ failedPaths)
- [x] Nút "Xoá" trong `media-detail-drawer.tsx` (disabled nếu usageCount > 0, confirm qua window.confirm, Loader2 spinner khi đang xoá)
- [x] Thêm "Media" vào `navItems` trong `components/layout/admin-sidebar.tsx` (giữa Collections và Inventory)
- [x] Export `BUCKET` constant từ `lib/supabase/storage.ts` để route dùng chung
- [x] Refactor: `MediaItem` type chia sẻ giữa `components/admin/media/types.ts` và `app/api/admin/media/route.ts`
- [x] `handleItemDeleted` callback ở page: optimistic remove + refetch nền
- [ ] `app/api/admin/media/usage/route.ts` — GET `?path=` trả `{ usageCount, usedIn }` (refactor từ inline trong GET list) — pending
- [ ] Select mode trong `media-grid.tsx` (checkbox overlay, bulk delete orphan) — pending

### X4. Media Library Phase 3 — Picker Modal từ product-form (~4h)
- [ ] `components/admin/media/media-picker-modal.tsx` — modal list ảnh, single/multi select, dùng lại `MediaGrid`
- [ ] Nút "Chọn từ thư viện" cạnh nút "Upload" trong `product-form.tsx` (image chính: single, gallery: multi)
- [ ] Callback `onSelect(urls: string[])` → set field
- [ ] Empty state trong modal: "Chưa có ảnh nào, upload mới từ form?"
- [ ] Refactor: share `MediaItem` type giữa API route + components (fix duplicate type)

### X5. Media Library Phase 4 — Upload dropzone trong page (DONE ✅)
- [x] `components/admin/media/media-upload-dropzone.tsx` — drag-drop lớn ở đầu page, multiple file, progress per-entry (pending → resizing → uploading → done/failed), semaphore 3 concurrent, % smaller badge, Toast per file, Clear all
- [x] Tích hợp `POST /api/admin/uploads` (route có sẵn, không tạo mới — upload là phase trước)
- [x] Sau upload: refresh grid + toast `Đã upload N ảnh mới`
- [x] Client-side resize sang webp 1600px q=0.85 trước upload (giảm ~70% bandwidth)

---

## 🟢 P2 — POLISH & CẢI TIẾN

### K. UX
- [ ] Search bar (Supabase full-text search trên title + description)
- [ ] Wishlist lưu localStorage
- [ ] Recently viewed (localStorage)
- [ ] Zalo ZNS / Messenger auto-reminder khi countdown còn 2 phút
- [ ] Abandoned cart email (Resend + Supabase scheduled function)
- [ ] Loading skeleton cho mọi data fetch

### L. Vận hành
- [ ] Sentry error tracking
- [ ] Vercel Analytics (hoặc PostHog)
- [ ] Backup Supabase bật PITR
- [ ] Staging env (Vercel Preview branches)
- [ ] README.md hướng dẫn setup local + deploy
- [ ] AGENTS.md cho AI agent (stack, conventions, commands)
- [ ] Runbook cho on-call (MoMo IPN failed, lock stuck, v.v.)

### M. Tài liệu
- [ ] Sửa lỗi Markdown trong `plan.md`: bổ sung `##` cho mục 3, 4, 5, 6, 7
- [ ] Sơ đồ ERD (dbdiagram.io hoặc mermaid)
- [ ] Cập nhật `flows.md` khi có thay đổi flow
- [ ] CHANGELOG.md

---

## 🟣 P1 — END-USER ACCOUNT (mới — xem chi tiết `flows.md` §18, `docs/account-page-spec.md`)

> Thêm flow tài khoản khách hàng (opt-in, không bắt buộc). Không thay thế guest checkout.

### S. Database
- [ ] Migration `0009_user_account.sql` — tạo `addresses`, `wishlist_items`, `product_reviews`
- [ ] Bổ sung `profiles`: `avatar_url`, `date_of_birth`, `gender`, `marketing_opt_in`, `updated_at`
- [ ] RPC `link_guest_orders_to_user(p_user_id, p_phone)` — auto-link đơn cũ khi đăng ký
- [ ] RPC `is_verified_purchase(p_user_id, p_product_id)` — cho review badge
- [ ] RLS policies cho `addresses`, `wishlist_items`, `product_reviews`
- [ ] Index: `idx_addresses_user`, `idx_wishlist_user`, `idx_reviews_product_approved`, `idx_reviews_user`

### T. Auth Pages (end-user)
- [ ] `app/(store)/dang-nhap/page.tsx` — Email + Magic Link tabs
- [ ] `app/(store)/dang-ky/page.tsx` — full_name + email + phone + password
- [ ] `app/(store)/quen-mat-khau/page.tsx` — reset password qua email
- [ ] `app/(store)/xac-nhan-email/page.tsx` — thông báo verify
- [ ] `lib/auth/require-user.ts` — auth helper (tương tự require-admin)
- [ ] Update `middleware.ts` — thêm matcher `/tai-khoan/:path*` + `/api/account/:path*`
- [ ] Update `navbar.tsx` — User icon link dynamic, avatar mini khi logged in

### U. API Routes
- [ ] `app/api/auth/magic-link/route.ts`
- [ ] `app/api/auth/reset-password/route.ts`
- [ ] `app/api/account/profile/route.ts` — GET / PATCH
- [ ] `app/api/account/addresses/route.ts` + `[id]/route.ts` + `[id]/default/route.ts`
- [ ] `app/api/account/wishlist/route.ts` + `[productId]/route.ts`
- [ ] `app/api/account/orders/route.ts` — list theo phone
- [ ] `app/api/account/reviews/route.ts` + `[id]/route.ts`
- [ ] `lib/validations/account.ts` — Zod schemas
- [ ] Rate-limit `/api/account/*` 30 req / phút / user
- [ ] Rate-limit review POST 5 / ngày / user

### V. Account Page Components
- [ ] `app/(store)/tai-khoan/layout.tsx` — auth gate + sidebar layout
- [ ] `app/(store)/tai-khoan/page.tsx` — redirect `/tai-khoan/ho-so`
- [ ] `app/(store)/tai-khoan/ho-so/page.tsx` — profile form
- [ ] `app/(store)/tai-khoan/don-hang/page.tsx` + `[code]/page.tsx`
- [ ] `app/(store)/tai-khoan/dia-chi/page.tsx`
- [ ] `app/(store)/tai-khoan/yeu-thich/page.tsx`
- [ ] `app/(store)/tai-khoan/danh-gia/page.tsx`
- [ ] `app/(store)/tai-khoan/bao-mat/page.tsx`
- [ ] `components/account/account-sidebar.tsx` + `account-mobile-tabs.tsx`
- [ ] `components/account/profile-form.tsx`
- [ ] `components/account/order-list.tsx` + `order-list-filters.tsx`
- [ ] `components/account/address-card.tsx` + `address-form.tsx`
- [ ] `components/account/wishlist-grid.tsx`
- [ ] `components/account/review-list.tsx` + `review-form.tsx`
- [ ] `components/account/security-panel.tsx`
- [ ] `hooks/use-account-sync.ts` — localStorage wishlist ↔ DB

### W. Integration
- [ ] Update `app/(store)/thanh-toan/page.tsx` — pre-fill từ profile + addresses nếu logged in
- [ ] Update `components/ui/wishlist-button.tsx` — gọi API nếu logged in
- [ ] Update `app/(store)/don-hang/[code]/page.tsx` — auto-skip form SĐT nếu logged in
- [ ] GA4 events: `account_register`, `account_login`, `account_logout`, `profile_updated`, `address_added`, `wishlist_synced`, `review_submitted`

---

## 🟣 P1 — AI CHATBOT (mới — xem chi tiết `flows.md` §15)

### N. Schema & Vector
- [ ] Migration `0004_chatbot_schema.sql` — bật `pgvector`, thêm `embedding`/`embedding_text` vào `products`, tạo bảng `chat_sessions` + `chat_messages`, RPC `match_products`
- [ ] Migration `0005_embed_trigger.sql` — trigger tự động embed khi INSERT/UPDATE `products`
- [ ] Script `scripts/embed-all-products.ts` — batch embed toàn bộ products hiện có
- [ ] Test query `match_products` với 1 sample embedding

### O. Backend & Tools
- [ ] Cài deps: `ai @ai-sdk/react @ai-sdk/openai`
- [ ] `lib/chatbot/client.ts` — OpenAI singleton
- [ ] `lib/chatbot/system-prompt.ts` — "Bà Chủ Tiệm" persona + guardrails
- [ ] `lib/chatbot/tools.ts` — 4 tools: `searchProducts`, `semanticSearch`, `getProductDetail`, `getCurrentCollections`
- [ ] `app/api/chat/route.ts` — POST handler với `streamText`, sliding window 10 messages, persist vào `chat_messages`
- [ ] `hooks/use-chat-session.ts` — tạo/lấy sessionId từ cookie, anonymous-id

### P. Frontend UI
- [ ] `components/chatbot/chat-widget.tsx` — floating bubble + panel
- [ ] `components/chatbot/chat-trigger.tsx` — nút góc phải, gold border, pulse animation
- [ ] `components/chatbot/chat-panel.tsx` — header + message list + input
- [ ] `components/chatbot/chat-message.tsx` — render text + tool results
- [ ] `components/chatbot/chat-product-card.tsx` — mini card trong message (click → `/san-pham/[slug]`)
- [ ] `components/chatbot/chat-welcome.tsx` — câu chào + 4 gợi ý câu hỏi
- [ ] Mount `<ChatWidget/>` global trong `app/layout.tsx` (trừ `/admin/*`)

### Q. Security & Cost
- [ ] Rate-limit `/api/chat` 20 messages / phút / IP (Upstash Redis)
- [ ] Filter `role === 'admin'` khỏi context nếu user lộ
- [ ] Guardrail chống prompt injection trong system prompt
- [ ] Optional: OpenAI Moderation API check input
- [ ] Cache FAQ phổ biến để giảm cost
- [ ] Env: `OPENAI_API_KEY` (hoặc `AI_GATEWAY_API_KEY` nếu dùng Vercel AI Gateway)

### R. Analytics & Admin
- [ ] GA4 events: `chat_opened`, `chat_message_sent`, `chat_product_clicked`
- [ ] Trang `/dashboard/chat` (optional MVP+) — list sessions, messages, tool call stats
- [ ] Log `tokens_used` mỗi message để tracking cost

---

## ❓ CÒN CẦN USER QUYẾT ĐỊNH (không block code nhưng cần xác nhận trước khi launch)

- [ ] **Số lượng ảnh / sản phẩm**: 1 ảnh chính + gallery tối đa 5 ảnh? (khuyến nghị)
- [ ] **Có cần biến thể sản phẩm** (size, màu)? — MVP gợi ý: **KHÔNG** vì đồ si độc bản
- [ ] **Miền deploy**: `.vn` hay `.com`? (gợi ý: `emerald-vault.vn`)
- [ ] **Ngôn ngữ**: chỉ tiếng Việt hay i18n EN/VI? (MVP: chỉ VI)
- [ ] **Có cần blog / SEO content** (gemstone, cách phân biệt đồ si)?
- [ ] **Shipping fee**: tính theo tỉnh hay flat? (gợi ý: flat 30k hoặc theo tỉnh từ DB)
- [ ] **Email xác nhận đơn**: dùng Resend hay Supabase Auth email? (gợi ý: Resend)
- [ ] **Logo & brand assets**: cần file thiết kế từ designer hay dùng placeholder?

### Câu hỏi về AI Chatbot
- [ ] **Model AI**: dùng **Gemini 2.5 Flash** (FREE, ~$0/100 conversations/ngày) hay **OpenAI GPT-4o-mini** (~$0.005/conversation) hay **self-host Ollama Qwen 2.5**? — gợi ý: **Gemini** cho MVP, switch sang OpenAI/self-host khi scale
- [ ] **Provider**: dùng 1 provider hay **multi-provider với fallback** (vd: Gemini primary → Groq fallback khi hết quota)? — gợi ý: có fallback
- [ ] **Embed model**: dùng **Gemini gemini-embedding-001** (FREE 1500 req/ngày) hay OpenAI `text-embedding-3-small` (trả phí)? — gợi ý: **Gemini embedding**
- [ ] **Phạm vi tư vấn**: chỉ catalog sản phẩm, hay còn mở rộng (cách đeo, bảo quản, phong thủy, v.v.)? — gợi ý: cả catalog + kiến thức cơ bản (đã có guardrail trong system prompt)
- [ ] **Có lưu lịch sử chat để training** sau này không? — gợi ý: CÓ, lưu `chat_sessions` + `chat_messages` (đã thiết kế)

### Câu hỏi về Media Library & Storage
- [ ] **Ảnh orphan cleanup**: có auto-xoá ảnh không dùng sau N ngày không? (gợi ý: KHÔNG, cứ để admin xoá tay ở Phase 2)
- [ ] **Bucket tổ chức**: chỉ dùng 1 folder `products/` hay tách thêm `categories/`, `banners/`, `collections/`? (API đã whitelist 4 folder sẵn)
- [ ] **CDN transform**: có dùng Supabase Image Transform (`?width=200&height=200`) cho thumbnail không? (gợi ý: chưa, vì Next/Image đã optimize; sẽ bật khi có nhiều ảnh)
