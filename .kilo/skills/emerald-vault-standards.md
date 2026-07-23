---
name: emerald-vault-standards
description: Quy chuẩn bắt buộc khi code/fix/refactor bất kỳ file nào trong dự án Emerald Vault. Load skill này TRƯỚC MỌI THAY ĐỔI để tránh lặp lại bug đã fix (TypeScript never, NaN, AI SDK v6 format, Supabase generic narrowing, v.v.).
---

# Emerald Vault — Coding Standards (BẮT BUỘC)

Skill này tổng hợp toàn bộ bug + pattern đã được resolve qua 4 sprint chatbot. Mục tiêu: **bất kỳ thay đổi nào cũng phải áp dụng các pattern này từ đầu**, không để lặp lại lỗi cũ.

---

## 0. Trước khi code — bắt buộc đọc

1. **Đọc `lib/supabase/types.ts`** — biết schema + row types + RPC signatures.
2. **Đọc `lib/chatbot/static-knowledge.ts`** nếu làm việc với chatbot KB.
3. **Đọc `lib/chatbot/tools.ts`** nếu liên quan AI tools.
4. **Đọc `flows.md` §15 + §15.17** nếu làm tính năng chatbot mới.

## 1. Workflow check

```bash
# Trước khi commit
npm run typecheck:clean

# Build production
npm run build
```

Cả 2 phải pass trước khi nói "xong".

---

## 2. Supabase client — bắt buộc dùng `any` typed

**❌ ĐỪNG:**
```ts
import type { Database } from './types';
export function createAdminClient() {
  return createSupabaseClient<Database>(...);
}
```

**✅ LÀM:**
```ts
export function createAdminClient(): any {
  return createSupabaseClient(...);
}
```

**Lý do:** Supabase v6 generic narrowing trả về `never` cho table không match → toàn bộ `.from('xxx')` fail. Khi chưa generate types bằng `npx supabase gen types typescript --linked`, dùng `any` là an toàn nhất.

**Áp dụng cho:** `lib/supabase/admin.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts` — đã đổi rồi, KHÔNG revert lại `<Database>`.

---

## 3. AI SDK v6 — tool definitions

### 3.1. Schema — dùng `inputSchema` không phải `parameters`

**❌ ĐỪNG:**
```ts
export const myTool = tool({
  parameters: z.object({...}),  // v5 syntax
});
```

**✅ LÀM:**
```ts
export const myTool = tool({
  inputSchema: z.object({...}),  // v6 syntax
  execute: async (params) => {...},
});
```

### 3.2. Tool execute — BẮT BUỘC wrap try/catch

**❌ ĐỪNG:**
```ts
execute: async ({ query }) => {
  const supabase = createAdminClient();
  const { data } = await supabase.from('xxx').select('*');
  return data ?? [];
}
```

**✅ LÀM:**
```ts
execute: async ({ query }) => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from('xxx').select('*');
    return data ?? [];
  } catch (e) {
    console.error('[tool:myTool] exception:', e instanceof Error ? e.message : e);
    return [];
  }
}
```

**Lý do:** Một exception trong tool sẽ fail toàn bộ stream. Wrap để đảm bảo tool luôn return về (mảng rỗng / null / default).

### 3.3. Tool `captureLead` — context pattern

```ts
execute: async ({ contactType, contactValue, intent, productId }, options) => {
  try {
    const supabase = createAdminClient();
    const ctx = options.experimental_context as { sessionId?: string; userId?: string } | undefined;
    const sessionId = ctx?.sessionId;
    if (!sessionId) return { ok: false, error: 'NO_SESSION' };
    
    const { data, error } = await supabase
      .from('chat_leads')
      .insert({ session_id: sessionId, user_id: ctx?.userId ?? null, contact_type: contactType, contact_value: contactValue, intent: intent ?? null, matched_product_id: productId ?? null })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'NO_DATA' };  // ← bắt buộc
    return { ok: true, leadId: data.id, contactType, contactValue };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}
```

### 3.4. Tool postgREST `ilike` + tiếng Việt — TRÁNH `keywords.cs.{}`

**❌ ĐỪNG:**
```ts
q = q.or(`title.ilike.${k},content.ilike.${k},keywords.cs.{${query}}`);
```

**✅ LÀM:**
```ts
q = q.or(`title.ilike.${k},content.ilike.${k}`);
```

