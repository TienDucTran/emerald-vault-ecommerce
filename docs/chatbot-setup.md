# AI Chatbot Setup — Emerald Vault

> Feature tư vấn sản phẩm bằng AI, dùng Vercel AI SDK + Gemini 2.5 Flash (free tier) + Supabase pgvector.
> Spec: `flows.md §15`. Stack reference: `flows.md §15.2.3, §15.5–§15.7`.

## 1. Cấu trúc file đã tạo

### Database (3 migrations, apply theo thứ tự)
- `supabase/migrations/0012_chatbot_schema.sql` — pgvector extension, `products.embedding` (vector 1536) + `embedding_text`, `chat_sessions`, `chat_messages`, RLS, RPC `match_products`, RPC `upsert_chat_session`.
- `supabase/migrations/0013_embed_trigger.sql` — trigger tự build `embedding_text` từ title/desc/material/category/tier/season_tags.
- `supabase/migrations/0014_product_embedding_update.sql` — RPC `update_product_embedding(p_id, p_vec)` (dùng bởi batch script).

### Backend (lib/chatbot/)
- `config.ts` — env singleton (AI_PRIMARY, EMBED_PRIMARY, isConfigured).
- `client.ts` — provider switcher (Gemini → OpenAI → Groq).
- `system-prompt.ts` — "Bà Chủ Tiệm" persona.
- `tools.ts` — 4 tools: searchProducts, semanticSearch, getProductDetail, getCurrentCollections.
- `embeddings.ts` — wrapper cho embedMany (Gemini/OpenAI).

### API + Hook
- `app/api/chat/route.ts` — POST stream handler, sliding window 10 messages, persist chat_sessions/messages.
- `hooks/use-chat-session.ts` — client hook quản lý sessionId qua cookie.

### UI (components/chatbot/)
- `chat-widget.tsx` — root, dùng `useChat` từ `@ai-sdk/react`.
- `chat-panel.tsx` — panel với header + messages + input.
- `chat-bubble.tsx` — floating button góc phải dưới.
- `chat-input.tsx` — textarea auto-resize + Enter to send.
- `chat-message.tsx` — render message (text + product cards từ tool results).
- `chat-product-card.tsx` — mini card sản phẩm nhúng trong message.
- `chat-welcome.tsx` — welcome + 4 gợi ý câu hỏi.

### Scripts
- `scripts/embed-all-products.ts` — batch embed toàn bộ products. Chạy 1 lần khi setup, hoặc khi đổi embedding model.

## 2. Setup từng bước

### Bước 1: Cài dependencies
**Yêu cầu**: Node.js **22+** (Node 20 thiếu native WebSocket → `@supabase/supabase-js` fail ở `RealtimeClient._initializeOptions`). Nếu đang ở Node 20, tải Node 22 LTS từ https://nodejs.org trước.

```bash
# Runtime (AI SDK)
npm install ai @ai-sdk/react @ai-sdk/google @ai-sdk/groq @ai-sdk/openai

# Dev (cần cho script embed-all-products.ts)
npm install -D tsx
```
Nếu đã có → skip. **Bắt buộc** cài `tsx` (devDep) — không có sẽ fail với `ERR_MODULE_NOT_FOUND: Cannot find package 'tsx'` khi chạy `node --import tsx`.

### Bước 2: Apply migrations lên Supabase
Mở Supabase Dashboard → SQL Editor, chạy lần lượt:
1. `0012_chatbot_schema.sql`
2. `0013_embed_trigger.sql`
3. `0014_product_embedding_update.sql`

**Lưu ý**: Bật extension `vector` (pgvector) trước khi chạy 0012. Vào Database → Extensions → search "vector" → Enable.

### Bước 3: Set env variables
Thêm vào `.env.local` (KHÔNG commit):
```bash
# === AI Chatbot (flows.md §15.15) ===
# Chọn 1 trong 3 — ưu tiên Groq (ổn định nhất cho account mới)
GROQ_API_KEY=<lấy từ https://console.groq.com/keys>                # FREE 30 RPM, không cần thẻ — KHUYẾN NGHỊ
AI_PRIMARY=groq                                                    # 'groq' | 'gemini' | 'openai'

GOOGLE_AI_API_KEY=<lấy từ https://aistudio.google.com/apikey>      # FREE nhưng account mới hay bị quota 0
EMBED_PRIMARY=gemini                                               # Embedding vẫn dùng Gemini (OK)

# Optional (trả phí)
OPENAI_API_KEY=<lấy từ https://platform.openai.com>                # $5 deposit đủ dùng 1 năm
```

