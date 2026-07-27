# BUGS AUDIT — Emerald Vault E-commerce

> Ngày audit: 2026-07-27 · Phạm vi: customer-facing mobile UI + chatbot deploy (Vercel) + admin responsive + flows.md cross-check
> Mục tiêu: **FIX** — không phát triển tính năng mới. Tổng cộng **41 bugs** (12 BLOCKER · 14 HIGH · 15 MEDIUM).
> Ưu tiên sprint: B-tier (~1h) → H-tier (~3h) → M-tier (polish).

---

## 0. TỔNG QUAN

| Mức độ | Số lượng | Thời gian ước tính |
|---|---|---|
| 🔴 BLOCKER | 12 | ~2h |
| 🟠 HIGH | 14 | ~3h |
| 🟡 MEDIUM | 15 | ~2h |
| ⚪ LOW (consistency) | 6 | ~1h |
| **Tổng** | **47** | **~1 ngày** |

**4 nhóm bug chính**:
1. **Customer mobile UI** — footer mất tích, chatbot đè nav, button `size="lg"` collapse vì `h-13` không tồn tại trong Tailwind spacing scale, navbar padding quá rộng.
2. **Chatbot deploy Vercel** — cooldown lưu in-memory không share giữa các serverless instance; `maxDuration=30` vượt Hobby plan cap 10s; cookie `httpOnly` không đọc được từ client.
3. **Admin responsive** — 3 bảng có `min-w-[860-1024px]` ép scroll ngang trên phone; form chatbot `grid-cols-2/3` không collapse trên mobile.
4. **flows.md documentation drift** — `pg_cron release_expired_locks` được claim ✅ nhưng thực tế không migration nào enable; migration `0010_*` bị trùng tên (2 file).

---

## 1. 🔴 BLOCKERS — Mobile UI không dùng được

### B1. Footer hoàn toàn biến mất trên mobile
- **File**: `app/(store)/layout.tsx:87-89`
- **Vấn đề**: `<div className="hidden lg:block"><Footer/></div>` — `Footer` không render dưới breakpoint `lg` (1024px). User thấy content kết thúc đột ngột sau `pb-20` của bottom nav, không có footer.
- **Đã có sẵn**: `components/home/mobile/mobile-footer.tsx` (116 dòng) **đã code xong** nhưng **không bao giờ được import**.
- **Fix**:
  ```tsx
  // app/(store)/layout.tsx — sau </main>, trước MobileBottomNav
  <div className="hidden lg:block"><Footer /></div>
  <div className="lg:hidden"><MobileFooter /></div>
  <MobileBottomNav />
  ```
  Và thêm `import { MobileFooter } from '@/components/home/mobile/mobile-footer';` ở đầu file.

### B2. Chat bubble đè lên bottom nav mobile (không bấm được cart)
- **File**: `components/chatbot/chat-bubble.tsx:19`
- **Vấn đề**: `fixed bottom-6 right-6 z-50` — bubble cách đáy 24px, đúng chỗ icon "Giỏ hàng" + "Tài khoản" của `MobileBottomNav` (height 64px, `bottom-0 z-40`).
- **Fix**:
  ```tsx
  className={cn(
    'fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gold shadow-lg',
    'sm:bottom-6 sm:right-6',
    'lg:bottom-8 lg:right-8 lg:h-16 lg:w-16',
  )}
  ```

### B3. Tailwind class `h-13` không tồn tại — Button `size="lg"` collapse
- **Files**: `components/ui/button.tsx:20` + `components/ui/wishlist-button.tsx:33`
- **Vấn đề**: `lg: 'h-13 px-7 text-base'` và `lg: 'h-13 px-6 text-base'`. Tailwind spacing scale mặc định nhảy `12 → 14`, **không có `13`**. JIT không generate → button render height = content (~30-40px) thay vì 52px. Ảnh hưởng: `HoldButton` ở PDP, 4 button ở `/momo/return`, tất cả `size="lg"`.
- **Fix**:
  ```ts
  // button.tsx:20 — đổi 'h-13 px-7 text-base' → 'h-14 px-7 text-base'
  // wishlist-button.tsx:33 — đổi 'h-13 px-6 text-base' → 'h-14 px-6 text-base'
  ```
  Hoặc extend `tailwind.config.ts`:
  ```ts
  theme: { extend: { spacing: { '13': '3.25rem' } } }
  ```