**Lý do:** PostgREST `cs.{}` với chuỗi có ký tự Unicode (tiếng Việt có dấu) gây parse error 400 ở một số trường hợp. ILIKE an toàn hơn.

---

## 4. AI SDK v6 — `streamText` trong route

### 4.1. Multi-step → `stopWhen: stepCountIs(N)` không phải `maxSteps`

**❌ ĐỪNG:**
```ts
result = streamText({ model, system, messages, tools, maxSteps: 4 });
```

**✅ LÀM:**
```ts
result = streamText({ 
  model: entry.instance as unknown as Parameters<typeof streamText>[0]['model'],
  system: SYSTEM_PROMPT,
  messages: modelMessages as any,  // ← cast `as any` (ModelMessage union khắt khe)
  tools: allTools,
  stopWhen: stepCountIs(4),
  experimental_context: {
    sessionId: sessionId ?? 'unknown',
    userId: userId ?? null,
  },
  onError: ({ error }: { error: unknown }) => {
    const errMsg = error && typeof error === 'object' && 'message' in error
      ? (error as { message?: string }).message
      : String(error);
    console.error(`[api/chat] streamText error:`, errMsg);
  },
});
```

### 4.2. Model messages format — bắt buộc array of parts

**❌ ĐỪNG (v5 syntax):**
```ts
const modelMessages = history.map(m => ({ role: m.role, content: m.content }));
```

**✅ LÀM (v6 syntax):**
```ts
const modelMessages = history
  .filter(m => m.content?.trim())  // ← BẮT BUỘC filter empty content
  .map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: [{ type: 'text' as const, text: m.content }],
  }));
```

**Lý do:**
- AI SDK v6 yêu cầu `content` là array of `ContentPart`, không phải string.
- Empty assistant content (khi `finishReason: 'tool-calls'`) bị Groq/OpenAI reject 400.

### 4.3. Defensive parse cho content đã JSON.stringify

```ts
const extractText = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((p: any) => p && p.type === 'text' && typeof p.text === 'string')
        .map((p: any) => p.text)
        .join('\n');
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') {
      return parsed.text;
    }
  } catch {}
  return raw;
};
```

---

## 5. streamText response — fallback text khi model không sinh text

**Lý do:** Khi `finishReason: 'tool-calls'` model có thể không generate text → UI trống. Cần synthesize fallback dựa trên tool output.

```ts
// Trong chat-widget.tsx (client-side, sau khi parse SSE)
if (!finalText) {
  if (captureCalled) {
    finalText = 'Cảm ơn em, Bà Chủ đã ghi nhận liên lạc. Khi có hàng hoặc cần tư vấn, tiệm sẽ liên hệ em sớm nhất nha.';
  } else if (collections.size > 0) {
    const list = Array.from(collections.values())
      .map((c, i) => `${i + 1}. ${c.name}${c.description ? ` — ${c.description}` : ''}`)
      .join('\n');
    finalText = `Hiện tiệm có ${collections.size} bộ sưu tập:\n${list}\n\nEm muốn xem chi tiết bộ nào ạ?`;
  } else if (products.size > 0) {
    finalText = `Tiệm tìm thấy ${products.size} sản phẩm phù hợp. Em xem bên dưới nhé.`;
  } else if (parts.some((p: any) => p.type === 'tool-invocation')) {
    finalText = 'Hiện tiệm chưa có món này ạ. Em có thể để lại SĐT để tiệm thông báo khi có hàng không?';
  } else {
    finalText = 'Bà Chủ chưa rõ ý em lắm, em nói rõ hơn được không ạ?';
  }
}
```

---

## 6. UI Card — defensive render

### 6.1. ChatProductCard — handle NaN/missing price

**❌ ĐỪNG:**
```tsx
const price = typeof product.price === 'string' ? parseInt(product.price, 10) : product.price;
<span>{formatVND(price)}</span>  // → "NaNđ" nếu price null
```

**✅ LÀM:**
```tsx
const rawPrice = product.price;
const parsedPrice =
  typeof rawPrice === 'number'
    ? rawPrice
    : typeof rawPrice === 'string' && rawPrice.trim() !== '' && !Number.isNaN(Number(rawPrice))
    ? Number(rawPrice)
    : null;
const title = product.title?.trim() || 'Sản phẩm';
<span>{parsedPrice !== null ? formatVND(parsedPrice) : 'Liên hệ'}</span>
```

