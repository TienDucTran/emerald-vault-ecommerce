# LUỒNG XỬ LÝ CHUẨN — HỆ THỐNG TRANG SỨC SI NHẬT

> File tham chiếu duy nhất cho mọi implementation. Tổng hợp kiến trúc, schema, API, UI structure, payment (MoMo), SEO, analytics & vận hành. Mọi thay đổi flow phải update file này trước khi code.

---

## 0. TRẠNG THÁI TỔNG THỂ (auto-generated, cập nhật 2026-07-29 — Sprint "Chatbot comprehensive audit + harden")

> Báo cáo tổng hợp từ audit codebase. Tổng ~155 mục trong 19 sections của file này.
> Chi tiết đầy đủ + danh sách job pending theo priority xem **[§19. STATUS — JOB PENDING](#19-status--job-pending)** ở cuối file.
> Báo cáo bug tập trung xem **[BUGS-AUDIT.md](./BUGS-AUDIT.md)** ở root project.

| Trạng thái | Số lượng | % |
|---|---|---|
| ✅ DONE | ~127 | 82% |
| 🟡 PARTIAL | ~15 | 10% |
| ❌ NOT STARTED | ~13 | 8% |

**Customer flow** (mua hàng, thanh toán, tài khoản): gần như end-to-end, chạy được — **đã có VietQR làm payment chính (MVP)**.
**Admin products CRUD + bulk import**: xong thật (real data).
**Admin dashboard + orders + collections + newsletter**: ✅ real data (sprint "Unblock vận hành" 2026-07-17).
**VietQR flow** (migration 0008 + customer + admin): ✅ done (sprint "VietQR + Unblock" 2026-07-17).
**Login + Admin Block** (sprint 2026-07-17): ✅ done — fix race condition kẹt loading, admin block mua hàng, customer_id sync theo email.
**AI Chatbot core** (sprint 2026-07-20): ✅ done — pgvector + 4 tools + streaming + 7 components.
**AI Chatbot Knowledge Base** (sprint 2026-07-21): ✅ done — 5 bảng DB (chat_knowledge/faqs/upcoming_products/upcoming_collections/chat_promotions) + 5 tools mới + admin CRUD UI + sidebar menu + lead capture. Chatbot giờ trả lời được: chính sách shop, FAQ cứng, sản phẩm/BST sắp ra mắt, mã giảm giá đang chạy. Xem §15.17.
**AI Chatbot Suggested Answers + Cluster Analytics** (sprint 2026-07-22 buổi sáng): ✅ done — bảng `chat_suggested_answers` + RPC `get_user_question_clusters` (gom câu hỏi thật của khách theo text-similarity) + tool `getSuggestedAnswers` (model tự gọi trước `getKnowledge` cho câu hỏi chính sách) + 2 tab mới trong `/admin/chatbot` (Phân tích: SummaryCards/Top tools/Top clusters/Failed calls với day-filter 1/7/30; Mẫu trả lời: CRUD form + list với edit/delete/publish). Multi-provider rate-limit cooldown (Groq/Or/Cb/Cf 429/STREAM_TIMEOUT → skip N giây). Xem §15.18.
**🆕 AI Chatbot Tool Cache + Analytics + Sidebar Widget** (sprint 2026-07-22 buổi chiều): ✅ done — in-memory LRU cache + TTL cho 11/12 tools (giảm tải DB khi cùng câu hỏi lặp lại); bảng `chat_analytics` + 3 RPCs (summary/top-questions/failed-calls) tracking mỗi tool call (latency, status, error); fire-and-forget logger không block tool; widget analytics nhúng vào `AdminSidebar` (chỉ hiện khi expanded): tổng calls 24h, error rate %, top 3 tools, failed 24h badge, cache size + hit rate, auto-refresh 30s; cache invalidation hooks trong 6 admin CRUD routes (products/collections/promotions/knowledge) gọi `invalidateTool(...)` để user thấy data mới ngay; defense-in-depth CHECK constraints cho `chat_knowledge.category` + `chat_faqs.category`. Xem §15.19.
**🆕 Bank Payment UX + Admin Order Detail polish** (sprint 2026-07-23): ✅ done — bank-payment-client nhận thêm `billUploadedAt`; sau upload bill thành công lưu local state (`billUrl` + `billUploadedAt`) để user thấy feedback tức thì (preview thumbnail + timestamp "Đã upload lúc HH:MM DD/MM"); button đổi text "Upload lại bill" khi đã có bill; click "Tôi đã chuyển" redirect về `/tai-khoan/don-hang/[code]` (chi tiết đơn trong account) thay vì list — user thấy ngay badge "Chờ xác nhận" + Realtime toast khi admin confirm; admin order detail gỡ trùng lặp "Phương thức" + "Số tiền CK" giữa panel "Thanh toán" và card "Thanh toán ngân hàng" — bank card giờ chỉ show info RIÊNG (Ngân hàng + BIN, STK, Chủ TK, Nội dung CK).
**🆕 Customer self-service cancel + refund request** (sprint 2026-07-23): ✅ done — `POST /api/orders/[code]/customer-action` với 2 action: `cancel` (chỉ WAITING_PAYMENT → set CANCELLED + payment=FAILED + release locks + restore products + bank_transfers.rejected_at) và `request_refund` (WAITING_CONFIRM/CONFIRMED/SHIPPING/DONE → set payment_status=REFUND_REQUESTED, admin CK lại thủ công rồi chuyển REFUNDED). Migration 0021 thêm enum value `REFUND_REQUESTED` + 4 audit fields (`customer_cancelled_at`, `customer_cancel_reason`, `refund_requested_at`, `refund_reason`). UI: trang `/tai-khoan/don-hang/[code]` thêm `<CustomerActionButtons/>` với modal nhập lý do — button "Hủy đơn hàng" (đỏ, WAITING_PAYMENT), "Yêu cầu hoàn tiền" (vàng, các status còn lại), banner "ĐANG CHỜ ADMIN HOÀN TIỀN" khi đã request.
**🆕 Admin orders — bổ sung filter status thiếu + refund-request alert** (sprint 2026-07-23): ✅ done — admin list `/admin/orders` filter status bổ sung `WAITING_PAYMENT` + `WAITING_CONFIRM` (trước đây thiếu → admin không filter được đơn CK chờ xác nhận từ dropdown); payment status bổ sung `REFUND_REQUESTED`; API `GET /api/admin/orders` + `/api/admin/orders/export` update zod enum schema tương ứng (trước đây schema reject → 400 BAD_REQUEST nếu user pass query hợp lệ); dashboard KPI mới `pendingRefundRequests` + alert badge "Có N yêu cầu hoàn tiền → Xem" link tới `/admin/orders?paymentStatus=REFUND_REQUESTED`.
**🆕 Refund flow refactor — tách bảng order_refunds** (sprint 2026-07-27, design choice tránh status explosion): ✅ done — Tách refund lifecycle vào bảng `order_refunds` (state machine: `PENDING → APPROVED → COMPLETED/FAILED | REJECTED`) thay vì thêm enum values vào `orders.status` (giữ nguyên 7) hoặc `payment_status_enum` (giữ nguyên 5). Migration `0023_order_refunds.sql` tạo bảng + partial unique index "1 ACTIVE refund per order" + backfill từ `orders.refund_*` fields (migration 0021). API mới `POST /api/admin/orders/[id]/refund` với 4 action: `approve` (set refund_amount + bank info), `reject` (admin từ chối, customer có thể request lại), `mark_completed` (set bill_proof_url + flip orders.payment_status='REFUNDED'), `mark_failed` (CK lỗi, retry). API cũ `/api/orders/[code]/customer-action` action `request_refund` refactor: INSERT vào `order_refunds(state='PENDING')` thay vì ghi `orders.refund_*`. Admin order detail page có panel `<RefundPanel>` với timeline + modal duyệt/từ chối/CK/đã nhận tiền + SLA countdown. Customer trang chi tiết đơn có `<RefundStateBanner>` dynamic theo state (PENDING/APPROVED/COMPLETED/FAILED/REJECTED) thay vì banner đơn giản. Cron SLA escalation (migration 0024): mỗi 4h auto-mark refund PENDING quá 24h với reason `AUTO_ESCALATED`. Cron archive (0024): mỗi ngày 03:00 xoá refund records COMPLETED/REJECTED/FAILED quá 6 tháng. Xem §10.5.
**🆕 BUGS-AUDIT fixes — Mobile UI + Chatbot deploy + Admin responsive + pg_cron** (sprint 2026-07-27): ✅ done (xem `BUGS-AUDIT.md` ở root). Tóm tắt:
- **Customer mobile UI** (B1-B3, H1-H4): mount `MobileFooter` trên `<lg` (đã có sẵn nhưng chưa import), đổi `h-13` → `h-14` ở `Button` + `WishlistButton` (Tailwind spacing không có `13` → button collapse), chat-bubble tránh đè bottom nav (`bottom-20` mobile → `bottom-6` tablet+), navbar padding responsive, sticky header 96px được clear bằng `pt-[96px]` mobile, body `overflow-x-hidden`, search dropdown không bị clip nữa.
- **Chatbot deploy (B4-B8)** — fix "lỗi chat bot deploy Vercel": cooldown state chuyển sang Upstash Redis (graceful fallback in-memory nếu chưa có env) để share giữa serverless instances, `maxDuration = 25` (an toàn cho Hobby 10s), `STREAM_TIMEOUT_MS = 9_000`, drop `experimental_context` (đã bỏ trong AI SDK v6 — thay bằng `setChatContext()`/`clearChatContext()` ở `lib/chatbot/tools.ts`), bỏ `httpOnly` cookie `ev_client_id` (client cần đọc để session ổn định), defensive logging 503 list env nào thiếu, CORS OPTIONS handler.
- **Admin responsive (B9-B11, H8, H9, M5)**: orders/products tables min-w 640/760 (giảm từ 860/1024) + padding responsive; chatbot admin `grid-cols-2/3` → `grid-cols-1 sm:grid-cols-2/3` (5 chỗ); admin header z-30 → z-40; `admin-shell main overflow-x-hidden`; MediaPicker `max-w-full sm:max-w-5xl` cho mobile.
- **pg_cron (B12)** — migration `0022_enable_pg_cron.sql` thực sự enable extension + schedule `release-expired-locks` chạy mỗi phút (trước đây flows.md claim ✅ nhưng không có migration nào làm).
- **Misc**: SSE parser fix multi-line `data:` (split trên `\n\n` thay vì `\n`), `useChatSession` sync generate trong `useState` initializer (fix sessionId split bug ở first POST), `onFinish` chuyển sang Vercel `waitUntil` (best-effort persist không race function ceiling), body parser có content-length guard, chat panel `h-[min(480px,calc(100dvh-6rem))]` cho landscape phone, `engines.node >=20` trong `package.json`.
- **Migration dup fix**: `0010_product_reserved.sql` (đụng `0010_storage_jewelry_images.sql`) → content chuyển sang `0009b_product_reserved.sql`, file cũ thành no-op redirect.

**🆕 Production hardening + Account polish** (sprint 2026-07-28): ✅ done. Tóm tắt:
- **Env validation** (`lib/env.ts`) — zod schema validate required vars (Supabase, AI, Site) lúc startup với friendly error message listing missing vars. Helpers: `getServerEnv()`, `getClientEnv()`, `getBankConfig({isConfigured})`, `getChatProviderConfig()`, `getMoMoConfig({isConfigured})`, `isProduction`, `vercelEnv`, `SKIP_ENV_VALIDATION` escape hatch cho build time. Optional vars warn nhưng không throw.
- **Rate-limit middleware** (`lib/middleware/rate-limit.ts`) — Upstash Redis sliding-window 10 req/min/IP áp dụng cho 4 routes high-risk: `/api/lock-item` (10/min), `/api/orders` (5/min), `/api/momo/create` (5/min), `/api/chat` (20/min). `/api/momo/ipn` identify bằng `orderId`. Graceful fallback `{ok:true, degraded:true}` khi thiếu `UPSTASH_REDIS_REST_URL` (dev local) — không break.
- **Sentry setup** — 3 config files (`sentry.client.config.ts` / `.server.config.ts` / `.edge.config.ts`) + `instrumentation.ts` load theo `NEXT_RUNTIME` + `app/global-error.tsx` catch-all UI. Replay integration (1.0 sample on error), traces 0.1, dev errors dropped. Server `beforeSend` redact 11 sensitive fields (phone/email/token/apiKey/cookies/authorization) cho event.extra/contexts/request/user. Graceful khi thiếu `SENTRY_DSN` (init skip + warn).
- **GA4 chatbot events** — 4 custom events wired: `chat_opened` (bubble click + `is_returning_user` từ localStorage `ev_chat_seen`), `chat_message_sent` (sau khi append user message, scan history cho product context), `chat_product_clicked` (event-delegation match `[href^="/san-pham/"]`, tra cứu slug trong messages map), `chat_lead_captured` (stream `tool-output-available` cho `captureLead` success, extract `contact_type` từ tool input). Builders trong `lib/analytics/events.ts`, wrappers trong `use-jewelry-analytics.ts`, wire points trong `chat-widget.tsx`.
- **`/tai-khoan/xac-nhan-email` page** (sprint ticket I10) — post-signup confirmation fallback: Suspense wrap `useSearchParams`, đọc `?email=` query, countdown 60s cho nút "Gửi lại email" (gọi `/api/auth/resend-confirmation`), toast success/error. Layout thêm path vào `AUTH_PATHS` để render không sidebar (chỉ `<main>`). API route POST `{email}` → `supabase.auth.resend({type:'signup', emailRedirectTo:'/tai-khoan/ho-so'})`.

**🆕 Chatbot comprehensive audit + harden** (sprint 2026-07-29): ✅ done. Audit phát hiện 41 issues (12 HIGH + 22 MED + 7 LOW), fix hết HIGH + 6 MED. Tóm tắt:
- **HIGH (10 fixes)**:
  - **S1 STREAM_TIMEOUT abort**: `AbortController` per provider iteration + `abortSignal: providerAbort.signal` vào `streamText` + chain với `request.signal` (client disconnect). Trước: timeout 9s không cancel underlying call → waste quota + DB write không deterministic.
  - **S8 TOOL_CALL_BUG_RE regex**: bỏ standalone "getKnowledge"/"validation"/"schema" → match cụ thể `parameters.*did not match|Invalid input for tool|tool_call.*failed`. Tránh false positive khi model output có từ "getKnowledge" hợp lệ.
  - **S9 Per-tab session ID**: `hooks/use-chat-session.ts` refactor — `sessionId` per-tab qua `sessionStorage['ev_chat_tab_id']`, `clientId` qua cookie (cross-tab). 2 tab mở cùng lúc không còn cross-contaminate history.
  - **S10 Pending UI state**: user message có `pending: 'pending'|'sent'|'failed'` flag. UI render "Đang gửi..." khi đang stream, "Gửi thất bại" + nút "Thử lại" khi fail. Trước: failed message trông như đã gửi.
  - **S11 Tool output state machine**: defensive `toolMeta.get` check + `if (!meta) console.warn`. Không `delete(toolCallId)` nữa → idempotent nếu tool-output-available fire 2 lần.
  - **S12 Auto-retry no-duplicate**: `handleSend(text, isRetry)` flag. Retry path KHÔNG append user message mới — update existing msg `pending='pending'`.
  - **T1 ILIKE wildcard escape**: `lib/chatbot/ilike-escape.ts` helper `escapeIlikePattern` (escape `% _ \`) + `unaccentIlikePattern`. Apply cho 4 tools (searchProducts/getKnowledge/getFaq/getSuggestedAnswers) — input "100% bạc" không còn match wildcard.
  - **T2 Slug regex**: `getProductDetail` schema `slug: z.string().regex(/^[a-z0-9-]+$/)` — chặn `../etc/passwd`.
  - **T3 captureLead hardening**: Zod `.refine()` validate phone/email/zalo format + `_leadSpamCounter` (max 3 leads/5min/session) + strip `contactValue` khỏi return (chống echo PII vào model context).
  - **T5 minPrice/maxPrice refine**: Zod `.refine()` chặn minPrice > maxPrice.
  - **X1 abortSignal**: pass `request.signal` chain với providerAbort → client disconnect tức thì cancel stream.

- **MED (6 fixes)**:
  - **C3 Cookie hardening**: `sameSite: 'strict'` + `secure: process.env.NODE_ENV === 'production'`.
  - **C5 Clear chat confirm**: `window.confirm('Xóa cuộc trò chuyện này?')` trước khi clear.
  - **C4 Input limit**: textarea `maxLength={2000}` + server 400 `MESSAGE_TOO_LONG` nếu bypass.
  - **U3 prefers-reduced-motion**: tất cả `transition-all` trong `components/chatbot/*` wrap với `motion-safe:` Tailwind variants (10 chỗ).
  - **Sec2 PII redaction**: `lib/log/redact.ts` helper `redactPII` (SĐT + email → `[REDACTED_*]`). Wrap 9 chỗ `console.error` trong route.ts + 26 chỗ trong tools.ts.
  - **T11 Diacritics search**: migration `0027_unaccent_extension.sql` (CREATE EXTENSION unaccent) + 4 tools OR `unaccent(title).ilike.${pat}`. Trước: "nhan" không match "nhẫn" — sau: match được cả không dấu lẫn có dấu.
  - **T7 getActivePromotions cache key**: bỏ `minOrderValue` khỏi key → 1 cache slot cho mọi minOrderValue.
  - **T8 Upcoming filter**: `.gte('expected_launch_date', new Date().toISOString())` cho `getUpcomingProducts` + `getUpcomingCollections`.
  - **M1 userMessage field**: tất cả error responses (TOO_MANY_MESSAGES/NO_MESSAGES/RATE_LIMITED/PAYLOAD_TOO_LARGE/INVALID_JSON/SESSION_FAILED) có `userMessage` tiếng Việt.
  - **M4 extractText heuristic**: skip JSON parse nếu `length < 100` (tránh mangle text ngắn legitimate).

- **Migration apply pending**:
  - `0027_unaccent_extension.sql` — `CREATE EXTENSION unaccent` (cần apply trước deploy để searchProducts match có dấu).
  - Cộng dồn với 4 migrations cũ (0011/0018/0019/0026) ~13 phút tổng.

- **Còn lại** 7 LOW (perf optimization như embedding cache, parallel query cho searchProducts fallback, Markdown rendering với rehype-sanitize, etc.) — không block launch.

**🆕 QR checkout audit fixes — VietQR flow security + UX hardening** (sprint 2026-07-28 buổi chiều): ✅ done. Audit phát hiện 19 issues (4 HIGH + 5 MED + 8 LOW + 2 OK), fix hết HIGH/MED. Tóm tắt:

**🆕 Refund flow harden — payment_status reset khi admin REJECTED + admin orders filter sync URL** (sprint 2026-07-27 buổi chiều): ✅ done. Tóm tắt:
- **Bug root**: Sau khi admin REJECTED refund, `orders.payment_status` vẫn `REFUND_REQUESTED` → customer click "GỬI YÊU CẦU MỚI" bị API `409 ALREADY_REQUESTED` (check line 230 `payment_status === 'REFUND_REQUESTED'` trước khi check `order_refunds.state`).
- **Fix customer route** (`app/api/orders/[code]/customer-action/route.ts`): bỏ block check legacy mirror `payment_status === 'REFUND_REQUESTED'`. Rely hoàn toàn vào query `order_refunds WHERE state IN ('PENDING','APPROVED')` là source of truth cho duplicate guard. Block check `payment_status ∈ {PAID, AWAITING_CONFIRM}` còn nguyên → guard chống duplicate khi refund đang PENDING (Scenario B test matrix).
- **Fix admin route** (`app/api/admin/orders/[id]/refund/route.ts` action `reject`): thêm UPDATE `orders` reset `payment_status='PAID'`, clear `refund_requested_at` + `refund_reason`. Error handling: refund fail → return 500 không touch order; order fail → refund vẫn giữ REJECTED (không rollback).
- **Fix dashboard KPI** (`lib/analytics/dashboard.ts` line ~184): đổi `pendingRefundRequests` từ `orders WHERE payment_status='REFUND_REQUESTED'` (mirror có thể lệch) → `order_refunds WHERE state IN ('PENDING','APPROVED','FAILED')` (source of truth). KPI giờ phản ánh đúng số refund cần admin action.
- **Fix customer UI chip** (`app/(store)/tai-khoan/don-hang/[code]/page.tsx`): override chip payment khi `latestRefund.state` REJECTED/active. REJECTED → "Đã thanh toán · Hoàn tiền bị từ chối" (amber); PENDING/APPROVED/FAILED → "Đang yêu cầu hoàn tiền" (amber); COMPLETED → giữ label REFUNDED gốc.
- **Fix admin orders page sync URL** (`app/(admin)/admin/orders/page.tsx`): trước đây filter state khởi tạo `useState('')` → URL `?status=NEW` không match dropdown. Refactor: tách `OrdersPage` wrap `<Suspense>` + `OrdersPageInner` dùng `useSearchParams` (Next 14 requirement). Init state từ URL (validate enum), 2 useEffect sync state→URL (`router.replace` skip nếu đã khớp) và URL→state (cho back/forward). Nút "Xoá lọc" clear URL.
- **Xem chi tiết**: §10.5.11 (refund flow harden) + §10.6 (admin orders URL sync).

**🆕 Security hardening + Launch readiness (Phase 1 + 2)** (sprint 2026-07-31): ✅ done. Full security audit của codebase, fix hết 10 issues (5 blocker + 5 hardening). Tóm tắt:

- **Audit findings** (verified): 0 hardcoded secret, `.env*` gitignored, `SUPABASE_SERVICE_ROLE_KEY` server-only (no `NEXT_PUBLIC_` prefix), middleware dùng `supabase.auth.getUser()` (validate JWT chứ không chỉ decode cookie), mọi `/api/admin/*` + `/api/account/*` đều có `requireAdmin`/`requireCustomer` (defense-in-depth), RLS bật trên tất cả user-facing tables, MoMo IPN verify HMAC-SHA256 + Upstash rate-limit cho 5 high-risk routes, Sentry wired (client/server/edge) + PII redaction.

- **Phase 1 — 5 blockers (must-have trước khi launch)**:
  - **Security headers** (`next.config.mjs`): `poweredByHeader: false` (ẩn `X-Powered-By: Next.js`), `output: 'standalone'` (Docker/Node self-host ready), `async headers()` function với 6 headers (CSP, HSTS 2 năm + preload, X-Frame-Options: DENY chống clickjacking, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: tắt camera/mic/geo/FLoC) + CSP cụ thể cho GA4/Sentry/Supabase/MoMo/VietQR domains. Thêm rule riêng cho `/api/*` → `Cache-Control: no-store, no-cache, must-revalidate`.
  - **Health endpoint** `app/api/health/route.ts` (NEW): `GET /api/health` trả `{ ok, ts, version, uptimeSec }` cho Uptime Monitor + Load Balancer. `dynamic = 'force-dynamic'`, không đụng DB.
  - **Rate-limit `/api/orders/[code]/status`** (`app/api/orders/[code]/status/route.ts`): thêm `rateLimit('order-status', { limit: 60, window: '1 m' })` per-IP — chống enumeration + brute-force polling MoMo return page.
  - **Rate-limit `/api/orders/[code]`** (`app/api/orders/[code]/route.ts`): thêm `rateLimit('order-lookup', { limit: 10, window: '1 m' })` per-IP — siết chặt endpoint phone-as-secret (code + phone cùng brute-force).
  - **Migration cleanup** (`supabase/migrations/0010_product_reserved.sql`): file này đã được đánh dấu DEPRECATED trước đó (no-op redirect → content đã merge vào `0009b_product_reserved.sql`). **Yêu cầu xoá thủ công** bằng PowerShell: `Remove-Item -LiteralPath 'supabase\migrations\0010_product_reserved.sql' -Force`. Sau khi xoá, không còn filename collision nào trong folder migrations.

- **Phase 2 — 5 hardening items (production polish)**:
  - **Tighten image remotePatterns** (`next.config.mjs`): `*.supabase.co` wildcard → derive exact hostname từ `process.env.NEXT_PUBLIC_SUPABASE_URL` lúc build time. Fallback wildcard chỉ khi env missing (không break dev). Ngăn Next.js Image optimizer fetch ảnh từ Supabase projects của tenant khác.
  - **ESLint rule** (`.eslintrc.json`): `no-restricted-imports: error` cho pattern `@/lib/supabase/admin*` với message giải thích "createAdminClient uses SUPABASE_SERVICE_ROLE_KEY and must NEVER be imported from a Client Component". Build-time guard chống leak service-role key ra browser.
  - **Sentry release env** (`.env.example`): document `SENTRY_RELEASE` + `NEXT_PUBLIC_SENTRY_RELEASE` (đã referenced trong `sentry.server.config.ts` + `sentry.client.config.ts` nhưng chưa có trong env template).
  - **CI workflow** (`.github/workflows/ci.yml` — NEW): 2 jobs `verify` (lint + typecheck, 10min) + `build` (`next build` với Supabase secrets, depends on verify, 15min). Trigger trên `pull_request` + `push` to main. Cache npm qua `setup-node@v4`. **Yêu cầu add 2 GitHub Secrets**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong repo Settings → Secrets and variables → Actions.
  - **Dev seed stub** (`supabase/seed.sql` — NEW): no-op stub `SELECT 'seed.sql loaded' AS note;` + opt-in commented INSERTs (3 sample products với 1 SOLD_OUT để test overlay, 1 dev admin user). Chạy tự động qua `supabase db reset` sau migrations. Contributor mới không thấy storefront trống.

- **3 gap còn lại sau sprint**:
  1. **Xoá file deprecated** (PowerShell command ở trên) — 5 giây.
  2. **Add GitHub Secrets** cho CI workflow — 1 phút.
  3. **Verify sau deploy**: `curl -I https://your-domain.com/ | grep -iE 'x-frame|x-content|strict-transport|content-security|x-powered'` → phải thấy 4 headers, KHÔNG thấy X-Powered-By. `curl https://your-domain.com/api/health` → `{ok:true,...}`.

- **Còn deferred (Phase 3, không block launch)**: Dockerfile + docker-compose (self-host thay Vercel), Vitest/Playwright tests, Supabase backups policy, Uptime monitor trỏ vào `/api/health`.

**3 gap lớn nhất**:
1. ❌ **MoMo env chưa populate** — Phase 2 (khi có MST, cần làm theo `docs/momo-sandbox-setup.md` 8 bước ~20 phút). Hiện tại VietQR đã cover MVP payment.
2. ❌ **End-user account §18** — auth + dashboard + customer-action gần ✅ DONE. Sprint 2026-07-28 polish: `/tai-khoan/xac-nhan-email` page + resend API done. Còn Phase 2: reviews hiển thị trên PDP (table có sẵn, thiếu UI I14).
3. ✅ ~~**Rate-limit + Sentry** — production hardening~~ ✅ DONE sprint 2026-07-28: rate-limit Upstash × 5 routes + Sentry 3-config + instrumentation + global-error. Còn bật env trên Vercel.

**Top 3 quick-win (< 2h)**: ~~populate MoMo env~~ (defer Phase 2) → setup VietQR env → ~~mount GA4 + hook~~ ✅ done → ~~migration pg_cron `release_expired_locks`~~ ✅ done → ~~migration 0011 backfill customer_id~~ (file sẵn) **chờ apply Dashboard** → ~~**apply migrations 0015-0017**~~ ✅ done → ~~migration 0018 `chat_analytics`~~ (file sẵn) **chờ apply Dashboard** → ~~migration 0019 `chat_suggested_answers`~~ (file sẵn) **chờ apply Dashboard**. Tất cả code / routes / UI / APIs cho 3 migrations này đã chạy được ở app — chỉ thiếu bước user paste SQL vào Supabase SQL Editor.

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
# MoMo (Phase 2 — khi có MST)
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_REDIRECT_URL=https://emerald-vault.vn/momo/return
MOMO_IPN_URL=https://emerald-vault.vn/api/momo/ipn
# GA4 Data API (cho /admin/analytics)
GA4_PROPERTY_ID=
GA4_SERVICE_ACCOUNT_JSON=
# ===== AI Chatbot (sprint 2026-07-17 + 2026-07-22) — bắt buộc cho /api/chat =====
AI_PRIMARY=groq                    # primary provider key xem getChatConfig()
GROQ_API_KEY=                      # free tier: https://console.groq.com
OPENROUTER_API_KEY=                # https://openrouter.ai (free + paid models)
CEREBRAS_API_KEY=                  # https://cloud.cerebras.ai
CLOUDFLARE_API_KEY=                # https://dash.cloudflare.com → Workers AI
CLOUDFLARE_ACCOUNT_ID=             # Cloudflare account ID for Workers AI URL
GOOGLE_AI_API_KEY=                 # https://aistudio.google.com (Gemini)
OPENAI_API_KEY=                    # optional — fallback paid cuối cùng
# Chain CSV — format "<provider>:<model>". Thứ tự = thứ tự ưu tiên fallback.
CHAT_PROVIDERS=groq:llama-3.1-8b-instant,openrouter:meta-llama/llama-3.3-70b-instruct:free,cerebras:llama-3.3-70b,cloudflare:@cf/meta/llama-3.1-8b-instruct,gemini:gemini-2.0-flash
# ===== Cooldown store (sprint 2026-07-27) — optional, fallback in-memory nếu thiếu =====
UPSTASH_REDIS_REST_URL=            # https://upstash.com → Redis database
UPSTASH_REDIS_REST_TOKEN=          # REST API token (read+write)
# ===== VietQR bank account (sprint 2026-07-17) — bắt buộc cho bank_transfer =====
BANK_CODE=VCB                      # 'VCB' | 'TCB' | 'MB' | ...
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_NAME=NGUYEN VAN A
# ===== @vercel/functions waitUntil =====
# Không cần env — package đã install (npm i @vercel/functions). Vercel auto-wires.

---

## 2. DATABASE SCHEMA (chuẩn hóa)

> **Status**: ✅ 13 bảng core + 5 RPC + RLS. ✅ pg_cron `release_expired_locks` (migration 0022 — sprint 2026-07-27, trước đó flows.md claim sai). ✅ pgvector/chatbot schema (migrations 0012-0014). ✅ chatbot knowledge base (migrations 0015-0017) + analytics (0018) + suggested answers (0019) + customer cancel/refund (0021). ✅ product_reserved (0009b). ❌ `DRAFT` enum, ✅ `newsletter_subscribers` table (0006).

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

> **Status**: 🟡 → ✅ real data: dashboard, orders list/detail, collections CRUD, newsletter, analytics. ✅ AI Chatbot admin (knowledge/faqs/upcoming/promotions/leads — sprint 2026-07-21). ❌ inventory page còn mock, ❌ payments page còn mock, ❌ settings page còn mock.
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
        ├── chatbot/page.tsx      # ✅ REAL — Knowledge + FAQ + Upcoming + Promotions + Leads (5 tabs)
        ├── inventory/page.tsx    # ❌ MOCK (P2)
        ├── payments/page.tsx     # ❌ MOCK (P2)
        └── settings/page.tsx     # ❌ MOCK (P2)
```

### 3.3. API routes

> **Status**: 🟡 customer API 10/12 done. Admin: ✅ dashboard, orders (list/detail/export), collections (CRUD + reorder), newsletter, analytics, **chatbot KB CRUD** (knowledge/faqs/upcoming/promotions/leads). ✅ `/api/chat` (chatbot §15).
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
├── chat/route.ts                 # ✅ POST — chatbot streaming (Vercel AI SDK v6 + multi-provider)
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
    ├── analytics/route.ts        # GET ?days=N
    ├── chatbot/                  # ✅ CRUD knowledge base
    │   ├── knowledge/route.ts    # GET + POST + PUT + DELETE
    │   ├── faqs/route.ts         # GET + POST + PUT + DELETE
    │   ├── upcoming/route.ts     # ?type=products|collections — GET + POST + PUT + DELETE
    │   ├── promotions/route.ts   # GET + POST + PUT + DELETE
    │   └── leads/route.ts        # GET (list leads chatbot thu thập)
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
       │     → redirect /tai-khoan/don-hang/[code] (user login) | /don-hang/[code]?phone=... (guest)
       │     → page hiển thị badge "Chờ xác nhận" + Realtime toast khi admin confirm
       │
       └─► User upload bill
             → POST /api/orders/[code]/bank-proof (multipart FormData với file 'bill')
             → validate order.customer_phone (so với input) — chống upload hộ
             → validate file: jpeg/png/webp, max 5MB
             → upload lên bucket 'payment-bills' qua supabaseAdmin
             → bank_transfers.bill_image_url = publicUrl
             → bank_transfers.bill_uploaded_at = NOW()
             → nếu chưa có user_confirmed_at → set = NOW() + status WAITING_CONFIRM
             → response { ok, billUrl, userConfirmedAt }
             → client update local state (billUrl + billUploadedAt) → render
                thumbnail + "Đã upload lúc HH:MM DD/MM" NGAY (không đợi router.refresh)
             → button đổi text "Upload lại bill"
             → toast "Đã upload bill, admin sẽ xác nhận trong ít phút"
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

## 10.4. 🆕 Customer self-service: cancel + refund request (sprint 2026-07-23)

> **Vấn đề**: Trước đây customer muốn hủy/hoàn tiền phải gọi Zalo hoặc email admin → admin làm thủ công → chậm, không có audit trail.
> **Fix**: 2 action tự phục vụ ngay trên trang `/tai-khoan/don-hang/[code]`.

### 10.4.1. Hai action theo status

| Status đơn | Action khả dụng | Hành vi khi submit |
|---|---|---|
| `WAITING_PAYMENT` | **HỦY ĐƠN HÀNG** (button đỏ) | `status=CANCELLED`, `payment_status=FAILED`, release `inventory_locks` (ACTIVE→RELEASED), restore products (RESERVED→AVAILABLE) qua RPC `release_product_reservation`, set `bank_transfers.rejected_at + rejected_reason` (nếu BANK_TRANSFER), set `orders.customer_cancelled_at + customer_cancel_reason`. |
| `WAITING_CONFIRM`, `CONFIRMED`, `SHIPPING`, `DONE` (khi `payment_status ∈ {PAID, AWAITING_CONFIRM}`) | **YÊU CẦU HOÀN TIỀN** (button vàng) | `payment_status=REFUND_REQUESTED` (status giữ nguyên), set `orders.refund_requested_at + refund_reason`. Admin xử lý thủ công (CK lại user qua ngân hàng) → sau đó admin chuyển `payment_status=REFUNDED` qua dialog cập nhật đơn. |
| `REFUND_REQUESTED` (đã request rồi) | Banner "ĐANG CHỜ ADMIN HOÀN TIỀN" (vàng) | Không có button — chờ admin. |
| `CANCELLED`, `DONE+REFUNDED` | Không có action | — |

### 10.4.2. API

```
POST /api/orders/[code]/customer-action
Auth: requireCustomer (order.customer_id = user.id)
Body: { action: 'cancel' | 'request_refund', reason?: string }

200 → { ok: true, action, order: { status, paymentStatus } }
400 → { ok: false, error: 'INVALID_STATUS' | 'INVALID_PAYMENT_STATUS' | 'INVALID_BODY' }
401 → { ok: false, error: 'UNAUTHENTICATED' }
403 → { ok: false, error: 'FORBIDDEN' } (order thuộc user khác)
404 → { ok: false, error: 'NOT_FOUND' }
409 → { ok: false, error: 'ALREADY_REQUESTED' } (đã refund_requested rồi)
```

### 10.4.3. UI — `<CustomerActionButtons/>` ở `/tai-khoan/don-hang/[code]`

- Đặt dưới cùng của Order Summary, dưới row "THEO DÕI HÀNH TRÌNH / TẢI HÓA ĐƠN".
- Click button → mở modal overlay nhập lý do (textarea, max 500 chars, optional).
- Sau success → `toast.success(...)` + `router.refresh()` → server re-fetch order → re-render buttons theo status mới.

### 10.4.4. Migration 0021 cần apply

```sql
-- supabase/migrations/0021_customer_cancel_refund.sql
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_cancelled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS customer_cancel_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_refund_requested
  ON orders(payment_status, refund_requested_at DESC)
  WHERE payment_status = 'REFUND_REQUESTED';
```

**Lưu ý**: `ALTER TYPE ... ADD VALUE` không chạy được trong transaction block → cần apply qua Supabase SQL Editor, chạy từng câu lệnh (giống migration 0020).

### 10.4.5. Files

```
supabase/migrations/0021_customer_cancel_refund.sql
app/api/orders/[code]/customer-action/route.ts        # POST — cancel | request_refund
app/(store)/tai-khoan/don-hang/[code]/customer-action-buttons.tsx  # Client component
app/(store)/tai-khoan/don-hang/[code]/page.tsx        # Mount <CustomerActionButtons/>
lib/supabase/types.ts                                 # OrderRow + 4 audit fields + REFUND_REQUESTED
lib/order/status.ts                                   # PAYMENT_STATUS_META.REFUND_REQUESTED
```

### 10.4.6. Admin follow-up (P2)

- Admin dashboard `/admin/orders` chưa có filter "Refund requested" — nên thêm filter `payment_status=REFUND_REQUESTED` để admin xử lý nhanh (sprint sau).
- Khi admin xử lý xong (đã CK lại cho user), chỉ cần PATCH `payment_status=REFUNDED` qua dialog hiện tại — flow đã support.

---

## 10.5. 🆕 Refund flow refactor — tách bảng order_refunds (sprint 2026-07-27)

> **Vấn đề (§10.4 limitation)**: Status order chỉ có 7 enum, payment có 5 enum. Nếu muốn phân biệt "đã duyệt nhưng chưa CK", "đã CK xong", "admin từ chối" — phải thêm 3-4 enum mới → status explosion (10 + 6 enum), khó maintain state transition, dashboard filter phình to.
>
> **Quyết định thiết kế**: Tách refund lifecycle ra bảng `order_refunds` riêng. `orders.status` và `payment_status_enum` giữ nguyên — chỉ dùng 2 giá trị cũ `REFUND_REQUESTED` (PENDING state) và `REFUNDED` (khi COMPLETED). State machine đầy đủ chỉ tồn tại trong `order_refunds.state`.
>
> **🆕 Sprint 2026-07-27 buổi chiều (§10.5.11)**: Harden lifecycle — khi admin REJECTED thì `orders.payment_status` reset về `PAID` (tiền vẫn ở shop). Customer có thể retry sau REJECTED. Dashboard KPI query từ `order_refunds` thay vì mirror. Xem §10.5.11 để biết chi tiết fix customer retry bị chặn + KPI inflated.

### 10.5.1. State machine

```
                  ┌─→ APPROVED ─┬─→ COMPLETED ──── (terminal → flip orders.payment_status='REFUNDED')
                  │             │
PENDING ──────────┤             └─→ FAILED (CK lỗi, admin retry)
  │               │
  │               └─→ REJECTED (admin từ chối, customer có thể request mới)
  │
  └─→ admin mark REJECTED nếu không hợp lệ
```

### 10.5.2. Schema (`order_refunds`)

```sql
CREATE TYPE order_refund_state_enum AS ENUM (
  'PENDING',      -- customer vừa request
  'APPROVED',     -- admin duyệt, chuẩn bị CK
  'COMPLETED',    -- admin đã CK xong → orders.payment_status='REFUNDED'
  'FAILED',       -- CK lỗi, retry
  'REJECTED'      -- admin từ chối
);

CREATE TABLE order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  state order_refund_state_enum NOT NULL DEFAULT 'PENDING',
  customer_reason TEXT,
  customer_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_decision_at TIMESTAMPTZ,
  admin_decision_reason TEXT,
  refund_amount NUMERIC(12,0),
  bank_account_name VARCHAR(120),
  bank_account_number VARCHAR(20),
  bank_name VARCHAR(80),
  bill_proof_url TEXT,
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chỉ 1 ACTIVE refund per order (PENDING/APPROVED); terminal rows OK
CREATE UNIQUE INDEX one_active_refund_per_order ON order_refunds(order_id)
  WHERE state IN ('PENDING', 'APPROVED');

CREATE INDEX idx_refunds_state_pending ON order_refunds(created_at)
  WHERE state IN ('PENDING', 'APPROVED');
CREATE INDEX idx_refunds_order ON order_refunds(order_id);
```

### 10.5.3. API mới: `POST /api/admin/orders/[id]/refund`

```
Auth: requireAdmin
Body: { action, ...params }

action='approve'      → { refund_amount, bank_account_name, bank_account_number, bank_name }
                       State PENDING → APPROVED, set admin_id + admin_decision_at + bank info
action='reject'       → { reason (min 10 chars) }
                       State PENDING → REJECTED, set admin_decision_reason
action='mark_completed' → { bill_proof_url (URL to uploaded bill) }
                         State APPROVED|FAILED → COMPLETED, set completed_at + bill_proof_url
                         ALSO: orders.payment_status = 'REFUNDED', orders.updated_at = NOW()
action='mark_failed'  → { reason }
                       State APPROVED → FAILED, set failed_at + reason (admin retry sau)

Response 200: { ok: true, refund: {...} }
Response 400: INVALID_BODY / INVALID_STATE (state transition không hợp lệ)
Response 401: UNAUTHENTICATED
Response 403: FORBIDDEN
Response 404: REFUND_NOT_FOUND
Response 500: DB_ERROR
```

### 10.5.4. API cập nhật: `POST /api/orders/[code]/customer-action`

Action `request_refund` refactor:
- Validate `order.status ∈ REFUNDABLE_STATUSES` (giữ nguyên logic cũ)
- Validate payment_status PAID/AWAITING_CONFIRM (giữ nguyên)
- Check `order_refunds WHERE order_id = ? AND state IN ('PENDING','APPROVED')` → nếu tồn tại return 409 ALREADY_REQUESTED
- INSERT vào `order_refunds(state='PENDING', customer_reason, customer_requested_at)`
- CŨNG set `orders.payment_status='REFUND_REQUESTED'` (backwards-compat cho admin filter cũ + dashboard KPI)
- Return `{ ok: true, action: 'request_refund', refund: {...} }`

### 10.5.5. UI Admin: `<RefundPanel>` ở `/admin/orders/[id]`

Panel hiển thị khi order có `payment_status ∈ {REFUND_REQUESTED, REFUNDED}` hoặc có `order_refunds` row:
- State `PENDING` → badge vàng + customer_reason + SLA countdown ("Còn X giờ trước khi escalate") + 2 button "Duyệt" / "Từ chối"
- State `APPROVED` → badge xanh dương + refund_amount + bank info + 2 button "Đã CK" / "CK lỗi"
- State `COMPLETED` → badge xanh lá + timeline PENDING→APPROVED→COMPLETED + bill_proof thumbnail
- State `FAILED` → badge cam + admin_decision_reason + button "Đánh dấu CK lại" (retry)
- State `REJECTED` → badge xám + admin_decision_reason + info "khách có thể gửi yêu cầu mới"

### 10.5.6. UI Customer: `<RefundStateBanner>` ở `/tai-khoan/don-hang/[code]`

Thay banner đơn giản "ĐANG CHỜ ADMIN HOÀN TIỀN" bằng dynamic banner:
- `PENDING` → "Đã gửi yêu cầu — admin sẽ duyệt trong 24h"
- `APPROVED` → "Admin đã duyệt — sẽ CK trong 1-3 ngày làm việc" + refund_amount
- `COMPLETED` → "Đã hoàn tiền [amount] lúc [timestamp]" + bill_proof link
- `FAILED` → "CK lỗi — admin đang retry"
- `REJECTED` → "Admin từ chối — [lý do]" + button "GỬI YÊU CẦU MỚI" (cho phép retry)

### 10.5.7. Cron SLA escalation (`0024_refund_sla_cron.sql`)

- `escalate-stale-pending-refunds` (mỗi 4h): refund PENDING > 24h → auto-mark `admin_decision_reason = 'AUTO_ESCALATED: SLA exceeded'`. Admin thấy qua query admin/orders filter. Phase 2 sẽ tích hợp Supabase Realtime để push toast lên dashboard.
- `archive-old-refund-records` (03:00 daily): DELETE refund COMPLETED/REJECTED/FAILED > 6 tháng. Giữ audit ngắn hạn, không phình DB.

### 10.5.8. Files

```
supabase/migrations/0023_order_refunds.sql          # NEW — table + enum + indexes + backfill
supabase/migrations/0024_refund_sla_cron.sql        # NEW — 2 cron jobs (escalate + archive)
app/api/admin/orders/[id]/refund/route.ts          # NEW — 4 admin actions
app/api/orders/[code]/customer-action/route.ts     # MODIFIED — request_refund INSERT order_refunds
app/(admin)/admin/orders/[id]/page.tsx              # MODIFIED — fetch latest refund + mount <RefundPanel/>
components/admin/orders/refund-panel.tsx            # NEW — 5-state admin UI + 4 modals
app/(store)/tai-khoan/don-hang/[code]/page.tsx      # MODIFIED — fetch latestRefund + pass to <CustomerActionButtons/>
app/(store)/tai-khoan/don-hang/[code]/customer-action-buttons.tsx  # MODIFIED — <RefundStateBanner/> dynamic theo state
lib/supabase/types.ts                               # MODIFIED — OrderRefundRow + order_refunds Tables entry + OrderRefundState
lib/types/account.ts                                # MODIFIED — export OrderRefund alias
```

### 10.5.9. Backfill caveats (sprint 2026-07-23 data)

Migration 0023 backfill `INSERT ... SELECT FROM orders WHERE refund_requested_at IS NOT NULL` — tuy nhiên:
- Orders có `payment_status='REFUNDED'` (admin đã CK qua flow cũ) sẽ bị mark PENDING → sai history. Phase 2 admin cleanup script sẽ `UPDATE order_refunds SET state='COMPLETED' WHERE order_id IN (SELECT id FROM orders WHERE payment_status='REFUNDED')`.
- Orders có `status='CANCELLED'` + `refund_requested_at IS NOT NULL` (data inconsistency) → backfill tạo PENDING row không active khác. Cleanup: `UPDATE order_refunds SET state='REJECTED', admin_decision_reason='order was already CANCELLED' WHERE order_id IN (SELECT id FROM orders WHERE status='CANCELLED')`.

### 10.5.10. Order retention tier (DEFERRED Phase 2)

User hỏi về "đơn tồn tại trong user bao nhiêu ngày cho chuẩn business lên plan excellent":
- **Standard tier** (mặc định, free): giữ 24 tháng (2 năm) — đủ cho thuế VN + kiểm toán.
- **Excellent tier** (đề xuất, premium): giữ 5 năm — cho phép truy vết dispute với NH/VNPost/thuế năm+1.
- **Premium tier** (tương lai): vĩnh viễn read-only — dispute pháp lý dài hạn.

Implementation defer Phase 2 vì cần:
- Thêm `order_retention_tier` enum + `archived_at` field (migration)
- pg_cron daily 02:00 mark `archived_at=NOW()` cho orders > retention period
- pg_cron yearly hard-delete cho STANDARD tier > 5 năm
- Admin UI checkbox "Hiển thị đơn cũ"
- Cost estimate Supabase storage 5 năm

### 10.5.11. Refund flow harden — payment_status reset khi REJECTED (sprint 2026-07-27 buổi chiều)

> **Vấn đề (§10.5.1-10.5.4 limitation)**: Khi admin REJECTED refund, `orders.payment_status` vẫn `REFUND_REQUESTED` (chỉ update `order_refunds.state='REJECTED'`). Hệ quả:
>
> 1. **Customer không retry được** — API customer-action check `payment_status === 'REFUND_REQUESTED'` ở line 230 trước khi check `order_refunds` → trả `409 ALREADY_REQUESTED` dù admin đã REJECTED.
> 2. **Dashboard KPI inflated** — `pendingRefundRequests` đếm orders có `payment_status='REFUND_REQUESTED'` bao gồm cả REJECTED (admin đã xử lý xong).
> 3. **Customer UI mismatch** — chip payment hiển thị "Yêu cầu hoàn tiền" dù admin đã từ chối.
>
> **Fix**: Cờ "refund lifecycle" (PENDING/APPROVED/FAILED/COMPLETED/REJECTED) thuộc về bảng `order_refunds`. Cờ `orders.payment_status` chỉ nên phản ánh **trạng thái tiền tệ** (PAID = shop đang giữ tiền; REFUNDED = shop đã trả lại; FAILED = chưa nhận).

#### 10.5.11.1. Quy tắc mới — `orders.payment_status` lifecycle

| Hành động | `orders.payment_status` | `order_refunds.state` |
|---|---|---|
| Order mới (COD/BANK) | `PENDING` → `PAID` (admin confirm) | — |
| Customer request refund | `PAID` → `REFUND_REQUESTED` | INSERT PENDING |
| Admin APPROVED | giữ `REFUND_REQUESTED` | PENDING → APPROVED |
| **Admin REJECTED** | **`REFUND_REQUESTED` → `PAID` (reset)** | PENDING → REJECTED |
| Admin mark_completed | `REFUND_REQUESTED` → `REFUNDED` | APPROVED\|FAILED → COMPLETED |
| Admin mark_failed | giữ `REFUND_REQUESTED` | APPROVED → FAILED |

> **Key insight**: `orders.payment_status` chỉ flip `REFUND_REQUESTED` → `PAID` khi admin REJECTED (tiền vẫn ở shop). Ngược lại, khi admin APPROVED/MARK_COMPLETED thì giữ `REFUND_REQUESTED` cho tới khi COMPLETED mới flip `REFUNDED`.

#### 10.5.11.2. Fix customer route `request_refund`

**File**: `app/api/orders/[code]/customer-action/route.ts` line 230-242.

**Trước**:
```ts
if (order.payment_status === 'REFUND_REQUESTED') {
  return NextResponse.json({ error: 'ALREADY_REQUESTED', ... }, { status: 409 });
}
```

**Sau**: bỏ block. Chỉ check `payment_status ∈ {PAID, AWAITING_CONFIRM}` (line 243) + query `order_refunds` active (line 256). Lý do:
- `orders.payment_status` là **mirror** cho admin filters, có thể lệch.
- Source of truth cho "đã có refund active chưa" = bảng `order_refunds` (xem §10.5.4).
- Check legacy mirror đôi khi chặn nhầm flow hợp lệ (retry sau REJECTED).

**Edge cases handled**:
| Scenario | `payment_status` | `order_refunds.state` | Kết quả API |
|---|---|---|---|
| Request lần 1 | `PAID` | (none) | 200, INSERT PENDING |
| Request lần 2 (trong khi PENDING) | `REFUND_REQUESTED` | `PENDING` | 400 INVALID_PAYMENT_STATUS (guard nhờ check PAID) |
| Request lại sau REJECTED | `PAID` (sau fix) | `REJECTED` | 200, INSERT PENDING mới |
| Race 2 request cùng lúc | bất kỳ | (none) → INSERT PENDING → INSERT PENDING fail | 23505 → 409 ALREADY_REQUESTED |

#### 10.5.11.3. Fix admin route action `reject`

**File**: `app/api/admin/orders/[id]/refund/route.ts` line 217-247.

Thêm UPDATE `orders` SAU khi UPDATE `order_refunds` thành công:

```ts
const { error: orderUpErr } = await db
  .from('orders')
  .update({
    payment_status: 'PAID',
    refund_requested_at: null,
    refund_reason: null,
    updated_at: now,
  })
  .eq('id', orderId);

// Nếu fail → KHÔNG rollback refund (admin đã chốt quyết định).
// Log + trả 500 để admin xử lý tay.
```

Cũng clear `refund_requested_at` + `refund_reason` (legacy columns từ migration 0021) để customer retry không bị nhầm data cũ.

#### 10.5.11.4. Fix dashboard KPI source

**File**: `lib/analytics/dashboard.ts` line ~180-194.

**Trước**:
```ts
sb.from('orders').select('id', { count: 'exact', head: true })
  .eq('payment_status', 'REFUND_REQUESTED');
```

**Sau**:
```ts
sb.from('order_refunds').select('id', { count: 'exact', head: true })
  .in('state', ['PENDING', 'APPROVED', 'FAILED']);
```

`PENDING` + `APPROVED` + `FAILED` là 3 state admin cần action. `COMPLETED` (đã CK xong) + `REJECTED` (đã chốt từ chối) → không tính.

#### 10.5.11.5. Fix customer UI chip payment

**File**: `app/(store)/tai-khoan/don-hang/[code]/page.tsx` line 78-104.

Thêm override logic khi `latestRefund.state` khác null:

| `latestRefund.state` | Chip label | Tone |
|---|---|---|
| `null` (no refund) | `paymentMeta.label` (gốc) | gốc |
| `PENDING` / `APPROVED` / `FAILED` | "Đang yêu cầu hoàn tiền" | `text-warning` + `amber` dot |
| `COMPLETED` | `paymentMeta.label` (gốc = REFUNDED) | gốc (success/green) |
| `REJECTED` | "Đã thanh toán · Hoàn tiền bị từ chối" | `text-warning` + `amber` dot |

Trước fix: customer thấy chip "Yêu cầu hoàn tiền" (amber) khi admin REJECTED → confuse. Sau fix: chip truyền đạt đúng trạng thái (refund đang xử lý, hoặc đã bị từ chối, hoặc đã hoàn xong).

#### 10.5.11.6. Files đã sửa (sprint 2026-07-27 buổi chiều)

```
app/api/orders/[code]/customer-action/route.ts          # MODIFIED — bỏ check legacy mirror
app/api/admin/orders/[id]/refund/route.ts                # MODIFIED — action reject reset payment_status
lib/analytics/dashboard.ts                               # MODIFIED — pendingRefundRequests query từ order_refunds
app/(store)/tai-khoan/don-hang/[code]/page.tsx          # MODIFIED — chip override theo latestRefund.state
```

#### 10.5.11.7. Backfill script (nếu có prod data cũ)

Nếu production đã có orders có refund REJECTED (admin dùng API cũ trước fix) + `orders.payment_status='REFUND_REQUESTED'`:

```sql
-- Reset payment_status về PAID cho orders có refund REJECTED
UPDATE orders o
SET payment_status = 'PAID',
    refund_requested_at = NULL,
    refund_reason = NULL,
    updated_at = NOW()
WHERE id IN (
  SELECT order_id FROM order_refunds
  WHERE state = 'REJECTED'
  GROUP BY order_id
  HAVING MAX(created_at) > NOW() - INTERVAL '30 days'  -- chỉ cleanup gần đây
);
-- Verify
SELECT o.code, o.payment_status, r.state, r.created_at
FROM orders o
JOIN order_refunds r ON r.order_id = o.id
WHERE r.state = 'REJECTED'
ORDER BY r.created_at DESC LIMIT 20;
```

Không cần backfill cho orders có refund APPROVED/COMPLETED/FAILED — payment_status của họ vẫn `REFUND_REQUESTED` (chờ COMPLETED mới flip `REFUNDED`), đúng intent.

---

## 10.6. Admin orders filter — URL ↔ state sync (sprint 2026-07-27 buổi chiều)

> **Vấn đề**: Trước fix, admin vào URL `localhost:3000/admin/orders?status=NEW` (vd click từ alert link dashboard `?paymentStatus=REFUND_REQUESTED`) → filter dropdown hiển thị "Tất cả trạng thái" rỗng, search box rỗng. Nguyên nhân: state khởi tạo `useState('')` hard-code, không đọc URL.

### 10.6.1. Design choice — URL là source of truth

| Action | URL update? |
|---|---|
| Mount page | State init từ `searchParams` (validate enum) |
| User chọn filter | State → URL qua `router.replace()` (không push — tránh phình history) |
| User back/forward | URL → State qua effect riêng |
| Click "Xoá lọc" | Reset state + `router.replace('/admin/orders')` |

### 10.6.2. Implementation — `app/(admin)/admin/orders/page.tsx`

**Wrap `<Suspense>` bắt buộc**: Next.js 14+ App Router yêu cầu `useSearchParams()` phải nằm trong component được wrap `<Suspense>`. Tách:

```tsx
export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ... logic với state sync URL
}
```

### 10.6.3. Init state từ URL

```tsx
const initialStatus = ((): OrderStatus | '' => {
  const v = searchParams.get('status');
  if (v && ORDER_STATUSES.includes(v as OrderStatus)) return v as OrderStatus;
  return '';
})();
const initialPaymentStatus = ((): PaymentStatus | '' => {
  const v = searchParams.get('paymentStatus');
  if (v && PAYMENT_STATUSES.includes(v as PaymentStatus)) return v as PaymentStatus;
  return '';
})();
const initialQ = searchParams.get('q') ?? '';
const initialPage = (() => {
  const v = parseInt(searchParams.get('page') ?? '1', 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
})();
```

Validate enum ngăn URL invalid (`?status=foo`) crash UI — fallback về rỗng.

### 10.6.4. 2 useEffect sync

```tsx
// State → URL: khi user đổi filter/page
useEffect(() => {
  const next = new URLSearchParams();
  if (q.trim()) next.set('q', q.trim());
  if (status) next.set('status', status);
  if (paymentStatus) next.set('paymentStatus', paymentStatus);
  if (page > 1) next.set('page', String(page));
  const target = next.toString();
  const current = searchParams.toString();
  if (target !== current) {
    router.replace(`/admin/orders${target ? `?${target}` : ''}`, { scroll: false });
  }
}, [q, status, paymentStatus, page]);

// URL → State: khi user back/forward
useEffect(() => {
  const urlQ = searchParams.get('q') ?? '';
  const urlStatus = ...;
  const urlPayment = ...;
  const urlPage = ...;
  if (urlQ !== q) setQ(urlQ);
  if (urlStatus !== status) setStatus(urlStatus);
  if (urlPayment !== paymentStatus) setPaymentStatus(urlPayment);
  if (urlPage !== page) setPage(urlPage);
}, [searchParams]);
```

**Loop prevention**: 2 effect check `target === current` / `urlX !== x` trước khi push — terminate sau 1 cycle.

### 10.6.5. Risk check

| Risk | Mitigation |
|---|---|
| 2 useEffect loop vô hạn | `if (target !== current)` skip khi URL đã match; `if (urlX !== x)` skip setState khi giống |
| User gõ search + back/forward | URL→State effect sync, debounce cũ 350ms cancel qua cleanup |
| Invalid query param (`?status=foo`) | Validate enum → fallback rỗng, không crash |
| URL order canonicalization | `?status=NEW&q=foo` → effect 1 rewrite thành `?q=foo&status=NEW` (1 lần). Harmless. |

### 10.6.6. Files đã sửa

```
app/(admin)/admin/orders/page.tsx          # MODIFIED — wrap Suspense + 2 useEffect sync URL
```

### 10.6.7. Test matrix (verified 2026-07-27)

| Scenario | Result |
|---|---|
| Visit `?status=NEW` | Dropdown auto-select NEW ✅ |
| Select "WAITING_CONFIRM" | URL update → `?status=WAITING_CONFIRM` ✅ |
| Type "EV-2026" in search | URL update (debounced 350ms) + page reset 1 ✅ |
| Click "Xoá lọc" | State reset + URL `/admin/orders` ✅ |
| Visit `?status=foo` | Validate enum → dropdown rỗng (no crash) ✅ |
| Browser back/forward | State sync theo URL ✅ |

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

> **Status**: ✅ DONE (2026-07-20) core — pgvector + chat tables + match_products + embed trigger + /api/chat + 7 components + use-chat-session.
> ✅ **Knowledge Base extension DONE 2026-07-21** — 5 bảng DB mới (chat_knowledge/chat_faqs/upcoming_products/upcoming_collections/chat_promotions) + 5 tools mới (getKnowledge/getFaq/getUpcomingProducts/getUpcomingCollections/getActivePromotions) + 1 tool captureLead + 1 static file (SHOP_INFO + STATIC_FAQS) + admin CRUD UI ở `/admin/chatbot` (5 tabs) + leads list + sidebar menu. Xem §15.17.

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

### 15.17. Knowledge Base (sprint 2026-07-21)

> **Mục tiêu**: mở rộng chatbot từ "tư vấn sản phẩm trong DB" thành **trợ lý toàn diện của shop** — trả lời chính sách, FAQ, sản phẩm/BST sắp ra mắt, mã giảm giá, capture lead khi khách để lại SĐT/email. Admin CRUD toàn bộ qua UI `/admin/chatbot` (5 tabs).

#### 15.17.1. Kiến trúc 3 tầng

```
[Tầng 1 — STATIC: lib/chatbot/static-knowledge.ts]
   SHOP_INFO { address, contact, hours, payment, shipping, warranty, returnPolicy, care, sizing }
   STATIC_FAQS[]: 12 cặp Q&A tiếng Việt (giới thiệu, ship, đổi trả, bảo hành, bảo quản bạc/vàng/ngọc, size...)
   STATIC_KNOWLEDGE[]: 10 mục chính sách shop (about/shipping/warranty/return/payment/care/contact/size)
   findStaticFaqByKeyword(text): match keyword scoring
   → Ship ngay trong code, không cần apply DB. Dùng làm fallback khi DB trống.

[Tầng 2 — DYNAMIC DB: supabase/migrations/0016_chatbot_knowledge.sql]
   chat_knowledge           — chính sách / info có cấu trúc (category, title, content, keywords[], priority, is_published, embedding 768)
   chat_faqs                — Q&A cứng (question, answer, keywords[], category, display_order, view_count, embedding 768)
   upcoming_products        — sp sắp ra mắt (title, slug, short_pitch, estimated_price, material, category, cover_image_url, expected_launch_date, notify_enabled, is_announced)
   upcoming_collections     — BST sắp ra mắt (name, slug, description, theme, teaser_note, expected_launch_date, is_announced)
   chat_promotions          — KM đang chạy (title, code, discount_type [percent|fixed|shipping|gift], discount_value, min_order_value, applicable_categories[], valid_from, valid_until, is_active)
   chat_leads (migration 0015) — SĐT/email/Zalo thu thập từ chatbot (session_id, user_id, contact_type, contact_value, intent, matched_product_id)

[Tầng 3 — TOOLS: lib/chatbot/tools.ts (mở rộng 2026-07-21)]
   searchProducts / semanticSearch / getProductDetail / getCurrentCollections    (sprint 1)
   getRelatedProducts / getFeaturedProducts / captureLead                        (sprint 2026-07-20)
   getKnowledge / getFaq / getUpcomingProducts / getUpcomingCollections / getActivePromotions  (sprint 2026-07-21)
   → Tổng 11 tools. Multi-provider chain (groq → gemini → openai), auto-fallback.

[Seed: supabase/migrations/0017_chatbot_seed.sql]
   10 knowledge items (about/shipping/warranty/return/payment/care/contact/size × 1-2 mỗi loại)
   8 FAQs (giới thiệu, ship time, ship fee, COD, bạc xỉn, cửa hàng, size, chính hãng)
   3 upcoming_products (Sakura Opal, Moonstone Vintage, Pearl Drop 2026 — tháng 8/9/10/2026)
   2 upcoming_collections (Sakura Whisper 2026, Mid-Autumn Moon 2026)
   3 promotions (WELCOME10, FREESHIP, quà tặng ngọc trai)
   → Idempotent: dùng WHERE NOT EXISTS, an toàn re-apply.
```

#### 15.17.2. Routing tool theo intent (trong SYSTEM_PROMPT)

System prompt (lib/chatbot/system-prompt.ts) đã được cập nhật với routing rõ ràng:

| Intent khách hỏi | Tool bắt buộc |
|---|---|
| Sản phẩm hiện có (tên, category, material, price) | `searchProducts` / `semanticSearch` / `getFeaturedProducts` |
| Chi tiết 1 sản phẩm | `getProductDetail` |
| Sản phẩm liên quan | `getRelatedProducts` |
| BST đang published | `getCurrentCollections` |
| **Sản phẩm/BST sắp ra mắt** | `getUpcomingProducts` / `getUpcomingCollections` |
| **Chính sách shop** (bảo hành/đổi trả/ship/payment/about/contact/care/size) | `getKnowledge({category})` hoặc `getFaq({query})` |
| **Mã giảm giá / KM** | `getActivePromotions({minOrderValue, category})` |
| Khách cung cấp SĐT/email/Zalo | `captureLead({contactType, contactValue, intent, productId})` |

**Quy tắc BẮT BUỘC mới** (so với §15.8):
- KHÔNG bịa tên/giá/chính sách. LUÔN dùng tool tương ứng.
- Câu hỏi về SẮP TỚI → KHÔNG được nói "chưa có thông tin" nếu có data.
- Câu hỏi về KM → chỉ đề xuất khi phù hợp (đơn đạt min_order_value hoặc category trùng), KHÔNG bịa mã.
- Khi searchProducts trả [] → retry 3 lần (filter rộng hơn → price ±30% → bỏ keyword), cuối cùng dùng getFeaturedProducts.
- Khi khách cung cấp SĐT/email → BẮT BUỘC gọi captureLead với intent mô tả sp họ quan tâm.

#### 15.17.3. Lead capture flow

```
[Khách: "Cho mình để lại SĐT 0903123456 để báo khi có hàng nhé"]
[Model gọi captureLead(contactType='phone', contactValue='0903123456', intent='Nhẫn bạc 925 dưới 2 triệu', productId=...)]
   ↓
[Tool insert vào chat_leads với sessionId, userId từ experimental_context]
   ↓
[Response { ok: true, leadId: '...' }]
   ↓
[Model trả lời: "Cảm ơn em, Bà Chủ đã ghi nhận..."]
   ↓
[Admin vào /admin/chatbot → tab Leads thấy lead mới + intent + thời gian]
```

**Context propagation**: `app/api/chat/route.ts` truyền `experimental_context: { sessionId, userId }` cho streamText → tool `captureLead` đọc từ `options.experimental_context`.

**Lead lưu trong DB** (`chat_leads`):
- `session_id` (FK chat_sessions) — link ngược được conversation context
- `user_id` (FK auth.users) — nếu khách đang login
- `contact_type` ('phone' | 'email' | 'zalo')
- `contact_value` (giá trị)
- `intent` (mô tả sp khách quan tâm)
- `matched_product_id` (FK products — nếu lead gắn với sp cụ thể)
- `created_at`

#### 15.17.4. Admin UI (`/admin/chatbot`)

> `app/(admin)/admin/chatbot/page.tsx` — 1 page với 5 tabs, dùng fetch + AdminClient thuần (no SWR/React Query để giữ dependency nhỏ).

```
[Tabs]
├── Knowledge     — list + create/edit/delete (category, title, content, keywords, priority, is_published)
├── FAQ           — list + create/edit/delete (question, answer, keywords, category, display_order, is_published)
├── Sắp ra mắt    — sub-tabs Sản phẩm/BST (title, slug, short_pitch, est_price, material, category, launch_date, is_announced, notify_enabled)
├── Khuyến mãi    — list + create/edit/delete (title, code, type, value, min_order, categories, valid_from/until, is_active)
└── Leads         — read-only table (contact_type, contact_value, intent, created_at)
```

**Sidebar menu**: thêm "Chatbot" (icon `Bot`) trong `components/layout/admin-nav-config.tsx`, đặt sau Newsletter, trước Analytics.

**Auth**: tất cả `/api/admin/chatbot/*` đều `requireAdmin()` (middleware check `role === 'admin'`).

**UX**:
- Edit form hiển thị inline, không cần modal riêng.
- `ConfirmDialog` xác nhận trước khi xóa.
- Toast `success`/`error` thông báo lưu/xóa.
- `is_published = false` → render badge "DRAFT" đỏ. `is_announced = false` → "HIDDEN" (chatbot không trả lời).

#### 15.17.5. RLS cho knowledge base tables

```
chat_knowledge        — anon read WHERE is_published; service_role full
chat_faqs             — anon read WHERE is_published; service_role full
upcoming_products     — anon read WHERE is_announced; service_role full
upcoming_collections  — anon read WHERE is_announced; service_role full
chat_promotions       — anon read WHERE is_active; service_role full
chat_leads            — service_role only (admin qua API)
```

Tools chatbot dùng `createAdminClient()` (service_role) nên bypass RLS, filter theo `is_published` / `is_announced` / `is_active` ở WHERE clause.

#### 15.17.6. Files mới / sửa (sprint 2026-07-21)

**Mới (12 file)**:
```
supabase/migrations/0015_chat_leads.sql
supabase/migrations/0016_chatbot_knowledge.sql
supabase/migrations/0017_chatbot_seed.sql
lib/chatbot/static-knowledge.ts
components/chatbot/chat-collection-card.tsx
app/(admin)/admin/chatbot/page.tsx
app/api/admin/chatbot/knowledge/route.ts
app/api/admin/chatbot/faqs/route.ts
app/api/admin/chatbot/upcoming/route.ts
app/api/admin/chatbot/promotions/route.ts
app/api/admin/chatbot/leads/route.ts
```

**Sửa (5 file)**:
```
lib/chatbot/tools.ts                        # +5 tools (getKnowledge/getFaq/getUpcomingProducts/getUpcomingCollections/getActivePromotions), captureLead dùng experimental_context
lib/chatbot/system-prompt.ts                # Routing 11 tools, rules cho upcoming/promotions/policies
app/api/chat/route.ts                       # stopWhen=stepCountIs(4), experimental_context={sessionId, userId}
components/chatbot/chat-message.tsx         # Filter toolCollections (id+slug+cover_image_url), defensive card render
components/chatbot/chat-widget.tsx          # Capture lead fallback text, getProductDetail single-object handling, khi groq finishReason=tool-calls không sinh text → synthetic fallback theo tool output
components/layout/admin-nav-config.tsx       # +1 item { id:'chatbot', href:'/admin/chatbot', icon:'Bot' }
components/layout/admin-sidebar.tsx          # +import Bot, +map ICONS
```

#### 15.17.7. Apply migrations

Thứ tự áp dụng (mỗi migration idempotent, có thể chạy nhiều lần):
1. `0015_chat_leads.sql` — bảng chat_leads (sprint trước đã có trong code, cần apply DB).
2. `0016_chatbot_knowledge.sql` — 5 bảng KB + RLS + indexes + updated_at trigger.
3. `0017_chatbot_seed.sql` — 10 knowledge + 8 FAQ + 3 upcoming products + 2 upcoming collections + 3 promotions (idempotent).

Verify: `SELECT count(*) FROM chat_knowledge;` → ≥ 10. `SELECT count(*) FROM chat_promotions WHERE is_active;` → 3.

#### 15.17.8. Use case cụ thể sau sprint này

| Khách hỏi | Luồng xử lý |
|---|---|
| "Bao lâu ship về Hà Nội?" | Model gọi `getKnowledge({category:'shipping'})` → trả lời từ DB: "2-4 ngày, nội thành HCM 24h" |
| "Có sản phẩm nào sắp ra mắt?" | Model gọi `getUpcomingProducts()` → list 3 sp với ngày ra mắt, mời để lại SĐT |
| "BST Trung Thu năm nay có gì?" | Model gọi `getUpcomingCollections()` → "Mid-Autumn Moon 2026 — BST Trung Thu, ra mắt 20/09/2026" + teaser_note |
| "Có mã giảm giá gì không?" | Model gọi `getActivePromotions()` → "WELCOME10 giảm 10% đơn từ 3 triệu, FREESHIP đơn từ 1 triệu" |
| "Bạc bị xỉn làm sao?" | Model gọi `getKnowledge({category:'care'})` + `getFaq({query:'bạc xỉn'})` → tư vấn + miễn phí đánh bóng tại shop |
| "Cho mình SĐT 0903123654" | Model gọi `captureLead({contactType:'phone', contactValue:'0903123654', intent:'...'})` → lưu + cảm ơn |
| "Mệnh Kim đeo gì hợp?" | Model gọi `getFaq({query:'mệnh kim'})` → "Bạc, vàng trắng, đá đen" + gợi ý searchProducts({material:BAC_925}) |
| "Có nhẫn bạc 925 dưới 2 triệu không?" | Model gọi `searchProducts({material:'BAC_925', maxPrice:2000000, category:'NHAN'})` → list sản phẩm |
| "Tìm BST mùa hè 2026" | Model gọi `getCurrentCollections()` (hiện tại) + nếu khách hỏi tương lai → `getUpcomingCollections()` |

### 15.18. Suggested Answers + Cluster Analytics (sprint 2026-07-22)

> **Mục tiêu**: thay thế phần "hard-code chính sách trong system prompt" bằng workflow data-driven — admin đọc câu hỏi thật của khách (cluster) → viết mẫu trả lời → model tự động gọi tool `getSuggestedAnswers` trước khi trả lời. Kèm fix production: multi-provider rate-limit cooldown (Groq/OpenRouter/Cerebras/Cloudflare 429/STREAM_TIMEOUT → skip N giây thay vì waste 25s timeout mỗi request).

#### 15.18.1. Schema bổ sung (`supabase/migrations/0019_chat_suggested_answers.sql`)

```sql
CREATE TABLE chat_suggested_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(30) NOT NULL,                          -- shipping/return/warranty/payment/about/contact/care/size/general/product/other
  title VARCHAR(200) NOT NULL,                            -- tiêu đề ngắn cho admin
  content TEXT NOT NULL,                                  -- câu trả lời mẫu
  trigger_keywords TEXT[] DEFAULT '{}',                   -- keyword để match nhanh
  source_question_cluster TEXT,                           -- text gốc từ cluster (trace nguồn)
  priority INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_chat_suggested_answers_category CHECK (...11 enum...)
);
-- 3 index: category composite, published composite, GIN trên trigger_keywords
-- Trigger auto-update updated_at (function trg_set_updated_at, dùng lại được cho bảng khác)
-- RLS: service_role only
```

#### 15.18.2. RPC `get_user_question_clusters(p_days, p_limit, p_min_length)`

Gom cụm câu hỏi user thật bằng text-similarity đơn giản. Pipeline normalize:
```
lowercase → translate (bỏ dấu tiếng Việt) → bỏ punctuation → collapse whitespace → trim
```
→ GROUP BY `normalized_text` → ORDER BY ask_count DESC, last_asked_at DESC. Kết quả "ship hàng" / "Ship hang" / "SHIP hàng" cluster vào cùng 1 group. Trả về `normalized_text, sample_text (raw gốc mới nhất), ask_count, unique_sessions, last_asked_at`.

#### 15.18.3. Tool `getSuggestedAnswers(category?, query?, limit=3)`

Trong `lib/chatbot/tools.ts`, đăng ký vào `allTools` (tổng 12 tools). Query `chat_suggested_answers` filter `is_published=true`, optional category, optional OR-filter trên `title.ilike / content.ilike / trigger_keywords.cs`. Wrap `cachedToolCall` + `logToolCall` giống các tool khác.

**Routing trong system prompt** (1 dòng thêm vào `lib/chatbot/system-prompt.ts`, ngay sau `getKnowledge`):
> "Ưu tiên gọi `getSuggestedAnswers` TRƯỚC `getKnowledge` khi khách hỏi về ship/đổi trả/bảo hành/thanh toán/liên hệ/size/care để trả lời chính xác theo ý shop."

#### 15.18.4. Admin UI — 2 tab mới trong `/admin/chatbot`

Cùng file `app/(admin)/admin/chatbot/page.tsx`, thêm 2 tab value vào `Tab` union: `'analytics' | 'suggested-answers'`. Tổng cộng `/admin/chatbot` giờ có 7 tabs.

**Tab "Phân tích"**:
- 4 SummaryCard: Tổng tool calls / Tổng sessions / Tổng errors / Max p95 latency (aggregate từ `getAnalyticsSummary`).
- Bảng Top tools: tool_name, total, success% (CSS bar), avg_latency, p95.
- **Top clusters** (data mới từ RPC `get_user_question_clusters`): mỗi cluster row hiển thị `sample_text` + badge `ask_count` + `unique_sessions` + relative time + nút **"Tạo mẫu trả lời"** → cross-tab navigation sang `suggested-answers` với form pre-fill.
- Failed calls list (`getFailedCalls`).
- Day filter dropdown: 1 / 7 / 30 ngày.

**Tab "Mẫu trả lời"**:
- Form tạo/sửa: category (select enum 11 giá trị), title, content, trigger_keywords (chip input), priority, is_published toggle, source_question_cluster (auto-fill khi từ cluster).
- List có inline edit, delete (ConfirmDialog), expand content, badge "Từ câu hỏi: '<text>'" khi có `source_question_cluster`.
- Cross-tab navigation dùng `window.dispatchEvent('chatbot-prefill')` để pass cluster data giữa 2 tab.

#### 15.18.5. Admin API

- `GET/POST/PUT/DELETE /api/admin/chatbot/suggested-answers` — Zod validate + `requireAdmin()`.
- `GET /api/admin/chatbot/clusters?days&limit&minLength` — read-only, trả `{ clusters, suggestedAnswers, meta }` (parallel fetch).
- Tất cả response shape `{ ok, data }` / `{ ok, error, message }`.

#### 15.18.6. Multi-provider rate-limit cooldown (production fix)

Trong `lib/chatbot/client.ts`:
- Module state `_rateLimitCooldowns: Map<provider, cooldownUntilMs>`.
- 3 helper: `isProviderAvailable`, `markProviderRateLimited`, `getCooldownInfo`.
- `getChatModelChain()` skip provider đang cooldown ở cả 2 loop (CHAT_PROVIDERS env + fallbackOrder).

Trong `app/api/chat/route.ts`:
- Biến `lastStreamErrorMsg` capture message gốc từ `streamText.onError` (thường có "Rate limit reached... try again in 26.94s" mà race `consumeStream` timeout không lộ ra).
- Catch block: check `RATE_LIMIT_RE` (regex match `rate limit|429|tokens per minute|tpm|quota|too many requests|try again in`) → gọi `markProviderRateLimited(provider, msg)`.
- Parse "try again in X.XXs" → set cooldown chính xác (cộng buffer 2s); fallback 60s.
- Empty chain + có cooldowns → trả `503 ALL_PROVIDERS_COOLDOWN` với payload `cooldowns: { groq: 27, ... }` thay vì `NO_PROVIDER`.

#### 15.18.7. Files mới / sửa (sprint 2026-07-22)

**Mới (3 file)**:
```
supabase/migrations/0019_chat_suggested_answers.sql
app/api/admin/chatbot/suggested-answers/route.ts
app/api/admin/chatbot/clusters/route.ts
```

**Sửa (3 file)**:
```
lib/chatbot/tools.ts                       # +1 tool getSuggestedAnswers, +1 entry allTools
lib/chatbot/analytics.ts                   # +1 helper getUserQuestionClusters + UserQuestionClusterRow
lib/chatbot/client.ts                      # +3 helper + skip cooldown trong getChatModelChain
lib/chatbot/system-prompt.ts               # +1 dòng về getSuggestedAnswers
app/api/chat/route.ts                      # +lastStreamErrorMsg + RATE_LIMIT_RE + markProviderRateLimited + ALL_PROVIDERS_COOLDOWN
app/(admin)/admin/chatbot/page.tsx         # +2 tab (analytics, suggested-answers) + AnalyticsTab + SuggestedAnswersTab + SummaryCard
```

#### 15.18.8. Flow end-to-end (1 cycle admin)

1. Khách hỏi "ship bao lâu" → insert `chat_messages` (role='user', content='ship bao lâu').
2. Admin mở `/admin/chatbot?tab=analytics` → thấy cluster `ship bao lâu` với `ask_count=12`, `unique_sessions=10`.
3. Click **"Tạo mẫu trả lời"** → switch sang tab `suggested-answers`, form pre-fill `title="Ship bao lâu"`, `trigger_keywords=["ship","lâu"]`, `source_question_cluster="ship bao lâu"`.
4. Admin soạn nội dung, `is_published=true`, save → row mới trong `chat_suggested_answers`.
5. Lần sau khách hỏi tương tự → model gọi `getSuggestedAnswers({ category: 'shipping' })` → lấy mẫu → trả lời đúng nội dung admin soạn (không cần sửa code).

#### 15.18.9. Use case mở rộng

| Tình huống | Behavior |
|---|---|
| Groq 429 với "try again in 27s" | `markProviderRateLimited('groq', msg)` → cooldown 29s. Request kế tiếp: chain bỏ qua groq, bắt đầu từ openrouter. Sau 29s groq tự động được thử lại. |
| Tất cả provider đều cooldown | `503 ALL_PROVIDERS_COOLDOWN` với `cooldowns` map → client hiển thị retry sau vài chục giây. |
| Admin thêm mẫu `is_published=false` | Tool filter `is_published=true` → không lộ ra ngoài. Admin có thể draft trước khi publish. |
| Cluster có 1 ask duy nhất | Vẫn hiển thị trong dashboard (không cần threshold), admin tự quyết định có viết mẫu hay không. |

#### 15.18.10. Apply migration

```bash
psql -f supabase/migrations/0019_chat_suggested_answers.sql
# hoặc paste vào Supabase Dashboard → SQL Editor
```

Idempotent. Không cần env mới.

---

### 15.19. Tool Cache + Analytics Tracking + Sidebar Widget + Cache Invalidation (sprint 2026-07-22 buổi chiều)

> **Mục tiêu**: giảm tải DB khi cùng câu hỏi chatbot lặp lại, tracking mỗi tool call (latency, error rate, top questions), và đưa stats realtime lên sidebar admin để vận hành viên thấy ngay tình trạng chatbot mà không cần vào trang riêng. Kèm defense-in-depth validation cho category enums và cache invalidation hooks khi admin CRUD data.

#### 15.19.1. Kiến trúc 3 lớp (cache + analytics + widget)

```
[Request: app/api/chat/route.ts]
        │
        ▼
[streamText() gọi 12 tools trong allTools]
        │
        ▼
[lib/chatbot/tools.ts — mỗi tool wrap với 2 layer]
        │
        ├─► Layer 1: cachedToolCall (lib/chatbot/tool-cache.ts)
        │     - Check in-memory Map theo key = buildCacheKey(toolName, params)
        │     - Hit  → return cached value
        │     - Miss → call factory + set cache với TTL
        │     - 11/12 tools wrap (trừ captureLead)
        │
        └─► Layer 2: logToolCall (lib/chatbot/analytics.ts)
              - Đo latency (Date.now() before/after)
              - Classify result: array empty → 'empty', object có .error → 'error', else 'success'
              - Sanitize args (redact 11 keys: phone, email, apiKey, password, ...)
              - INSERT vào chat_analytics (fire-and-forget, .catch silent)
              - KHÔNG await → analytics không block tool latency
```

#### 15.19.2. Schema bổ sung (`supabase/migrations/0018_chat_analytics_and_validation.sql`)

```sql
CREATE TABLE chat_analytics (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_name VARCHAR(50) NOT NULL,
  tool_args JSONB,                       -- sau khi sanitize (redacted)
  tool_result_count INT,                 -- 0 = empty/error, >0 = success
  tool_result_status VARCHAR(20) NOT NULL,  -- 'success' | 'empty' | 'error'
  tool_error TEXT,
  latency_ms INT NOT NULL,
  provider VARCHAR(50),                  -- 'groq' / 'openrouter' / ...
  model VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_chat_analytics_status CHECK (tool_result_status IN ('success','empty','error'))
);
CREATE INDEX idx_chat_analytics_session ON chat_analytics(session_id);
CREATE INDEX idx_chat_analytics_tool_name ON chat_analytics(tool_name, created_at DESC);
CREATE INDEX idx_chat_analytics_created ON chat_analytics(created_at DESC);
ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role full access chat_analytics" ON chat_analytics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3 RPC aggregation
CREATE OR REPLACE FUNCTION get_chat_analytics_summary(p_days INT DEFAULT 7)
  RETURNS TABLE (tool_name, total_calls, success_calls, empty_calls, error_calls,
                 avg_latency_ms, p95_latency_ms, unique_sessions) ...;

CREATE OR REPLACE FUNCTION get_top_user_questions(p_days INT DEFAULT 7, p_limit INT DEFAULT 20)
  RETURNS TABLE (question_text, ask_count, last_asked_at) ...;

CREATE OR REPLACE FUNCTION get_failed_tool_calls(p_days INT DEFAULT 7, p_limit INT DEFAULT 50)
  RETURNS TABLE (id, tool_name, tool_args, tool_error, latency_ms, session_id, created_at) ...;

-- Defense-in-depth CHECK constraints (bảo vệ nếu schema evolve)
ALTER TABLE chat_knowledge ADD CONSTRAINT chk_chat_knowledge_category
  CHECK (category IN ('shipping','return','warranty','payment','about','contact','care','size','general'));
ALTER TABLE chat_faqs ADD CONSTRAINT chk_chat_faqs_category
  CHECK (category IN ('shipping','return','warranty','payment','about','contact','care','size','general'));

-- Indexes bổ sung cho performance
CREATE INDEX idx_chat_messages_session_role ON chat_messages(session_id, role, created_at DESC);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id) WHERE user_id IS NOT NULL;
```

#### 15.19.3. Tool Cache (`lib/chatbot/tool-cache.ts`)

**Đặc thù serverless**: in-memory LRU (không share giữa các function instances), mỗi cold start miss toàn bộ. Chấp nhận được vì TTL ngắn.

```ts
// TTL per tool
const TTL_BY_TOOL = {
  getKnowledge: LONG_10m,
  getFaq: LONG_10m,
  searchProducts: SHORT_60s,  // data động
  semanticSearch: SHORT_60s,
  getProductDetail: SHORT_60s,
  getRelatedProducts: SHORT_60s,
  getFeaturedProducts: SHORT_60s,
  getCurrentCollections: SHORT_60s,
  getUpcomingProducts: SHORT_60s,
  getUpcomingCollections: SHORT_60s,
  getActivePromotions: SHORT_60s,
  // captureLead: NO CACHE (mỗi call unique)
};
```

**API**:
- `cachedToolCall(key, factory, ttlMs?)` — get-or-compute pattern, LRU evict khi `size > 200`
- `buildCacheKey(tool, args)` — sắp xếp key alphabet để `{a:1,b:2} === {b:2,a:1}`
- `invalidateTool(tool)` — xóa tất cả key bắt đầu `tool:`
- `invalidateCachePattern(pattern)` — xóa theo substring
- `getCacheStats()` — trả `{size, hits, misses, hitRate, oldestEntryAge}`

**Wrap pattern trong tools.ts**:
```ts
execute: async (params, options) => {
  const ctx = extractCtx(options);  // {sessionId, userId, provider, model} từ experimental_context
  const cacheKey = buildCacheKey('searchProducts', params);
  return cachedToolCall(cacheKey, () => logToolCall({
    toolName: 'searchProducts',
    args: params,
    ...ctx,
    run: async () => { /* original business logic */ },
  }), getDefaultTtl('searchProducts'));
}
```

**Cache key cho mỗi tool** (chỉ dùng field ảnh hưởng kết quả):
- `searchProducts`: tất cả params
- `semanticSearch`: `query + limit` (KHÔNG cache theo vector vì vector sẽ khác nhau mỗi lần embed)
- `getProductDetail`: `slug`
- `getRelatedProducts`: `productId + category + material + excludeProductId + limit`
- `getKnowledge`: `category + query + limit`
- `getFaq`: `query + limit`
- `getUpcomingProducts`: `category + material + limit`

#### 15.19.4. Analytics Logger (`lib/chatbot/analytics.ts`)

```ts
export async function logToolCall<T>(opts: {
  toolName, args, sessionId?, userId?, provider?, model?,
  run: () => Promise<T>
}): Promise<T> {
  const start = Date.now();
  let result: T, error: Error | null = null;
  try { result = await opts.run(); }
  catch (e) { error = e instanceof Error ? e : new Error(String(e)); }
  const latency = Date.now() - start;
  const { status, count } = error
    ? { status: 'error', count: 0 }
    : classifyResult(result);

  // Fire-and-forget — silent fail
  insertAnalytics({...}).catch(e => console.error('[analytics] insert failed:', e));

  if (error) throw error;
  return result;
}