### B4. Chatbot in-memory cooldown KHÔNG survive Vercel cold start
- **File**: `lib/chatbot/client.ts:33,44,53-86`
- **Vấn đề**: `_rateLimitCooldowns` là module-level `Map` trong Node process. Vercel cold start → isolate mới, instances khác nhau không share state. Provider X 429 ở instance A, instance B không biết → lại gọi X, lại 429, lại timeout 25s. **Đây chính là "lỗi chatbot deploy Vercel" mà user báo cáo.**
- **Fix**: Dùng Upstash Redis (flows.md:1297 đã document env `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).
  ```ts
  import { Redis } from '@upstash/redis';
  const redis = process.env.UPSTASH_REDIS_REST_URL
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
    : null;
  const KEY = (p: string) => `chat:cd:${p}`;

  export async function isProviderAvailable(p: string) {
    if (!redis) return true;
    const until = Number(await redis.get(KEY(p)));
    return !until || Date.now() >= until;
  }
  export async function markProviderRateLimited(p: string, msg?: string) {
    // parse Retry-After từ msg, default 60s
    const ms = parseRetryAfter(msg) ?? 60_000;
    if (redis) await redis.set(KEY(p), Date.now() + ms, { px: ms });
    else _rateLimitCooldowns.set(p, Date.now() + ms);
    return ms;
  }
  ```
  Sau đó update `app/api/chat/route.ts` để `await` các hàm này.
- **Cấu hình Vercel cần thêm**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

### B5. `maxDuration = 30` bị Vercel Hobby plan cap xuống 10s
- **File**: `app/api/chat/route.ts:14`
- **Vấn đề**: Vercel Hobby = 10s ceiling (chỉ Pro mới 60s). `STREAM_TIMEOUT_MS = 25_000` (line 125) sẽ không bao giờ fire sạch — function bị force-kill giữa stream. User nhận text truncated + `chat_messages` row không được save.
- **Fix**:
  ```ts
  export const maxDuration = 25;  // Hobby: silent cap to 10s, Pro: 60s
  const STREAM_TIMEOUT_MS = 9_000; // 9s Hobby (1s buffer cho onFinish DB write)
  ```
  Nếu chắc chắn Pro plan: `maxDuration = 60; STREAM_TIMEOUT_MS = 55_000`.

### B6. `experimental_context` không tồn tại trong AI SDK v6
- **File**: `app/api/chat/route.ts:277-283`
- **Vấn đề**: `ai@^6.0.230` (xem `package.json:25`). `streamText` v6 không chấp nhận `experimental_context` (đã bỏ từ v5). Có thể silent ignore hoặc throw "unknown argument" → `/api/chat` 500.
- **Fix**: Drop dòng đó, thread context qua closure/WeakMap:
  ```ts
  // Bỏ experimental_context: { sessionId, userId, ... }
  // Tool factories nhận ctx qua param thay vì qua streamText options
  const toolsWithCtx = withContext(allTools, { sessionId, userId, provider: entry.provider, model: entry.modelName });
  const result = streamText({
    model: entry.instance as any,
    system: SYSTEM_PROMPT,
    messages: modelMessages as any,
    tools: toolsWithCtx,
    stopWhen: stepCountIs(4),
  });
  ```

### B7. Server set cookie `httpOnly` nhưng client cố `document.cookie` đọc
- **Files**: `app/api/chat/route.ts:42-47` ↔ `hooks/use-chat-session.ts:22-32`
- **Vấn đề**: Server set `httpOnly: true` → browser không cho JS đọc → `useChatSession` luôn thấy cookie missing → mint UUID mới mỗi page load → multi-turn session không ổn định qua reload.
- **Fix**: Bỏ `httpOnly` (cookie này không phải secret, chỉ là session identifier):
  ```ts
  cookieStore.set(COOKIE_NAME, clientId, {
    // httpOnly: true,  // REMOVED
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  ```

### B8. CHAT_PROVIDERS env không document trong flows.md + không set trên Vercel
- **Files**: `lib/chatbot/client.ts:149-163, 248-305` + `app/api/chat/route.ts:236-259`
- **Vấn đề**: flows.md §env list chỉ liệt kê `AI_PRIMARY`, `GROQ_API_KEY`, `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY`. Không có `CHAT_PROVIDERS`, `OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`. Nếu user chỉ set Groq key → Groq 429 → fallback chain rỗng → 503 `NO_PROVIDER`.
- **Fix cấu hình (Vercel Dashboard → Environment Variables)**:
  ```
  CHAT_PROVIDERS=groq:llama-3.1-8b-instant,openrouter:meta-llama/llama-3.3-70b-instruct:free,cerebras:llama-3.3-70b,cloudflare:@cf/meta/llama-3.1-8b-instruct,gemini:gemini-2.0-flash
  AI_PRIMARY=groq
  GROQ_API_KEY=... (đã có)
  OPENROUTER_API_KEY=... (thêm)
  CEREBRAS_API_KEY=... (thêm)
  CLOUDFLARE_API_KEY=... (thêm)
  CLOUDFLARE_ACCOUNT_ID=... (thêm)
  GOOGLE_AI_API_KEY=... (đã có)
  OPENAI_API_KEY=... (optional)
  UPSTASH_REDIS_REST_URL=... (cho B4)
  UPSTASH_REDIS_REST_TOKEN=... (cho B4)
  ```
- **Fix code (defensive logging)**: `app/api/chat/route.ts:92-115` thêm list env nào thiếu + cooldown info vào response 503.

### B9. Orders table `min-w-[860px]` — bắt buộc scroll ngang trên phone
- **File**: `app/(admin)/admin/orders/page.tsx:257-259`
- **Vấn đề**: 8 cột × iPhone 375px → user phải swipe ngang để đọc. Admin mobile không thể dùng.
- **Fix**: Tạm thời: `min-w-[640px]` + `text-[10px] px-2 md:px-3`. Tốt hơn: thêm card view khi `<md:`.
  ```tsx
  <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-xs sm:text-sm">
    <thead><tr className="text-[10px] sm:text-xs">...</tr></thead>
  ```

### B10. Products table `min-w-[1024px]` — overflow ngay cả trên iPad portrait (768px)
- **File**: `app/(admin)/admin/products/page.tsx:429-430`
- **Fix**: `min-w-[760px]` + padding `px-3 md:px-6` thay vì `px-6` cứng.

### B11. Chatbot admin `grid-cols-2/3` không collapse trên mobile
- **Files**: `app/(admin)/admin/chatbot/page.tsx` lines **248, 474, 707, 1141, 1190**
- **Fix** (5 chỗ):
  ```tsx
  // grid-cols-2 → grid-cols-1 sm:grid-cols-2
  // grid-cols-3 → grid-cols-1 sm:grid-cols-3
  ```

### B12. flows.md claim `pg_cron release_expired_locks` đã done — SAI
- **Files**: `flows.md:99, 609` vs `supabase/migrations/0001_initial_schema.sql:416` + `0010_*.sql`
- **Vấn đề**: flows.md §0 line 99 và §13 line 609 claim ✅ pg_cron enabled (migration 0010). Thực tế: **không migration nào enable `pg_cron` extension hoặc gọi `cron.schedule()`**. Chỉ có comment "Bật pg_cron trong Database → Extensions" ở 0001. Lock expired **không tự động release** nếu user đóng browser — chỉ release khi user click "Unlock" hoặc gọi `/api/unlock-item`.
- **Tác động**: 10-phút lock thực tế tồn tại mãi mãi nếu user không quay lại → user khác click "Giữ hàng" bị 410 ngay cả khi sản phẩm AVAILABLE.
- **Fix**:
  ```sql
  -- supabase/migrations/0022_enable_pg_cron.sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  SELECT cron.schedule('release-expired-locks', '* * * * *', $$
    UPDATE inventory_locks
    SET status = 'EXPIRED', released_at = NOW()
    WHERE status = 'ACTIVE' AND expires_at <= NOW();
  $$);
  ```
  Sau đó update flows.md line 99 + 609 từ ❌/✅ cho đúng.

---

## 2. 🟠 HIGH — Visible regression

### H1. Navbar padding `px-8` quá rộng trên phone ≤360px
- **File**: `components/layout/navbar.tsx:36, 130`
- **Fix**: `px-4 sm:px-6 lg:px-8` ở cả 2 chỗ.

### H2. Z-index war zone — 6 element đều `z-50`
- **Files**: `app/(store)/layout.tsx:75, 81` · `components/chatbot/chat-bubble.tsx:19` · `components/chatbot/chat-panel.tsx:36` · `components/search/search-autocomplete.tsx:260` · `app/(store)/tai-khoan/don-hang/[code]/customer-action-buttons.tsx:185` · `app/layout.tsx` (Toaster)
- **Fix**: Establish z-stack rõ ràng:
  ```
  bottom-nav:    z-30
  chat-panel:    z-40
  chat-bubble:   z-50
  navbar sticky: z-[60]
  search drop:   z-[70]
  toaster:       z-[80]
  modal overlay: z-[90]
  ```

### H3. Sticky header 96px trên mobile nhưng `<main>` không có `pt-`
- **File**: `app/(store)/layout.tsx:75-85`
- **Vấn đề**: announcement bar (36px) + navbar (60px) = 96px sticky. `<main>` chỉ có `pb-20` → content đầu tiên bị ẩn dưới header khi scroll anchor.
- **Fix**:
  ```tsx
  // app/(store)/layout.tsx
  <main className="min-h-[calc(100vh-4rem)] pb-20 pt-[96px] lg:pb-0 lg:pt-0">
  // app/globals.css — thêm vào @layer base
  html { scroll-padding-top: 110px; }
  ```

### H4. Search autocomplete bị clip bởi `overflow-hidden` của mobile menu
- **File**: `components/layout/navbar.tsx:123` ↔ `components/search/search-autocomplete.tsx:260`
- **Fix**: Đổi `overflow-hidden` thành `overflow-visible` ở line 123, hoặc move search input ra dedicated sheet/page. Quick fix: `overflow-visible` + dùng height animation khác.

### H5. HoldButton `size="lg"` bị ảnh hưởng B3
- **File**: `app/(store)/san-pham/[slug]/page.tsx:182`
- **Fix**: Resolve bằng B3, hoặc đổi thành `size="md"` + custom `py-3`.

### H6. `onFinish` Supabase insert có thể race với stream timeout
- **File**: `app/api/chat/route.ts:284-313`
- **Vấn đề**: awaited insert — nếu Supabase chậm >1s, user disconnect, Vercel kill lambda trước khi insert xong → message mất khỏi history.
- **Fix**: Fire-and-forget + Vercel `waitUntil`:
  ```ts
  import { waitUntil } from '@vercel/functions';
  // npm i @vercel/functions
  onFinish: ({ text, usage }) => {
    waitUntil((async () => {
      try {
        await supabaseAdmin.from('chat_messages').insert({
          session_id: sessionId, role: 'assistant', content: text,
          tokens_used: usage?.totalTokens ?? null,
        });
        await supabaseAdmin.from('chat_sessions')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', sessionId);
      } catch (e) {
        console.error('[api/chat] persist failed:', e);
      }
    })());
  },
  ```

### H7. Body parser không giới hạn size → DoS surface
- **File**: `app/api/chat/route.ts:22-35`
- **Fix**:
  ```ts
  const CONTENT_LENGTH_LIMIT = 256 * 1024;
  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > CONTENT_LENGTH_LIMIT) {
    return Response.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const { messages = [] } = body;
  if (!Array.isArray(messages) || messages.length === 0) return Response.json({ error: 'NO_MESSAGES' }, { status: 400 });
  if (messages.length > 50) return Response.json({ error: 'TOO_MANY_MESSAGES' }, { status: 400 });
  ```

### H8. MediaPicker `max-w-5xl` overflow phone
- **File**: `components/admin/media/media-picker.tsx:272, 284`
- **Fix**: `max-w-full sm:max-w-5xl` + `max-h-screen sm:max-h-[90vh]`.

### H9. Admin sidebar backdrop `z-40` che mất header `z-30`
- **File**: `components/layout/admin-sidebar.tsx:72`
- **Fix**: Đổi backdrop thành `z-30`, sidebar thành `z-40` (giữ header z-50).

### H10. Chat panel `bottom-24` overflow landscape phone
- **File**: `components/chatbot/chat-panel.tsx:36`
- **Fix**: `bottom-20 right-4 z-40 sm:right-6 lg:bottom-28 lg:right-8` + `max-h-[calc(100dvh-6rem)]`.

### H11. Hydration mismatch ở `useChatSession` — sessionId split
- **Files**: `hooks/use-chat-session.ts:16-35` ↔ `components/chatbot/chat-widget.tsx:48, 84`
- **Vấn đề**: SSR `null` → client `useEffect` ghi cookie → first POST có `sessionId: undefined` → server mint cookie mới → history load thiếu message đầu.
- **Fix**: Generate synchronously trong `useState` initializer (xem B7 — sau khi bỏ httpOnly thì client có thể đọc cookie ngay render đầu).

### H12. Body không có `overflow-x-hidden` → có thể scroll ngang do navbar logo dài
- **File**: `app/globals.css:17-28`
- **Fix**:
  ```css
  body { overflow-x: hidden; }
  ```

### H13. `min-h-[calc(100vh-4rem)]` không khớp với header 96px thực tế
- **File**: `app/(store)/layout.tsx:85`
- **Fix**: đã cover ở H3.

### H14. SSE parser `chat-widget.tsx` không handle multi-line `data:`
- **File**: `components/chatbot/chat-widget.tsx:96-197`
- **Vấn đề**: Split trên `\n` đơn — JSON pretty-printed payload có newline bị chia đôi, parse fail silent.
- **Fix**: Dùng built-in `useChat` của `@ai-sdk/react@^3` (đã có trong `package.json:26`) — đây là path được support cho AI SDK v6. Hoặc split trên `\n\n` (SSE event boundary):
  ```ts
  let buffer = '';
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split('\n\n');
  buffer = events.pop() || '';
  for (const block of events) {
    const dataLines = block.split('\n').filter(l => l.startsWith('data:'));
    if (!dataLines.length) continue;
    const payload = dataLines.map(l => l.slice(5).trim()).join('');
    // ...
  }
  ```

---

## 3. 🟡 MEDIUM — Polish / robustness

### M1. Announcement bar `<p>` có thể wrap phá sticky header height
- **File**: `components/layout/announcement-bar.tsx:22`
- **Fix**: Thêm `truncate` lên `<p>`.

### M2. Hero CTA không full-width trên mobile
- **File**: `components/home/hero-section.tsx:71-87`
- **Fix**: `flex-col sm:flex-row` + `w-full sm:w-auto` trên 2 Link.

### M3. Console.log spam → tốn Vercel log quota + leak PII
- **Files**: `app/api/chat/route.ts` (~10 chỗ), `lib/chatbot/client.ts:83, 258, 288`
- **Fix**: Gate sau `NODE_ENV !== 'production'`:
  ```ts
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) console.log('[api/chat] ...');
  ```

### M4. `toDataStreamResponse` fallback v6 không tồn tại → trả plain JSON không SSE events
- **Files**: `app/api/chat/route.ts:391-416` ↔ `components/chatbot/chat-widget.tsx:88-94`
- **Fix**: Chỉ dùng `toUIMessageStreamResponse` (v5+); fallback `await result.text` + trả JSON `{ text }` + client detect Content-Type không phải `text/event-stream` để skip SSE loop.

### M5. Admin shell `<main>` không có `overflow-x-hidden`
- **File**: `components/layout/admin-shell.tsx:29`
- **Fix**: thêm `overflow-x-hidden`.

### M6. Modal không có fullscreen variant mobile
- **File**: `components/ui/modal.tsx:27-31, 141-143`
- **Fix**: Thêm `'full': 'max-w-full sm:max-w-lg'` + `size="full"` prop. Đổi `p-4` → `p-2 sm:p-4` ở outer wrapper.

### M7. Ad-hoc modal thiếu portal + ESC handler
- **Files**: `components/admin/product-form.tsx:1742` (DeleteModal), `app/(admin)/admin/newsletter/page.tsx:359` (confirm delete)
- **Fix**: Refactor về dùng `<Modal>` component (đã có ESC + portal).

### M8. `useChatSession` không có `'use client'` directive?
- **File**: `hooks/use-chat-session.ts` — verify line đầu có `'use client';`

### M9. Newsletter table `min-w-[720px]`
- **File**: `app/(admin)/admin/newsletter/page.tsx:230`
- **Fix**: `min-w-[640px]` (đã có responsive padding nên OK).

### M10. Chatbot Leads table không có min-w, mobile xấu
- **File**: `app/(admin)/admin/chatbot/page.tsx:1314-1336`
- **Fix**: thêm `min-w-[480px]` wrapper scroll ngang, hoặc dùng `<dl>` card view.

### M11. Admin sidebar thiếu ESC handler đóng
- **File**: `components/layout/admin-sidebar.tsx`
- **Fix**: `useEffect` listen `keydown` Escape khi `mobileOpen`.

### M12. CORS preflight missing → fail nếu embed chatbot ở domain khác
- **File**: `app/api/chat/route.ts` (no OPTIONS)
- **Fix**:
  ```ts
  export async function OPTIONS() {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }});
  }
  ```

### M13. `crypto.randomUUID()` cần Node 20+
- **File**: `app/api/chat/route.ts:41`, `hooks/use-chat-session.ts:28`
- **Fix**: Thêm vào `package.json`:
  ```json
  "engines": { "node": ">=20" }
  ```

### M14. Cohere provider trong flows.md không implement
- **File**: `lib/chatbot/client.ts:218-220` (no `case 'cohere'`)
- **Fix**: Remove `cohere` khỏi `CHAT_PROVIDERS` env, hoặc thêm Cohere case.

### M15. Chatbot tabs active underline alignment polish
- **File**: `app/(admin)/admin/chatbot/page.tsx:120-150`
- **Fix**: Thêm `pb-px` ở wrapper tab strip.

---

## 4. ⚪ LOW — Consistency

### L1. Sidebar width SSR/CSR mismatch (cosmetic)
- **File**: `components/layout/admin-sidebar.tsx:57-63, 79`

### L2. Button radius drift: `rounded-sm` (admin) vs `rounded-md` (UI) vs `rounded` (dialog)
- **Files**: `components/ui/button.tsx:35`, `components/ui/confirm-dialog.tsx:81, 97`, `components/admin/product-form.tsx:165-170`
- **Fix**: Standardize thành `rounded-md`.

### L3. Admin pages dùng raw `<button>` thay vì `<Button>` — string drift
- **Files**: `components/admin/product-form.tsx`, `collection-form.tsx`, bulk-upload
- **Fix**: Refactor dùng `<Button size="sm" variant="primary">` shared.

### L4. Admin hand-rolled gold button 3 chỗ có string khác nhau (`bg-gold text-[#3C2F00]` vs `bg-gold/90 hover:bg-gold`)
- **Fix**: Extract `adminBtn` helper.

### L5. `next@14.2.15` + `ai@^6` peer dep có thể warn
- **File**: `package.json:25, 29`
- **Fix**: Pin `ai@^5 @ai-sdk/react@^2` cho Next 14 compatibility (an toàn nhất), hoặc upgrade Next 15.

### L6. Admin shell layout thừa `border-l` border-radius trên logout button
- **File**: `components/layout/admin-header.tsx:240-251` — minor.

---

## 5. 📋 FLOWS.MD DOCUMENTATION DRIFT

| Mục flows.md | Status | Action |
|---|---|---|
| §0 line 99: "✅ pg_cron `release_expired_locks` (migration 0010)" | ❌ FALSE | Sửa thành ❌ + apply migration 0022 (xem B12) |
| §13 line 609: "❌ pg_cron `release_expired_locks`" | ✅ đúng, đã ghi ❌ | Giữ nguyên (đã đúng) |
| §11 line 661: "❌ cron cancel PENDING > 30min" | ✅ đúng | Giữ nguyên |
| §0 line 33: "§18 gần xong" | ⚠️ STALE | §18 thực tế gần ✅ DONE (4 auth pages + 7 dashboard tabs + 6 APIs + middleware + auto-link). Sửa thành "✅ done — còn polish email confirm + reviews on PDP" |
| §18 inline (line 2926): "❌ account/don-hang/[code]" | ❌ STALE | Đã có file. Sửa thành ✅ |
| §18 inline: "❌ auto-link guest orders on signup" | ❌ STALE | Đã có migration 0011 + RPC `link_my_guest_orders`. Sửa thành ✅ |
| §18: "4 auth pages + 5 APIs" | ⚠️ inaccurate | Thực tế: 4 pages (Vietnamese slugs `dang-nhap/dang-ky/quen-mat-khau/dat-lai-mat-khau`) + **4 routes** (reset-password, logout, customer-logout, callback). Login/register dùng Supabase client SDK, không cần API. |
| §18: "migration 0011" cho account schema | ⚠️ mislabeled | Account schema là `0009_user_account.sql`; 0011 chỉ là email-link. Update doc. |
| Env list (flows.md §env) thiếu `CHAT_PROVIDERS`, `OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID` | ❌ MISSING | Thêm 5 env này vào §1.3 |
| Env list thiếu `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (flows.md:1297 đã có nhưng §1.3 thiếu) | ⚠️ PARTIAL | Bổ sung §1.3 |
| Migration `0010_*.sql` có 2 file | ❌ OPS BUG | `0010_storage_jewelry_images.sql` + `0010_product_reserved.sql`. Supabase CLI sẽ chỉ chạy 1. Rename 1 trong 2 thành `0011_*` (đụng 0011 đã có → đổi tên `0010_storage_*` thành `0009_storage_jewelry_images.sql`?) hoặc merge 2 file thành 1. |
| §0 line 25: "AI Chatbot Suggested Answers + Cluster Analytics (sprint 2026-07-22 buổi sáng)" | ✅ matches migration 0019 + code | OK |
| §0 line 26-30 (các sprint 2026-07-23) | ✅ matches migration 0021 + components | OK |

---

## 6. 🗺️ SPRINT ĐỀ XUẤT

### Sprint 1 — BLOCKER (2h, ship ngay)
1. **B3** (5 min) — đổi `h-13` → `h-14` ở 2 file
2. **B1** (10 min) — import + mount `MobileFooter`
3. **B2** (2 min) — đổi chat-bubble positioning
4. **B12** (15 min) — viết migration 0022 + apply pg_cron
5. **B4** (30 min) — Upstash Redis cooldown
6. **B5** (2 min) — `maxDuration = 25`, `STREAM_TIMEOUT_MS = 9_000`
7. **B6** (15 min) — drop `experimental_context`
8. **B7** (2 min) — bỏ `httpOnly` ở cookie
9. **B8** (10 min) — thêm env config + defensive logging 503
10. **B9 + B10** (15 min) — orders/products table min-w
11. **B11** (10 min) — chatbot form grid responsive

### Sprint 2 — HIGH (3h)
12. H1, H2, H3, H4, H12, H13 (navbar padding + z-stack + sticky padding + search + overflow-x) — 30 min
13. H5 (resolved by B3)
14. H6 (waitUntil fire-and-forget) — 15 min
15. H7 (body parser limits) — 10 min
16. H8 (MediaPicker responsive) — 10 min
17. H9 (sidebar z-index) — 5 min
18. H10 (chat panel positioning) — 5 min
19. H11 (useChatSession sync generation) — 15 min
20. H14 (SSE parser fix) — 30 min

### Sprint 3 — MEDIUM + LOW (3h polish)
21. M1-M15 + L1-L6 (xem list trên)

### Sprint 4 — Doc cleanup (30 min)
22. Apply tất cả fix từ §5 (flows.md drift).

---

## 7. 📁 FILES CẦN EDIT (MASTER LIST)

**Components**:
- `app/(store)/layout.tsx` — B1, H2, H3, H13
- `app/(store)/san-pham/[slug]/page.tsx` — H5
- `app/(store)/don-hang/[code]/thanh-toan/bank-payment-client.tsx` — (đã OK theo flows)
- `app/(store)/tai-khoan/don-hang/[code]/customer-action-buttons.tsx` — H2
- `components/ui/button.tsx` — B3
- `components/ui/wishlist-button.tsx` — B3
- `components/ui/modal.tsx` — M6
- `components/chatbot/chat-bubble.tsx` — B2, H2
- `components/chatbot/chat-panel.tsx` — H2, H10
- `components/chatbot/chat-widget.tsx` — H11, H14, M4
- `components/home/mobile/mobile-footer.tsx` — (đã có sẵn, không edit)
- `components/home/hero-section.tsx` — M2
- `components/layout/navbar.tsx` — H1, H2, H4
- `components/layout/announcement-bar.tsx` — M1
- `components/layout/admin-sidebar.tsx` — H9, M11, L1
- `components/layout/admin-shell.tsx` — M5
- `components/layout/admin-header.tsx` — L6
- `components/admin/product-form.tsx` — M7, L3, L4
- `components/admin/collections/collection-form.tsx` — L3, L4
- `components/admin/media/media-picker.tsx` — H8

**Hooks**:
- `hooks/use-chat-session.ts` — B7, H11, M8

**API routes**:
- `app/api/chat/route.ts` — B4 (await), B5, B6, B8, H6, H7, M3, M4, M12
- `app/api/orders/[code]/customer-action/route.ts` — (đã OK)
- `app/api/admin/orders/route.ts` + `export` — (đã update theo flows)

**Admin pages**:
- `app/(admin)/admin/orders/page.tsx` — B9
- `app/(admin)/admin/products/page.tsx` — B10
- `app/(admin)/admin/newsletter/page.tsx` — M7, M9
- `app/(admin)/admin/chatbot/page.tsx` — B11, M10, M15

**Lib**:
- `lib/chatbot/client.ts` — B4 (Redis), M3, M14

**Styles**:
- `app/globals.css` — H3 (scroll-padding-top), H12 (overflow-x)

**Migrations** (tạo mới):
- `supabase/migrations/0022_enable_pg_cron.sql` — B12
- `supabase/migrations/0023_merge_duplicate_0010.sql` hoặc rename 1 file — fix migration dup

**Config**:
- `package.json` — M13 (engines), L5 (ai@^5 downgrade)
- `tailwind.config.ts` — (optional) extend spacing `13`
- `.env` (Vercel) — B8 (5 AI keys + CHAT_PROVIDERS), B4 (Upstash)

**Docs**:
- `flows.md` — §5 list đầy đủ

---

## 8. 🧪 VERIFICATION CHECKLIST (sau khi fix)

- [ ] Mở Chrome DevTools mobile (iPhone SE 375px) → check footer có hiển thị dưới bottom nav, không bị đè
- [ ] Click chat bubble → panel mở, không che icon cart/account
- [ ] Mở PDP `/san-pham/[any]` → "Giữ hàng 10 phút" button có height ~52px, không collapse
- [ ] `/momo/return` → 4 button `size="lg"` render đúng kích thước
- [ ] Deploy preview trên Vercel → `/admin/orders` table scroll ngang mượt, không overflow viewport
- [ ] Deploy preview → mở chatbot, hỏi "shop có chính sách đổi trả không" → bot trả lời, không 503
- [ ] Test Vercel logs → không còn `console.log` spam mỗi request (chỉ dev mode)
- [ ] Vercel function logs → kiểm tra `chat:cd:*` keys có trong Upstash dashboard
- [ ] Check Supabase → bảng `inventory_locks` có rows chuyển sang `EXPIRED` sau khi hết hạn (cron chạy mỗi phút)
- [ ] Test admin mobile `/admin/chatbot` → form fields stack 1 cột trên phone, 2-3 cột trên tablet+

---

**Tổng kết**: 47 bugs (12 BLOCKER + 14 HIGH + 15 MEDIUM + 6 LOW + 11 docs drift). Sprint 1 (BLOCKER) ~2h sẽ fix được toàn bộ vấn đề người dùng report. Sprint 2-3 polish. Sprint 4 dọn docs.