### 6.2. Filter tool products/collections (chat-message.tsx)

```tsx
// Chỉ render product có title + price hợp lệ
const toolProducts = orderedHistory
  .filter((m) => m.content?.trim())
  .map(...)
  .filter((item) => 
    item.id && item.slug && item.title && item.price !== undefined && item.price !== null
  );

// Collections: chỉ render nếu có id + slug + (cover_image_url hoặc name)
const toolCollections = ...filter((item) =>
  item.id && item.slug && (item.cover_image_url || item.name)
);
```

---

## 7. TypeScript patterns đã fix — bắt buộc áp dụng

### 7.1. `.single<T>()` KHÔNG dùng type arg trên `any`

**❌ ĐỪNG:**
```ts
const { data } = await supabase.from('xxx').select('*').single<T>();
```

**✅ LÀM:**
```ts
const { data } = (await supabase.from('xxx').select('*').single()) as { data: T | null };
```

**Lý do:** `.single<T>()` chỉ work khi `supabase` typed. Khi `supabase: any`, TS báo "Untyped function calls may not accept type arguments".

### 7.2. Cast `data` từ `any` thành typed array

**❌ ĐỪNG:**
```ts
const items = (data ?? []).map((row) => row.id);  // row: any → implicit any error
```

**✅ LÀM:**
```ts
const items = ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
```

### 7.3. `Record<Enum, T>` BẮT BUỘC đủ keys

```ts
const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  NEW: '...',
  WAITING_PAYMENT: '...',  // ← thêm khi OrderStatus có value mới
  WAITING_CONFIRM: '...',
  CONFIRMED: '...',
  ...
};
```

**Khi thêm value mới vào `OrderStatus`** (hoặc enum nào), grep tất cả `Record<OrderStatus, ...>` và thêm entry.

### 7.4. Cast cho AI SDK `messages` param

```ts
messages: modelMessages as any,  // ← bypass ModelMessage union strictness
```

### 7.5. Cast union type cho nested object

**❌ ĐỪNG:**
```ts
(Array<X & { product?: Y | Z | null }>)  // TS tính union phức tạp → fail
```

**✅ LÀM:**
```ts
(data as any[]).map((row: any) => ...)  // Đơn giản, vẫn type-safe ở runtime
```

---

## 8. Database types — bắt buộc update khi thêm bảng/column

Khi thêm bảng mới hoặc column mới, **MUST** update 2 file:
1. `supabase/migrations/00XX_xxx.sql` — SQL schema.
2. `lib/supabase/types.ts` — thêm:
   - Row type `interface XxxRow {...}` ở sau các interface hiện có.
   - Enum type nếu cần (`export type XxxEnum = '...' | '...'`).
   - Entry trong `Database.public.Tables.X` (Row/Insert/Update).
   - Function signature trong `Database.public.Functions` nếu có RPC.

**Không dùng `declare module './types'`** (gây duplicate `Database` error).

**Sau khi sửa `types.ts`**, **BẮT BUỘC** clear cache:
```bash
npm run typecheck:clean
```

---

## 9. ESLint config — đã tắt warnings không cần

`.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals", "next"],
  "rules": {
    "@next/next/no-img-element": "off",
    "react-hooks/exhaustive-deps": "warn",
    "jsx-a11y/role-has-required-aria-props": "warn"
  },
  "ignorePatterns": ["node_modules/", ".next/"]
}
```

Đã cấu hình. **KHÔNG bật lại** các rule này (sẽ tạo ra hàng chục warnings pre-existing).

---

## 10. tsconfig.json — đã tắt incremental

```json
"incremental": false
```

Đã tắt. **KHÔNG bật lại** (gây cache lỗi cũ khi thay đổi `types.ts`).

---

## 11. package.json scripts — đã fix Windows compat

```json
"typecheck": "node -e \"require('fs').rmSync('.tsbuildinfo',{force:true});require('child_process').execSync('tsc --noEmit',{stdio:'inherit'})\"",
"typecheck:clean": "node -e \"require('fs').rmSync('.tsbuildinfo',{force:true});require('fs').rmSync('.next',{recursive:true,force:true});require('child_process').execSync('tsc --noEmit',{stdio:'inherit'})\""
```