function classifyResult<T>(result: T): {status, count} {
  if (result == null) return { status: 'error', count: 0 };
  if (Array.isArray(result)) {
    return { status: result.length === 0 ? 'empty' : 'success', count: result.length };
  }
  if (typeof result === 'object' && 'error' in result) return { status: 'error', count: 0 };
  return { status: 'success', count: 1 };
}

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  // Redact 11 keys: contactValue, phone, email, zalo, password, token, apiKey, ...
  // Recursive cho nested objects
}
```

**Read APIs** (cho admin UI):
- `getAnalyticsSummary(days)` — aggregate theo tool_name
- `getTopQuestions(days, limit)` — top câu user hỏi nhiều
- `getFailedCalls(days, limit)` — list error/empty calls để debug

#### 15.19.5. Sidebar Widget (`components/admin/chatbot-analytics-widget.tsx`)

Client component, nhúng vào `AdminSidebar` (chỉ expanded). Auto-refresh 30s.

**UI structure** (glass-morphism khớp design system):
```
┌─────────────────────────────────────────────┐
│ [Bot] CHATBOT              [↻] [⌄]          │
├─────────────────────────────────────────────┤
│                                             │
│  1,234       0.5%                          │
│  CALLS (24H) ERRORS   ← color: green <1%   │
│                                yellow 1-5% │
│                                red ≥5%      │
│  searchProducts       1,200                 │
│  getCurrentCollections  30                  │
│  getKnowledge            4                  │
│                                             │
│  ⚠ 2 call lỗi trong 24h  (nếu > 0)         │
│                                             │
│  cache: 45/200       hit: 60%              │
│                                             │
│  [Mở rộng]                                 │
│   Last updated: 18:00:23                    │
│   → Xem chi tiết (JSON)                    │
└─────────────────────────────────────────────┘
```

**Style pattern**: dùng `bg-[rgba(18,36,28,0.6)] backdrop-blur-sm border border-[#4D4635]` — khớp `glassStyle` constant trong admin shell.

**Color coding error rate**:
- `< 1%` → `text-success` (#3FB950)
- `1-5%` → `text-[#D29922]` (vàng)
- `≥ 5%` → `text-error` (#F85149)

**Hidden khi collapsed**: `if (showCollapsedLayout) return null;` (chỉ icon, không chiếm chỗ).

#### 15.19.6. Cache Invalidation Hooks (`lib/chatbot/cache-invalidation.ts`)

Helper module gọi từ admin CRUD routes. Best-effort (silent fail, không block CRUD).

```ts
const PRODUCT_TOOLS = ['searchProducts', 'semanticSearch', 'getProductDetail',
                       'getRelatedProducts', 'getFeaturedProducts'];
const COLLECTION_TOOLS = ['getCurrentCollections', 'getUpcomingCollections'];
const KNOWLEDGE_TOOLS = ['getKnowledge', 'getFaq'];
const PROMOTION_TOOLS = ['getActivePromotions'];
const UPCOMING_PRODUCT_TOOLS = ['getUpcomingProducts'];

export function invalidateProductCache(): void;       // gọi sau CRUD product
export function invalidateCollectionCache(): void;    // gọi sau CRUD collection
export function invalidateKnowledgeCache(): void;     // gọi sau CRUD knowledge/FAQ
export function invalidatePromotionCache(): void;     // gọi sau CRUD promotion
export function invalidateUpcomingProductCache(): void; // gọi sau CRUD upcoming product
export function invalidateAllChatbotCache(): void;    // nuke toàn bộ
```

**Inject matrix** (12 chỗ trong 6 files):

| File | Methods | Helper |
|---|---|---|
| `app/api/admin/products/route.ts` | POST | `invalidateProductCache()` |
| `app/api/admin/products/[id]/route.ts` | PATCH, DELETE | `invalidateProductCache()` |
| `app/api/admin/collections/route.ts` | POST | `invalidateCollectionCache()` |
| `app/api/admin/collections/[id]/route.ts` | PATCH, DELETE | `invalidateCollectionCache()` |
| `app/api/admin/chatbot/promotions/route.ts` | POST, PUT, DELETE | `invalidatePromotionCache()` |
| `app/api/admin/chatbot/knowledge/route.ts` | POST, PUT, DELETE | `invalidateKnowledgeCache()` |

**Vị trí inject**: ngay trước `return NextResponse.json({ ok: true, ... })` trong nhánh success. KHÔNG gọi trong catch block (chỉ invalidate khi CRUD thật sự thành công).

#### 15.19.7. Admin API endpoints

**`GET /api/admin/chat-analytics`** — full stats cho `/admin/chatbot?tab=analytics` page:
```json
{
  "summary": [...],          // từ get_chat_analytics_summary
  "topQuestions": [...],     // từ get_top_user_questions
  "failedCalls": [...],      // từ get_failed_tool_calls
  "cacheStats": {...},       // từ getCacheStats()
  "meta": { "days": 7, "limit": 20, "failedLimit": 50, "generatedAt": "..." }
}
```

**`GET /api/admin/chat-analytics/widget`** — compact cho sidebar widget:
```json
{
  "totalCalls": 1234,
  "totalErrors": 6,
  "errorRate": 0.005,
  "topTools": [{ "name": "searchProducts", "calls": 1200 }, ...],
  "failed24hCount": 2,
  "cacheSize": 45,
  "cacheHitRate": 0.6,
  "meta": { "days": 1, "generatedAt": "..." }
}
```

#### 15.19.8. Files mới / sửa (sprint 2026-07-22 buổi chiều)

**Mới (7 file)**:
```
supabase/migrations/0018_chat_analytics_and_validation.sql
lib/chatbot/tool-cache.ts
lib/chatbot/analytics.ts
lib/chatbot/cache-invalidation.ts
components/admin/chatbot-analytics-widget.tsx
app/api/admin/chat-analytics/route.ts
app/api/admin/chat-analytics/widget/route.ts
```

**Sửa (8 file)**:
```
lib/chatbot/tools.ts                              # wrap 11/12 tools với cache + analytics
lib/chatbot/config.ts                             # +ChatProvider, +EmbedProvider type extensions (openrouter, cerebras, cloudflare)
lib/chatbot/client.ts                             # +3 provider (openrouter/cerebras/cloudflare), normalize Cloudflare (giữ @cf/ prefix)
lib/chatbot/embeddings.ts                         # +OpenRouter embed fallback chain (openrouter → gemini → openai)
app/api/chat/route.ts                             # +TOOL_CALL_LEAK_RE, +FUNCTION_TAG_RE, +STREAM_TIMEOUT, +provider/model trong experimental_context, +dedupe 2 assistant liên tiếp
components/layout/admin-sidebar.tsx               # +ChatbotAnalyticsWidget (chỉ expanded)
app/api/admin/products/route.ts                   # +1 invalidateProductCache
app/api/admin/products/[id]/route.ts              # +2 invalidateProductCache (PATCH, DELETE)
app/api/admin/collections/route.ts                # +1 invalidateCollectionCache
app/api/admin/collections/[id]/route.ts           # +2 invalidateCollectionCache (PATCH, DELETE)
app/api/admin/chatbot/promotions/route.ts         # +3 invalidatePromotionCache
app/api/admin/chatbot/knowledge/route.ts          # +3 invalidateKnowledgeCache
.env.local.example                                # +docs cho 6 free providers
```

#### 15.19.9. Flow end-to-end (1 cycle vận hành)

1. Khách hỏi "có nhẫn bạc 925 không?" → `/api/chat` → streamText gọi Groq 8b-instant → model gọi `searchProducts` → tool wrap `cachedToolCall` (miss lần 1) + `logToolCall` (insert 1 row vào `chat_analytics`, latency 45ms, status=success, count=3) → trả về.
2. User thứ 2 hỏi cùng câu → `cachedToolCall` HIT → return cached array (latency 0ms) → vẫn `logToolCall` để track total_calls (vẫn insert 1 row, status=success, count=3, latency=0).
3. Admin thêm 1 sản phẩm mới trong `/admin/products/new` → POST `/api/admin/products` → insert OK → gọi `invalidateProductCache()` → xóa tất cả cache key bắt đầu `searchProducts:`, `semanticSearch:`, `getProductDetail:`, ... → lần hỏi tiếp theo sẽ miss → query DB mới.
4. Admin mở `/admin` → sidebar expanded → thấy `ChatbotAnalyticsWidget` hiển thị "1,234 calls (24h), 0.5% errors" → click refresh → fetch `/api/admin/chat-analytics/widget?days=1` → widget re-render.
5. Khi 1 tool fail (vd `getKnowledge` 404) → row mới với `tool_result_status='error'`, `tool_error='...'`, latency 50ms → admin thấy badge "2 call lỗi trong 24h" trong widget → click mở rộng → link tới `/api/admin/chat-analytics?days=7` xem JSON chi tiết.

#### 15.19.10. Use case cụ thể

| Tình huống | Behavior |
|---|---|
| 100 user hỏi cùng "có nhẫn không?" trong 5 phút | 100 calls tool, 1 DB query (99 cache hits) → giảm 99% tải DB |
| Admin thêm sản phẩm mới | Cache invalidation tự động → user hỏi tiếp sẽ thấy sp mới ngay (không đợi TTL 60s) |
| 1 tool call fail (network blip) | `chat_analytics` row status='error' → admin thấy badge trong widget → check `failedCalls` để debug |
| Cold start (Vercel function mới) | Cache miss toàn bộ → chấp nhận được, lần 2+ sẽ hit |
| Admin dùng widget lúc 3h sáng | Auto-refresh 30s không cần thao tác → thấy ngay khi có spike lỗi |
| CHECK constraint reject migration | Nếu DB hiện có row với `category` lạ (ngoài 9 giá trị enum) → chạy trước: `SELECT DISTINCT category FROM chat_knowledge;` → UPDATE hoặc mở rộng CHECK |

#### 15.19.11. Apply migration 0018

```bash
psql -f supabase/migrations/0018_chat_analytics_and_validation.sql
# hoặc paste vào Supabase Dashboard → SQL Editor
```

Idempotent. **Trước khi chạy**, kiểm tra data hiện tại:
```sql
SELECT DISTINCT category FROM chat_knowledge;
SELECT DISTINCT category FROM chat_faqs;
```
Nếu có giá trị ngoài 9 giá trị cho phép (`shipping/return/warranty/payment/about/contact/care/size/general`), cần UPDATE trước hoặc mở rộng danh sách trong CHECK constraint.

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

> **Status** (cập nhật 2026-07-27): ✅ gần như done. 6 tab + 4 auth page (Vietnamese slugs `dang-nhap/dang-ky/quen-mat-khau/dat-lai-mat-khau`) + addresses/wishlist/reviews/profile APIs ✅. ✅ `tai-khoan/don-hang/[code]` page + `<CustomerActionButtons/>` (cancel + refund request). ✅ `link_my_guest_orders()` RPC + migration 0011 auto-link orders theo email khi user đăng ký. ❌ email confirmation flow, ❌ reviews chưa hiển thị trên PDP.

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

## 20. LUỒNG 11 — EVENT-DRIVEN ARCHITECTURE (PUB/SUB)

> **Status**: 🟡 Designed, not implemented. Phase 1 (in-process EventBus) ready to implement. Phase 2 (Redis Pub/Sub) deferred until scaling need.
> **Mục tiêu**: Giảm coupling giữa các service, tăng khả năng mở rộng (email, SMS, Zalo, CRM, analytics), và cải thiện response time cho các flow quan trọng.

### 20.1. Vấn đề coupling trong kiến trúc hiện tại

Kiến trúc hiện tại là **monolithic synchronous**: mỗi API route phải thực hiện tuần tự tất cả side-effects trước khi trả response. Điều này gây:

1. **Slow response time**: Admin confirm bank payment mất ~300-400ms vì phải chạy 4-5 DB operations tuần tự (`app/api/admin/orders/[id]/route.ts` line 193-257)
2. **Fragile error handling**: Nếu `bankDb.insert` fail (`app/api/orders/route.ts` line 340) → phải rollback toàn bộ order + locks
3. **Hard to extend**: Thêm email notification sau khi order created → phải sửa code trong `app/api/orders/route.ts`, `app/api/momo/ipn/route.ts`, và `app/api/admin/orders/[id]/route.ts`
4. **Blocking critical path**: Nếu email service (future) fail → user không nhận confirmation nhưng order đã tạo

### 20.2. Kiến trúc đề xuất: Hybrid Event-Driven

```
[Client]
   │ POST /api/orders
   ▼
[Order Service — Next.js Route Handler]
   │ 1. Verify products AVAILABLE (SYNC)
   │ 2. Lock items qua RPC lock_item (SYNC — atomic)
   │ 3. Insert order + order_items (SYNC — ACID)
   │ 4. Stamp locks.order_id (SYNC)
   │ 5. Publish event: order.created
   │ 6. Return { orderCode } NGAY — ~50ms
   ▼
[EventBus — lib/events/bus.ts (Phase 1: in-process)]
   │ publish({ type: 'order.created', payload: {...} })
   ▼
[Subscribers — lib/events/subscribers/]
   ├── inventory.ts       → set_products_reserved (ASYNC)
   ├── bank.ts            → create bank_transfers + VietQR URL (ASYNC)
   ├── analytics.ts       → track begin_checkout (ASYNC, batched)
   ├── notifications.ts   → enqueue email/SMS/Zalo (ASYNC)
   └── admin-realtime.ts  → broadcast cho admin dashboard (ASYNC)
```

**Nguyên tắc phân chia SYNC vs ASYNC:**

| Operation | Mode | Lý do |
|---|---|---|
| Lock items (`lock_item` RPC) | SYNC | Phải atomic, ACID, tránh race-condition |
| Insert order + order_items | SYNC | Phải consistent, user cần orderCode ngay |
| Verify payment signature (IPN) | SYNC | Bảo mật — phải verify trước khi bất kỳ action nào |
| Update `bank_transfers.admin_confirmed_at` | SYNC | Persist trước khi publish |
| Mark products SOLD_OUT / RESERVED | ASYNC | Non-critical, có thể eventual consistency |
| Send email / SMS / Zalo | ASYNC | External service, có thể fail |
| Track GA4 analytics | ASYNC | Batch được, không block user |
| Broadcast admin realtime | ASYNC | Nice-to-have, không ảnh hưởng business logic |

### 20.3. Domain Events (canonical schema)

```typescript
// lib/events/types.ts
export type DomainEvent =
  | {
      type: 'order.created';
      payload: {
        orderId: string;
        code: string;
        paymentMethod: 'MOMO' | 'COD' | 'BANK_TRANSFER';
        total: number;
        customer: {
          name: string;
          phone: string;
          email: string | null;
        };
        items: Array<{
          productId: string;
          title: string;
          price: number;
        }>;
      };
    }
  | {
      type: 'order.payment_confirmed';
      payload: {
        orderId: string;
        code: string;
        method: 'MOMO' | 'BANK_TRANSFER';
        transId?: string;
        amount: number;
        confirmedAt: string;
      };
    }
  | {
      type: 'bank_transfer.confirmed';
      payload: {
        orderId: string;
        orderCode: string;
        adminId: string;
        adminNote?: string;
        confirmedAt: string;
      };
    }
  | {
      type: 'inventory.locked';
      payload: {
        productId: string;
        clientId: string;
        lockId: string;
      };
    }
  | {
      type: 'inventory.released';
      payload: {
        productId: string;
        lockId: string;
        reason: 'expired' | 'cancelled' | 'released';
      };
    };
```

### 20.4. EventBus implementation (Phase 1 — in-process)

**File**: `lib/events/bus.ts` (NEW)

```typescript
// lib/events/bus.ts
import type { DomainEvent } from './types';

type Handler = (event: DomainEvent) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  subscribe(type: string, handler: Handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  async publish(event: DomainEvent) {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    await Promise.allSettled(
      Array.from(handlers).map((h) =>
        Promise.resolve(h(event)).catch((err) => {
          console.error(`[eventbus] ${event.type} handler failed:`, err);
        })
      )
    );
  }
}

export const eventBus = new EventBus();
```

**File**: `lib/events/subscribers/index.ts` (NEW)

```typescript
// lib/events/subscribers/index.ts
import { eventBus } from '../bus';
import { registerInventorySubscribers } from './inventory';
import { registerBankSubscribers } from './bank';
import { registerOrderFinalizerSubscribers } from './order-finalizer';
import { registerAnalyticsSubscribers } from './analytics';
import { registerNotificationSubscribers } from './notifications';
import { registerAdminRealtimeSubscribers } from './admin-realtime';

export function registerAllSubscribers() {
  registerInventorySubscribers();
  registerBankSubscribers();
  registerOrderFinalizerSubscribers();
  registerAnalyticsSubscribers();
  registerNotificationSubscribers();
  registerAdminRealtimeSubscribers();
}
```

Gọi `registerAllSubscribers()` 1 lần trong `app/layout.tsx` (root) hoặc `app/(store)/layout.tsx`.

### 20.5. Integration vào các flow hiện tại

#### 20.5.1. Order creation flow (`POST /api/orders`)

**File**: `app/api/orders/route.ts`

**Thay đổi**: Sau line 364 (sau khi tạo bank_transfers thành công, trước return), thêm:

```typescript
// 8. Publish order.created event (non-critical side-effects)
await eventBus.publish({
  type: 'order.created',
  payload: {
    orderId: order.id,
    code: order.code,
    paymentMethod: payment,
    total: totalAmount,
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? null,
    },
    items: items.map((it) => ({
      productId: it.productId,
      title: it.title,
      price: it.price,
    })),
  },
});

// 9. Return response (user không cần chờ subscribers)
return NextResponse.json({
  ok: true,
  order: {
    id: order.id,
    code: order.code,
    status: order.status,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    totalAmount: order.total_amount,
  },
  redirectUrl,
});
```

**Subscribers sẽ xử lý**:
- `inventory.ts`: Set products = RESERVED (cho BANK/MOMO)
- `bank.ts`: Tạo bank_transfers row + VietQR URL
- `analytics.ts`: Track `begin_checkout`
- `notifications.ts`: Enqueue email/SMS

#### 20.5.2. MoMo IPN flow (`POST /api/momo/ipn`)

**File**: `app/api/momo/ipn/route.ts`

**Thay đổi**: Sau line 156 (sau khi xử lý SUCCESS/FAILED, trước return 204), thêm:

```typescript
// 6. Publish payment_confirmed event (async, non-blocking)
if (success) {
  await eventBus.publish({
    type: 'order.payment_confirmed',
    payload: {
      orderId: order.id,
      code: order.code,
      method: 'MOMO',
      transId: body.transId,
      amount: Number(body.amount),
      confirmedAt: ipnAt,
    },
  });
}

return new NextResponse(null, { status: 204 });
```

**Subscribers sẽ xử lý**:
- `order-finalizer.ts`: Gọi RPC `confirm_payment` → update order + products + locks
- `analytics.ts`: Track `purchase`
- `notifications.ts`: Gửi email "Thanh toán thành công"
- `admin-realtime.ts`: Broadcast new paid order

#### 20.5.3. Admin confirm bank payment (`PATCH /api/admin/orders/[id]`)

**File**: `app/api/admin/orders/[id]/route.ts`

**Thay đổi**: Trong `handleConfirmBankPayment`, sau line 255 (sau khi mark_products_sold_out, trước return), thêm:

```typescript
// 7. Publish bank_transfer.confirmed event
await eventBus.publish({
  type: 'bank_transfer.confirmed',
  payload: {
    orderId,
    orderCode: updatedOrder.code,
    adminId: adminUser.id,
    adminNote,
    confirmedAt: nowIso,
  }
});

return NextResponse.json({ order: updatedOrder, bankTransfer });
```

**Subscribers sẽ xử lý**: giống MoMo IPN — confirm_payment + analytics + notifications.

### 20.6. Subscribers chi tiết

#### 20.6.1. Inventory Subscriber (`lib/events/subscribers/inventory.ts`)

```typescript
import { eventBus } from '../bus';
import { createAdminClient } from '@/lib/supabase/admin';

eventBus.subscribe('order.created', async (e) => {
  if (e.payload.paymentMethod === 'MOMO' || e.payload.paymentMethod === 'BANK_TRANSFER') {
    const supabase = createAdminClient();
    await (supabase.rpc as any)('set_products_reserved', {
      p_order_id: e.payload.orderId,
    });
  }
});
```

#### 20.6.2. Bank Transfer Subscriber (`lib/events/subscribers/bank.ts`)

```typescript
import { eventBus } from '../bus';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBankConfig } from '@/lib/bank/config';
import { getBankByCode } from '@/lib/bank/types';
import { generateVietQRUrl, formatTransferContent } from '@/lib/bank/vietqr';

eventBus.subscribe('order.created', async (e) => {
  if (e.payload.paymentMethod !== 'BANK_TRANSFER') return;

  const supabase = createAdminClient();
  const bankCfg = getBankConfig();
  if (!bankCfg.isConfigured) {
    console.error('[events/bank] BANK_NOT_CONFIGURED for order', e.payload.code);
    return;
  }

  const transferContent = formatTransferContent(e.payload.code);
  const bankMeta = getBankByCode(bankCfg.bankCode);
  const qrImageUrl = generateVietQRUrl({
    bankCode: bankCfg.bankCode as any,
    accountNumber: bankCfg.accountNumber,
    accountName: bankCfg.accountName,
    amount: e.payload.total,
    addInfo: transferContent,
    template: 'compact',
  });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('bank_transfers').insert({
    order_id: e.payload.orderId,
    qr_image_url: qrImageUrl,
    bank_code: bankCfg.bankCode,
    bank_bin: bankMeta?.bin ?? null,
    account_number: bankCfg.accountNumber,
    account_name: bankCfg.accountName,
    amount: e.payload.total,
    transfer_content: transferContent,
    qr_expires_at: expiresAt,
  });

  if (error) {
    console.error('[events/bank] insert failed:', error);
  }
});
```

#### 20.6.3. Order Finalizer Subscriber (`lib/events/subscribers/order-finalizer.ts`)

```typescript
import { eventBus } from '../bus';
import { createAdminClient } from '@/lib/supabase/admin';

eventBus.subscribe('order.payment_confirmed', async (e) => {
  const supabase = createAdminClient();
  const transId = e.payload.transId ? BigInt(e.payload.transId) : null;

  if (transId) {
    await (supabase.rpc as any)('confirm_payment', {
      p_order_id: e.payload.orderId,
      p_momo_trans_id: transId,
    });
  } else {
    await supabase
      .from('orders')
      .update({
        payment_status: 'PAID',
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', e.payload.orderId);
  }
});

eventBus.subscribe('bank_transfer.confirmed', async (e) => {
  const supabase = createAdminClient();
  await (supabase.rpc as any)('confirm_payment', {
    p_order_id: e.payload.orderId,
    p_momo_trans_id: 0,
  });
});
```

#### 20.6.4. Analytics Subscriber (`lib/events/subscribers/analytics.ts`)

```typescript
import { eventBus } from '../bus';

eventBus.subscribe('order.payment_confirmed', async (e) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: e.payload.code,
      value: e.payload.amount,
      currency: 'VND',
    });
  }
});
```

#### 20.6.5. Notification Subscriber (`lib/events/subscribers/notifications.ts`)

```typescript
import { eventBus } from '../bus';

eventBus.subscribe('order.created', async (e) => {
  console.log('[notification] order.created:', e.payload.code);
  // Phase 2: await emailQueue.add('order_created', e.payload);
});

eventBus.subscribe('order.payment_confirmed', async (e) => {
  console.log('[notification] payment_confirmed:', e.payload.code);
  // Phase 2: await emailQueue.add('payment_success', e.payload);
});

eventBus.subscribe('bank_transfer.confirmed', async (e) => {
  console.log('[notification] bank_confirmed:', e.payload.orderCode);
  // Phase 2: await emailQueue.add('bank_confirmed', e.payload);
});
```

#### 20.6.6. Admin Realtime Subscriber (`lib/events/subscribers/admin-realtime.ts`)

```typescript
import { eventBus } from '../bus';
import { createBrowserClient } from '@/lib/supabase/client';

eventBus.subscribe('order.payment_confirmed', async (e) => {
  const supabase = createBrowserClient();
  await supabase.channel('admin-alerts').send({
    type: 'broadcast',
    event: 'new_paid_order',
    payload: {
      orderCode: e.payload.code,
      amount: e.payload.amount,
      timestamp: e.payload.confirmedAt,
    },
  });
});

eventBus.subscribe('bank_transfer.confirmed', async (e) => {
  const supabase = createBrowserClient();
  await supabase.channel('admin-alerts').send({
    type: 'broadcast',
    event: 'bank_confirmed',
    payload: {
      orderCode: e.payload.orderCode,
      adminId: e.payload.adminId,
    },
  });
});
```

### 20.7. Phase rollout

#### Phase 1: In-process EventBus (1-2 ngày)

**Mục tiêu**: Decouple logic trong monolith, không cần infra mới.

**Các bước**:
1. Tạo `lib/events/types.ts`, `lib/events/bus.ts`, `lib/events/subscribers/index.ts`
2. Tạo 6 subscribers mặc định (inventory, bank, order-finalizer, analytics, notifications, admin-realtime)
3. Modify 3 API routes để publish events:
   - `app/api/orders/route.ts` → `order.created`
   - `app/api/momo/ipn/route.ts` → `order.payment_confirmed`
   - `app/api/admin/orders/[id]/route.ts` → `bank_transfer.confirmed`
4. Test: verify events được publish đúng lúc, subscribers chạy đúng, không có regression
5. Update `flows.md` — section này

**Rollback**: Xóa `await eventBus.publish()` khỏi 3 routes, hệ thống về sync cũ.

#### Phase 2: Upstash Redis Pub/Sub (2-3 ngày, defer đến khi cần scale)

**Khi nào cần**:
- Có external workers (email worker, SMS worker) chạy độc lập
- Cần horizontal scale (nhiều Next.js instances)
- Cần durable queue (message không mất khi server restart)

**Implementation**:
- Thêm `lib/events/redis.ts` wrapper
- Replace in-process bus với Redis Pub/Sub
- Subscribers chạy như Vercel Cron Jobs hoặc Edge Functions
- Dùng Upstash Redis đã có trong env (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)

**Trade-off**: Thêm latency ~10-50ms, nhưng có durability + horizontal scale.

#### Phase 3: External Workers (nếu cần)

- Email worker: Vercel Cron + `/api/workers/email` route
- SMS/Zalo worker: tương tự
- CRM sync worker: GitHub Actions hoặc n8n self-host

### 20.8. Files cần tạo (Phase 1)

```
lib/events/
├── types.ts                    # DomainEvent union type
├── bus.ts                      # In-process EventBus
├── subscribers/
│   ├── index.ts                # Register all subscribers
│   ├── inventory.ts            # Handle inventory.locked, inventory.released
│   ├── bank.ts                 # Handle order.created → create bank_transfers
│   ├── order-finalizer.ts      # Handle payment_confirmed → confirm_payment RPC
│   ├── analytics.ts            # Track GA4 events (batched)
│   ├── notifications.ts        # Queue email/SMS/Zalo (Phase 1: log only)
│   └── admin-realtime.ts       # Broadcast cho admin dashboard
```

### 20.9. Trade-offs & caveats

| Ưu điểm | Nhược điểm / Rủi ro |
|---|---|
| Order service trả response nhanh hơn (~50ms vs ~300ms) | Phức tạp debug (phải trace events) |
| Thêm subscriber mới không sửa order code | Eventual consistency — admin có thể thấy order `NEW` trong vài ms trước khi status update |
| Email/SMS fail không ảnh hưởng checkout | Cần retry mechanism cho critical events |
| Dễ mở rộng (SMS, Zalo, CRM) | Cần monitoring (log mọi publish/consume) |
| Test isolation — có thể test subscribers riêng | Phải đảm bảo idempotency (event có thể deliver 2 lần) |

**Idempotency rules**:
- Mỗi subscriber phải xử lý duplicate events gracefully
- Dùng `eventId` (UUID) trong payload để dedupe nếu cần
- Redis Pub/Sub có thể deliver message 2 lần trong edge cases

### 20.10. Monitoring & Debugging

```typescript
// Thêm vào bus.ts
async publish(event: DomainEvent) {
  const eventId = crypto.randomUUID();
  console.log(`[eventbus] publish ${event.type}`, { eventId, payload: event.payload });
  
  // ... existing logic
  
  console.log(`[eventbus] publish ${event.type} done`, { eventId });
}
```

**Metrics cần track**:
- `event_publish_total` — counter by event type
- `event_handler_duration_ms` — histogram by handler
- `event_handler_errors_total` — counter by handler + error type

### 20.11. Liên kết

- Xem các flow hiện tại: §7 (checkout), §7.1.1 (VietQR), §7.3 (IPN), §10 (auth)
- File tham chiếu: `app/api/orders/route.ts`, `app/api/momo/ipn/route.ts`, `app/api/admin/orders/[id]/route.ts`
- Stack: Next.js 14+ Route Handlers, Supabase Postgres + RPC, Vercel deployment

---

---

## 19. STATUS — JOB PENDING

> Section này được sinh từ audit codebase ngày 2026-07-16. Mỗi mục có: ID (anchor trong spec), tiêu đề, file/route cần tạo/sửa, mô tả ngắn, và effort ước lượng.
> Cập nhật: tick ✅ khi xong, đổi status ở §0 cho khớp.

### 19.1. Executive summary

| Trạng thái | Số lượng | % |
|---|---|---|
| ✅ DONE | ~99 | 64% |
| 🟡 PARTIAL | ~18 | 12% |
| ❌ NOT STARTED | ~36 | 24% |

**Customer-facing**: gần như hoàn chỉnh (16 page, 5 API, 5 RPC, RLS, full MoMo create+IPN, lock flow, 6 tab account).
**Admin**: shell + auth + sidebar/header + 5 page real-data (products list/new/edit/bulk-upload, dashboard, orders list/detail, collections CRUD, newsletter, analytics, **chatbot KB + analytics dashboard + suggested answers + sidebar analytics widget**).
**AI Chatbot**: ✅ core (sprint 2026-07-20) + ✅ Knowledge Base (sprint 2026-07-21) + ✅ **Suggested Answers + Cluster Analytics + Rate-limit cooldown** (sprint 2026-07-22 buổi sáng) + ✅ **Tool Cache + Analytics Tracking + Sidebar Widget + Cache Invalidation** (sprint 2026-07-22 buổi chiều). Còn lại ❌ GA4 chatbot events.

**Gap lớn nhất**: MoMo env (0% populated), GA4 chatbot events (0%), Sentry (0%), end-user account UI tabs (polish), inventory/payments/settings admin pages (P2), draft enum (P2).

### 19.2. Critical (chặn production)

| # | § | Job | File/route | Effort | Mô tả |
|---|---|---|---|---|---|
| C1 | §15 | **AI Chatbot — full stack** ✅ DONE | `app/api/chat/route.ts`, `lib/chatbot/*`, `components/chatbot/*`, migrations `0012_chatbot_schema.sql` + `0013_embed_trigger.sql` + `0014_product_embedding_update.sql`, `scripts/embed-all-products.ts` | DONE 2026-07-20 | pgvector + chat_sessions + chat_messages + match_products RPC + embed trigger + Vercel AI SDK + 7 component + use-chat-session. Feature signature. |
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
| **I15** | **§15.17** | **🆕 AI Chatbot Knowledge Base** ✅ DONE 2026-07-21 | `lib/chatbot/static-knowledge.ts`, `components/chatbot/chat-collection-card.tsx`, `app/(admin)/admin/chatbot/page.tsx`, `app/api/admin/chatbot/{knowledge,faqs,upcoming,promotions,leads}/route.ts`, migrations `0015_chat_leads.sql` + `0016_chatbot_knowledge.sql` + `0017_chatbot_seed.sql` | 4–5h | 5 bảng DB mới (chat_knowledge/chat_faqs/upcoming_products/upcoming_collections/chat_promotions) + 1 bảng leads (chat_leads) + 5 tools mới (getKnowledge/getFaq/getUpcomingProducts/getUpcomingCollections/getActivePromotions) + 1 static file SHOP_INFO + admin UI 5 tabs + sidebar menu + lead capture. Routing tool theo intent trong system prompt. Xem §15.17. |
| **I16** | **§15.18** | **🆕 Chatbot Suggested Answers + Cluster Analytics + Multi-provider rate-limit cooldown** ✅ DONE 2026-07-22 | `supabase/migrations/0019_chat_suggested_answers.sql`, `app/api/admin/chatbot/suggested-answers/route.ts`, `app/api/admin/chatbot/clusters/route.ts`, sửa `lib/chatbot/{tools,analytics,client,system-prompt}.ts` + `app/api/chat/route.ts` + `app/(admin)/admin/chatbot/page.tsx` | 3h | Bảng `chat_suggested_answers` (UUID, category enum 11, trigger_keywords TEXT[], GIN index, RLS service_role) + RPC `get_user_question_clusters` (normalize tiếng Việt: lowercase + bỏ dấu + bỏ punct + collapse whitespace → GROUP BY → ORDER BY ask_count) + tool `getSuggestedAnswers` (12 tool total, ưu tiên trước getKnowledge cho chính sách) + 2 tab mới trong `/admin/chatbot` (Phân tích: SummaryCards 4 ô + Top tools + Top clusters với nút "Tạo mẫu trả lời" + Failed calls, day filter 1/7/30; Mẫu trả lời: CRUD form + list inline edit/delete/publish) + multi-provider rate-limit cooldown (Groq/Or/Cb/Cf 429/STREAM_TIMEOUT → mark cooldown với parse "try again in Xs", skip N giây thay vì waste 25s STREAM_TIMEOUT mỗi request; response `ALL_PROVIDERS_COOLDOWN` 503 với cooldowns map). Xem §15.18. |
| **I17** | **§15.19** | **🆕 Tool Cache + Analytics Tracking + Sidebar Widget + Cache Invalidation Hooks** ✅ DONE 2026-07-22 (buổi chiều) | `supabase/migrations/0018_chat_analytics_and_validation.sql`, `lib/chatbot/{tool-cache,analytics,cache-invalidation}.ts`, `components/admin/chatbot-analytics-widget.tsx`, `app/api/admin/chat-analytics/{route,widget/route}.ts`, sửa `lib/chatbot/tools.ts` + `components/layout/admin-sidebar.tsx` + 6 admin CRUD routes | 3h | In-memory LRU cache (200 entries, TTL 1-10 phút per tool) cho 11/12 tools (trừ `captureLead`) → giảm tải DB khi cùng câu hỏi lặp lại. Bảng `chat_analytics` (BIGSERIAL, session_id, user_id, tool_name, tool_args JSONB, tool_result_count, tool_result_status, tool_error, latency_ms, provider, model) + 3 RPCs aggregation (`get_chat_analytics_summary`, `get_top_user_questions`, `get_failed_tool_calls`) + indexes + RLS service_role. Logger `logToolCall` (fire-and-forget, silent fail) wrap 12 tools. `sanitizeArgs` redact 11 sensitive keys (phone/email/apiKey/...). Defense-in-depth CHECK constraints cho `chat_knowledge.category` + `chat_faqs.category` (9 giá trị enum). Component `ChatbotAnalyticsWidget` glass-morphism nhúng vào `AdminSidebar` (chỉ expanded): tổng calls 24h, error rate % (color-coded), top 3 tools, failed 24h badge, cache size + hit rate, auto-refresh 30s. API endpoint `/api/admin/chat-analytics/widget` trả compact JSON. 12 cache invalidation hooks trong 6 admin CRUD routes (products/collections/promotions/knowledge) gọi `invalidateTool(...)` sau success → user thấy data mới ngay, không phải đợi TTL expire. Xem §15.19. |
| **I18** | **§13/§19.5** | **🆕 Production hardening — env validation + rate-limit + Sentry** ✅ DONE 2026-07-28 | `lib/env.ts`, `lib/middleware/{rate-limit,index}.ts`, `lib/middleware/rate-limit.ts` wire vào 5 routes (`lock-item`, `orders`, `momo/create`, `momo/ipn`, `chat`), `sentry.{client,server,edge}.config.ts`, `instrumentation.ts`, `app/global-error.tsx`, package thêm `@upstash/ratelimit@^2` + `@sentry/nextjs@^8.40.0` | 5h | **Env validation**: zod schema + friendly error listing missing vars + 6 helpers (`getServerEnv`/`getClientEnv`/`getBankConfig`/`getChatProviderConfig`/`getMoMoConfig`/`vercelEnv`) + `SKIP_ENV_VALIDATION` escape hatch. **Rate-limit**: Upstash sliding-window 10/min `/api/lock-item`, 5/min `/api/orders`+`/api/momo/create`, 20/min `/api/chat`, IP cho 4 routes thường + `orderId` cho IPN. Graceful fallback khi thiếu `UPSTASH_REDIS_REST_URL`. **Sentry**: 3 config files + `instrumentation.ts` switch theo `NEXT_RUNTIME` + global-error catch-all + server `beforeSend` redact sensitive (phone/email/token/...). All 3 graceful khi thiếu env. |
| **I19** | **§15/§9** | **🆕 GA4 chatbot events** ✅ DONE 2026-07-28 | `lib/analytics/events.ts` (+4 builders), `hooks/use-jewelry-analytics.ts` (+4 wrappers), `components/chatbot/chat-widget.tsx` (4 wire points) | 2h | 4 custom events: `chat_opened` (bubble click + `is_returning_user` localStorage `ev_chat_seen`), `chat_message_sent` (post-append, scan history for product context), `chat_product_clicked` (event-delegation match `[href^="/san-pham/"]`, lookup slug in messages), `chat_lead_captured` (stream `tool-output-available` for `captureLead` success, extract `contact_type` from tool input). Consent-gated + SSR-safe + no-op nếu thiếu GA ID. |
| **I20** | **§18.4** | **🆕 `/tai-khoan/xac-nhan-email` + `/api/auth/resend-confirmation`** ✅ DONE 2026-07-28 | `app/(store)/tai-khoan/xac-nhan-email/page.tsx` (Suspense + countdown 60s + resend), `app/api/auth/resend-confirmation/route.ts` (zod + supabase.auth.resend), `app/(store)/tai-khoan/layout.tsx` (add to AUTH_PATHS) | 1.5h | Post-signup confirmation fallback page. Suspense wrap `useSearchParams`, đọc `?email=`, 60s countdown cho nút "Gửi lại email", toast success/error. API route POST `{email}` → `supabase.auth.resend({type:'signup', emailRedirectTo:'/tai-khoan/ho-so'})`. Auth path → render bare `<main>` không sidebar. |

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
| **N14** | §9 / §18 | **GA4 account events** | `lib/analytics/events.ts` extensions | 1h |
| N15 | §18.7 | **account-mobile-tabs** | `components/account/account-mobile-tabs.tsx` | 30m |
| N16 | §3.3 | **account order list filter UI** | `components/account/order-list-filters.tsx` | 1h |
| N17 | §12 | **Hero image preload** | `app/(store)/layout.tsx` | 30m |
| N18 | §13 | **Structured logging với redaction** | `lib/log.ts` | 2h |
| N19 | §13 | **Cleanup 39 pre-existing TypeScript errors** | `docs/ts-errors-cleanup.md` (đã liệt kê) | 2-3h | Phát hiện 2026-07-16 sau khi `tsc --noEmit` toàn project. 6 nhóm: Supabase generic narrowing (14 errors), Lucide IconComp (7), mobile-bottom-nav prop (1), account-sidebar getInitials (2), Postgrest update/insert never (8), queries row type (7). `next build` vẫn pass vì file lỗi nằm ngoài route graph hiện tại. |
| N20 | §15.17 | **🆕 Knowledge base: embed columns auto-fill** | `lib/chatbot/embed-knowledge.ts` + cron | 1h | Bảng `chat_knowledge.embedding` và `chat_faqs.embedding` hiện chưa auto-fill. Khi semantic search KB được bật, cần batch embed tất cả rows + trigger on UPDATE. Hiện keyword ILIKE đủ dùng. |
| **N21** | **§15.17** | **✅ GA4 chatbot events** DONE 2026-07-28 (xem I19) | `lib/analytics/events.ts` + `hooks/use-jewelry-analytics.ts` + `components/chatbot/chat-widget.tsx` | 1h | 4 events: `chat_opened`, `chat_message_sent`, `chat_product_clicked`, `chat_lead_captured`. Xem §15.12 / I19. |
| N22 | §15.19 | **🆕 Per-user cache cho semantic search** | `lib/chatbot/tool-cache.ts` | 30m | Hiện `semanticSearch` cache theo `query` text chung (2 user hỏi cùng "nhẫn vintage" hit cache chung). Nếu muốn personalization → thêm `userId` vào `buildCacheKey`. Trade-off: cache size tăng 10x. Cần confirm nhu cầu thực. |
| N23 | §15.19 | **🆕 External analytics (PostHog / Plausible)** | TBD | 2h | Nếu cần analytics external (session replay, funnel chi tiết, A/B test). Hiện `chat_analytics` nội bộ + GA4 events (N21) đủ dùng cho MVP. Cần tài khoản + API key + quyết định track event nào. |

### 19.5. Infrastructure

| # | § | Job | Effort |
|---|---|---|---|
| **F1** | **§13** | ✅ **Sentry** DONE 2026-07-28 (xem I18) — install `@sentry/nextjs@^8.40.0`, 3 config files + `instrumentation.ts` + `app/global-error.tsx`. Env `SENTRY_DSN` optional (graceful khi missing). | DONE |
| **F2** | **§13** | ✅ **Upstash Redis** DONE 2026-07-28 (xem I18) — install `@upstash/ratelimit@^2` + `@upstash/redis`. Wire rate-limit 5 routes. Graceful fallback khi thiếu env. | DONE |
| F3 | §13 | **PITR** — enable trong Supabase Dashboard (Pro plan) | 5m |
| F4 | §14 | **Production env switch** — MoMo test → production endpoint | 30m |
| F5 | §13 | **Admin write RLS** — explicit policies cho `products`/`collections` | 1h |
| F6 | §15 | **Chatbot infra: pgvector + tables** — gộp với C1 | ✅ DONE 2026-07-20 (xem C1) |
| F7 | §15 | **match_products RPC + embed trigger** — gộp với C1 | ✅ DONE 2026-07-20 (xem C1) |
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
| 9 | `/xac-nhan-email` page + auto-link guest orders on signup | Account flow polish | 30m | ✅ DONE 2026-07-28 (xem I20) |
| 10 | 5 UI primitives còn thiếu | Unblock nhiều job khác | 2–3h | 🟡 PARTIAL |
| 11 | **🆕 Fix login kẹt loading + Admin block mua hàng** | UX critical | 1h | ✅ DONE 2026-07-17 |
| 12 | **🆕 Apply migration 0011 (customer_id backfill theo email)** | `/tai-khoan/don-hang` thấy đơn | 5m | ❌ PENDING (file sẵn, cần apply Dashboard — xem §10.3.5) |
| 13 | **🆕 Apply migration 0018 (chat_analytics + CHECK constraints)** | Sidebar widget hoạt động, analytics tracking | 2m | ❌ PENDING (file sẵn, cần apply — kiểm tra category DISTINCT trước — xem §15.19.11) |
| 14 | **🆕 Apply migration 0019 (chat_suggested_answers + cluster RPC)** | Admin dùng được Suggested Answers + Cluster Analytics tab | 2m | ❌ PENDING (file sẵn, cần apply — xem §15.18.10) |
| **15** | **🆕 Sprint 2026-07-28 — Production hardening** (env validation + rate-limit + Sentry) | Production readiness + observation | 5h | ✅ DONE 2026-07-28 (xem I18) |

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
8. ✅ **AI Chatbot shipped 2026-07-20** — 12 file mới (3 migrations + 5 lib/chatbot + 1 route + 1 hook + 7 components + 1 script + 1 doc) + 1 sửa layout. Migration numbers 0012-0014 (KHÔNG dùng 0004/0005 như spec §15.16 vì đã tồn tại). Embedding dim 1536 (Gemini hỗ trợ `outputDimensionality: 1536`). `chat_messages` sliding window 10 messages. `getCurrentUser()` dùng để set `user_id` khi logged-in.
9. ✅ **AI Chatbot Knowledge Base shipped 2026-07-21** — 12 file mới (3 migrations 0015-0017 + 1 lib/chatbot/static-knowledge + 1 component + 1 admin page + 5 API CRUD + 1 static file) + 7 file sửa (tools/system-prompt/route.ts/message/widget/admin-nav-config/admin-sidebar). Tổng 11 tools cho AI SDK v6 (inputSchema, stopWhen=stepCountIs(4)). Cấu trúc 3 tầng: static (SHOP_INFO) → DB dynamic (5 bảng) → seed mẫu (10+8+3+2+3). Admin quản lý ở `/admin/chatbot` (5 tabs). Lead capture lưu vào `chat_leads` qua tool `captureLead` với `experimental_context`. Sidebar menu mới "Chatbot" (icon `Bot`). Chi tiết §15.17.
 10. ✅ **Chatbot Suggested Answers + Cluster Analytics + Rate-limit cooldown shipped 2026-07-22** — 3 file mới (migration 0019 + 2 admin API) + 4 file sửa (lib/chatbot: tools/analytics/client/system-prompt + app/api/chat/route.ts + admin page). Tổng 12 tools (`getSuggestedAnswers` đăng ký vào `allTools`). Admin UI thêm 2 tab mới (Phân tích, Mẫu trả lời) → tổng 7 tabs ở `/admin/chatbot`. Multi-provider chain giờ skip provider trong cooldown (in-memory `Map<provider, cooldownUntilMs>`, parse "try again in Xs" từ Groq rate-limit message). Cross-tab navigation dùng `window.dispatchEvent('chatbot-prefill')`. RPC `get_user_question_clusters` dùng `translate()` để strip Vietnamese diacritics → cluster "ship hàng" / "Ship hang" / "SHIP hàng" về cùng 1 group. Chi tiết §15.18.
 11. ✅ **🆕 Tool Cache + Analytics Tracking + Sidebar Widget + Cache Invalidation shipped 2026-07-22 (buổi chiều)** — 7 file mới (migration 0018 `chat_analytics` + 3 RPCs aggregation + 2 CHECK constraints + 2 file TS `tool-cache.ts` + `analytics.ts` + `cache-invalidation.ts` + 1 component widget + 2 API endpoint) + 8 file sửa (`lib/chatbot/{tools,config,client,embeddings}.ts` + `app/api/chat/route.ts` + `components/layout/admin-sidebar.tsx` + 6 admin CRUD routes + `.env.local.example`). Wrap 11/12 tools với `cachedToolCall` (in-memory LRU 200 entries, TTL 1-10 phút per tool) + `logToolCall` (fire-and-forget insert vào `chat_analytics`, silent fail). Sanitize 11 sensitive keys (phone/email/apiKey/...). Provider + model trong `experimental_context` → analytics track được AI provider đang dùng. Tool call leak detect (regex `function=\w+>{` + `<function>` tag) → retry provider kế tiếp. Multi-provider chain giờ có 6 providers (groq/openrouter/cerebras/cloudflare/gemini/openai), ưu tiên free, auto-fallback. Sidebar widget (chỉ expanded, auto-refresh 30s) hiển thị: tổng calls 24h, error rate % (color-coded <1% / 1-5% / ≥5%), top 3 tools, failed 24h badge, cache size + hit rate. 12 cache invalidation hooks trong 6 admin CRUD routes gọi `invalidateTool(...)` sau success → user thấy data mới ngay, không phải đợi TTL expire. Chi tiết §15.19.

---

## 20. CHANGELOG NHANH (sprint gần đây)

| Ngày | Sprint | Highlights |
|---|---|---|
| 2026-07-29 | **🆕 Chatbot comprehensive audit + harden** | Audit 41 issues (12 HIGH + 22 MED + 7 LOW), fix 10 HIGH + 6 MED. **HIGH**: AbortController per provider + `abortSignal: providerAbort.signal` chain với `request.signal`; per-tab session ID qua sessionStorage (chống cross-tab contamination); pending state cho user message (UI marker + retry button); ILIKE wildcard escape + unaccent OR (diacritics search); captureLead Zod refine + spam counter + strip PII; TOOL_CALL_BUG_RE regex (bỏ false positive); slug regex; minPrice/maxPrice refine; handleSend isRetry flag (no duplicate). **MED**: cookie secure + sameSite strict; clear chat confirm; prefers-reduced-motion (10 chỗ motion-safe:); redactPII helper (SĐT/email); input maxLength 2000; unaccent extension migration 0027; upcoming filter `launch_date >= NOW`; cache key chuẩn hóa (bỏ minOrderValue); userMessage cho tất cả error responses. **Migration apply pending**: `0027_unaccent_extension.sql` cần apply. |
| 2026-07-28 (PM) | **🆕 QR checkout audit fixes — VietQR flow security + UX hardening** | Audit 19 issues (4 HIGH + 5 MED + 8 LOW + 2 OK), fix hết HIGH/MED. **HIGH**: `billUploadedAt` response field riêng (không trộn `userConfirmedAt`), `lib/phone/normalize.ts` shared helper áp dụng cho `bank-proof` + `confirm-paid`, auth bypass fix — branch user/guest (`customer_id` check khi login, `normalizePhone` fallback khi guest). **MED**: QR expired enforce cả client (button disabled + banner đỏ) + server (410 `QR_EXPIRED`); migration `0026_bank_transfers_unique_order` UNIQUE(order_id); `cleanupFailedBankOrder` helper rollback order khi `set_products_reserved` fail + handle 23505 unique_violation như idempotent success. Audit đầy đủ §0 buổi chiều. |
| 2026-07-28 (AM) | **🆕 Production hardening + Account polish** | `lib/env.ts` zod validation + 6 helpers. `lib/middleware/rate-limit.ts` (Upstash sliding window) wire vào 5 routes: `/api/lock-item` (10/min), `/api/orders` (5/min), `/api/momo/create` (5/min), `/api/chat` (20/min), `/api/momo/ipn` (orderId). Sentry 3-config + `instrumentation.ts` + `app/global-error.tsx` (graceful khi thiếu DSN). GA4 chatbot events: `chat_opened` + `chat_message_sent` + `chat_product_clicked` + `chat_lead_captured`. `/tai-khoan/xac-nhan-email` page + `/api/auth/resend-confirmation` route. Xem §I18/I19/I20 + §F1/F2. |
| 2026-07-22 (PM) | **🆕 Tool Cache + Analytics Tracking + Sidebar Widget + Cache Invalidation** | Bảng `chat_analytics` + 3 RPCs aggregation (summary/top-questions/failed-calls) + CHECK constraints defense-in-depth cho `chat_knowledge.category` + `chat_faqs.category`. In-memory LRU cache (200 entries, TTL 1-10 phút per tool) cho 11/12 tools (trừ `captureLead`). Fire-and-forget logger wrap mỗi tool call với latency, status, error. Widget analytics nhúng vào `AdminSidebar` (chỉ expanded): tổng calls 24h + error rate % + top 3 tools + failed 24h badge + cache stats, auto-refresh 30s. 12 cache invalidation hooks trong 6 admin CRUD routes (products/collections/promotions/knowledge) để user thấy data mới ngay. Multi-provider chain mở rộng 6 providers (groq/openrouter/cerebras/cloudflare/gemini/openai), ưu tiên free. Xem §15.19. |
| 2026-07-22 (AM) | **Chatbot Suggested Answers + Cluster Analytics + Rate-limit cooldown** | Bảng `chat_suggested_answers` + RPC `get_user_question_clusters` (gom câu hỏi thật) + tool `getSuggestedAnswers` (model gọi trước `getKnowledge`) + 2 tab mới trong `/admin/chatbot` (Phân tích + Mẫu trả lời). Multi-provider rate-limit cooldown (Groq/Or/Cb/Cf 429/STREAM_TIMEOUT → skip N giây). Xem §15.18. |
| 2026-07-21 | **Chatbot Knowledge Base** | 5 bảng DB + 5 tools + admin UI 5 tabs + lead capture + sidebar menu. xem §15.17. |
| 2026-07-20 | **AI Chatbot core** | pgvector + chat_sessions + chat_messages + match_products + 4 tools + 7 components + streaming. |
| 2026-07-17 | **Login + Admin Block** | Fix race condition login, admin block checkout, customer_id backfill theo email (migration 0011). |
| 2026-07-17 | **VietQR + Unblock vận hành** | Migration 0008 (bank_transfers) + customer/admin flow + 4 admin page real data. |

### 19.8. Quy tắc cập nhật

- Mỗi lần xong một job, **tick ✅ vào cột "Trạng thái" ở §0 + §19.x** tương ứng.
- Cộng số DONE, trừ số NOT STARTED ở §0 cho khớp.
- Thêm job mới (ngoài spec) vào §19.3 hoặc §19.4 tuỳ priority.
- Nếu 1 job được split thành nhiều, thêm từng sub-item.
- Format: giữ đúng bảng markdown + emoji ✅🟡❌❌. Không sửa text trong các section §1–§18 (chỉ §0 + §19 là metadata).