**Lưu ý quan trọng**:
- Code có **multi-provider chain auto-fallback** (`lib/chatbot/client.ts`): thứ tự ưu tiên theo `AI_PRIMARY` env → các provider còn lại có key. Nếu provider đang dùng fail (quota 0 / 404 retired / 401 invalid key), route tự thử provider tiếp theo — KHÔNG cần user đổi config. Log sẽ ghi `Using <provider>/<model> (of N available)`.
- Gemini free tier năm 2026 hay bị `Quota exceeded: limit: 0` cho account mới (kể cả khi enable đầy đủ trong AI Studio). Khuyến nghị set `GROQ_API_KEY` (free 30 RPM, lấy tại https://console.groq.com/keys) làm fallback — code sẽ tự switch sang Groq khi Gemini fail.

### Bước 3.5: (Optional) Cấu hình multi-provider chain

Mặc định code thử provider theo `AI_PRIMARY` env → fallback các provider còn key. Bạn có thể config thứ tự ưu tiên tùy ý qua `CHAT_PROVIDERS`:

```bash
# Thứ tự: Groq (nhanh, free) → Gemini (chất lượng cao cho tiếng Việt) → OpenAI (trả phí, fallback cuối)
CHAT_PROVIDERS=groq:llama-3.3-70b-versatile,gemini:gemini-2.0-flash,openai:gpt-4o-mini
```

**Format**: `provider1:model1,provider2:model2,provider3:model3`
- Mỗi entry: `<provider>:<modelName>`
- Thứ tự = thứ tự ưu tiên (entry đầu thử trước)
- Provider không có key sẽ tự bị skip
- Nếu `CHAT_PROVIDERS` không set → dùng `AI_PRIMARY` (backward compat)

**Khi nào dùng**: Khi muốn ưu tiên 1 provider nhưng tự động fallback. Ví dụ:
- Ưu tiên Groq (rẻ) → nếu Groq fail quota thì Gemini → cuối cùng OpenAI
- Ưu tiên Gemini 2.5 Pro (chất lượng cao) → nếu retire/404 thì Groq

### Bước 4: Embed products
```bash
node --env-file=.env.local --import tsx scripts/embed-all-products.ts
```
Mặc định chỉ embed rows chưa có vector. Flags:
- `--all` — re-embed tất cả (khi đổi model).
- `--limit N` — test với N rows đầu.

Script delay 1.1s giữa các batch (respect Gemini free 15 RPM).

### Bước 5: Test
```bash
npm run dev
```
- Mở `http://localhost:3000` → thấy bubble góc phải dưới.
- Click → gõ "Có nhẫn bạc 925 nào không?" → bot sẽ gọi tool `searchProducts` → trả về cards.
- Thử "Bộ sưu tập mùa hè 2026" → gọi `getCurrentCollections`.
- Thử câu hỏi semantic ("vintage thanh lịch") → gọi `semanticSearch`.

## 3. Cấu hình nâng cao

### Đổi model
Sửa `lib/chatbot/client.ts` (chọn `gpt-4o-mini` / `llama-3.3-70b-versatile` / `gemini-2.5-pro`).

### Đổi embedding dim
Mặc định 1536 (compatible với OpenAI text-embedding-3-small + Gemini outputDimensionality=1536).
Nếu muốn 768 (Gemini native):
- Sửa migration 0012: `vector(768)` thay vì `vector(1536)`.
- Sửa `lib/chatbot/config.ts` → `outputDimensionality: 768`.
- Re-embed: `npm run embed:all -- --all`.

### Rate limit
Hiện chưa có. Thêm middleware cho `/api/chat` sau (Upstash Redis, 20 msg/phút/IP).

### Custom system prompt
Sửa `lib/chatbot/system-prompt.ts` (giữ 8 quy tắc BẮT BUỘC).

## 4. Giám sát & vận hành

- **Chat sessions**: query `SELECT client_id, user_id, last_message_at FROM chat_sessions ORDER BY last_message_at DESC LIMIT 50;`
- **Message count theo session**: `SELECT session_id, COUNT(*) FROM chat_messages GROUP BY session_id;`
- **Token usage**: `SELECT DATE_TRUNC('day', created_at) AS day, SUM(tokens_used) FROM chat_messages WHERE tokens_used IS NOT NULL GROUP BY 1 ORDER BY 1 DESC;`
- **Tool call audit**: inspect `chat_messages.tool_calls` (JSONB).

## 5. Troubleshooting

| Vấn đề | Nguyên nhân | Fix |
|---|---|---|
| Bubble hiện nhưng click không gửi | `@ai-sdk/react` chưa cài | `npm i @ai-sdk/react` |
| Bot trả "chưa cấu hình" | Thiếu `GOOGLE_AI_API_KEY` | Set env + restart dev |
| Bot trả rỗng | Chưa embed products | Chạy `embed-all-products.ts` |
| `semanticSearch` trả [] | Embedding chưa có hoặc sai dim | Verify `SELECT COUNT(*) FROM products WHERE embedding IS NOT NULL;` |
| Build fail TypeScript | API AI SDK version mismatch | Verify `npm ls ai @ai-sdk/react @ai-sdk/google` đều cùng major (5.x) |
| Stream cắt giữa chừng | Timeout 30s | Tăng `maxDuration` ở `app/api/chat/route.ts` |
| `ERR_MODULE_NOT_FOUND: Cannot find package 'tsx'` | `tsx` chưa cài (devDep) | `npm i -D tsx` |
| `Error: Node.js detected but native WebSocket not found` | Đang chạy Node 20 (thiếu `globalThis.WebSocket`) | Upgrade Node lên 22+ |
| `TypeError: append is not a function` | `@ai-sdk/react` API khác version | Đã refactor `chat-widget.tsx` dùng `fetch + ReadableStream` thay `useChat` (bypass API change v1↔v2). Nếu vẫn lỗi → clear `.next` cache + `npm run dev` lại |
| Stream response parse lỗi hoặc không hiển thị | `toUIMessageStreamResponse` không tồn tại (đang dùng `ai@1.x`) | Route đã fallback `toDataStreamResponse`. Verify version: `npm ls ai` |
| `AI_APICallError: 404 — models/gemini-2.5-flash is no longer available to new users` | Google retire `gemini-2.5-flash` cho account mới | Đã đổi sang `gemini-2.0-flash` trong `lib/chatbot/client.ts`. Nếu muốn quay lại 2.5: enable trong Google AI Studio → Models → đổi tên trong code |
| `AI_APICallError: 429 — quota exceeded, limit: 0` | Account Gemini mới chưa enable free tier (Google restrict mạnh 2026) | **Đổi sang Groq**: lấy key free tại https://console.groq.com/keys (30s, không cần thẻ), set `AI_PRIMARY=groq` + `GROQ_API_KEY=gsk_...` trong `.env.local`. Code auto-fallback khi Gemini fail. |