**KHÔNG dùng `rm -f`** (POSIX only, fail trên Windows). Luôn dùng `node -e "require('fs').rmSync(...)"`.

---

## 12. Lỗi thường gặp — checklist trước khi commit

Khi gặp lỗi TS, check theo thứ tự:

1. **"Type 'X' is missing properties from type 'Record<Enum, Y>'"** → thêm entries cho mỗi value trong enum (xem §7.3).
2. **"Property 'X' does not exist on type 'never'"** → file `lib/supabase/types.ts` đã update, **chạy `npm run typecheck:clean`** (xóa `.tsbuildinfo`).
3. **"Untyped function calls may not accept type arguments"** → cast `.single<T>()` thành `.single()) as {...}` (xem §7.1).
4. **"Argument of type 'X' is not assignable to parameter of type 'never[]'"** → `supabase` đã là `any`, chỉ cần `(...).insert(...)` (không cast).
5. **"Cannot find name 'PaymentMethod'"** → import từ `@/lib/supabase/types` hoặc dùng inline `as PaymentMethod`.
6. **"Type 'string' is not assignable to type 'PaymentMethod'"** → cast dữ liệu trước khi dùng: `(... as Array<{ payment_method: PaymentMethod }>)`.

---

## 13. Migrations — pattern khi thêm bảng mới

1. Tạo file `supabase/migrations/0018_xxx.sql` (numbering tăng dần).
2. Pattern:
```sql
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_new_table_x ON new_table(x);

-- RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
-- policies...

-- updated_at trigger (nếu có updated_at)
CREATE TRIGGER trg_new_table_updated BEFORE UPDATE ON new_table
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```
3. **Idempotent**: dùng `IF NOT EXISTS` ở mọi nơi.
4. **Date literals**: dùng `DATE 'YYYY-MM-DD'` thay vì string `'2026-08-15'`.
5. **Test trên Supabase Dashboard SQL Editor** trước khi commit.

---

## 14. AI model chain — fallback pattern

Trong `lib/chatbot/client.ts`:
```ts
// Chain: groq → gemini → openai (auto-fallback khi quota/404/401)
// Mỗi request thử từ trên xuống.
```

Khi thêm model mới, update `getChatModelChain()` để thêm vào chain.

---

## 15. Khi nào cần generate Supabase types

**Hiện tại**: KHÔNG cần. Code đang dùng `any` cho supabase client.

**Khi nào cần**:
- Khi muốn autocomplete cho table/column.
- Khi làm việc với table mới phức tạp (>10 columns).
- Khi cần type-safe cho RPC.

**Cách generate**:
```bash
npx supabase gen types typescript --linked > lib/supabase/types.gen.ts
```

Sau đó đổi `createAdminClient(): any` thành `createSupabaseClient<Database>` (cần merge với `types.gen.ts` nếu conflict).

---

## 16. Reference files

- `flows.md` §15 — chatbot core spec.
- `flows.md` §15.17 — knowledge base spec.
- `lib/supabase/types.ts` — row types + Database interface.
- `lib/chatbot/tools.ts` — 11 tool definitions.
- `lib/chatbot/system-prompt.ts` — Bà Chủ Tiệm persona.
- `lib/chatbot/static-knowledge.ts` — SHOP_INFO + STATIC_FAQS.
- `supabase/migrations/0016_chatbot_knowledge.sql` — KB schema.
- `supabase/migrations/0017_chatbot_seed.sql` — KB seed data.

---

## 17. Final checklist

Trước khi nói "xong", bất kỳ tính năng mới nào cũng phải:

- [ ] Tất cả tool definitions dùng `inputSchema` (không `parameters`).
- [ ] Mỗi tool `execute` có try/catch.
- [ ] `supabase` typed `any` (không `<Database>`).
- [ ] `.single<T>()` thay bằng `(...).single()) as {...}`.
- [ ] Stream text có fallback khi model không generate text.
- [ ] Cards render defensive (NaN → "Liên hệ", missing title → "Sản phẩm").
- [ ] Empty content filter trước khi gửi cho AI SDK.
- [ ] Tool output `data` có null check sau `.single()`.
- [ ] `Record<Enum, T>` đủ entries.
- [ ] `lib/supabase/types.ts` updated nếu schema đổi.
- [ ] `npm run typecheck:clean` pass.
- [ ] `npm run build` pass.
