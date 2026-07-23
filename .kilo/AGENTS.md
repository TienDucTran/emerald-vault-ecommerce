# AGENT INSTRUCTIONS — Emerald Vault

> **BẮT BUỘC**: Trước khi thực thi bất kỳ task code/fix/refactor nào, đọc file `.kilo/skills/emerald-vault-standards.md` để nắm các pattern + bug đã fix. Áp dụng chúng từ đầu để tránh lặp lại.

## Quy trình làm việc chuẩn

1. **Pre-task**: Load skill `emerald-vault-standards` qua skill tool (nếu có) hoặc đọc file `.kilo/skills/emerald-vault-standards.md`.
2. **Trong task**: Tuân thủ 17 sections trong skill (Supabase client, AI SDK v6, UI cards, TS patterns, DB types, migrations...).
3. **Post-task**:
   - Chạy `npm run typecheck:clean` (xóa `.tsbuildinfo` + `.next`).
   - Chạy `npm run build` (build production).
   - Cả 2 phải pass trước khi báo xong.

## Khi gặp lỗi TS

Checklist theo thứ tự ưu tiên (§12 trong skill):
1. `Record<Enum, T>` thiếu entries.
2. `Property 'X' does not exist on type 'never'` → `npm run typecheck:clean`.
3. `Untyped function calls may not accept type arguments` → cast `.single()`.
4. `Argument of type 'X' is not assignable to parameter of type 'never[]'` → bỏ cast vì supabase là `any`.
5. `Cannot find name 'PaymentMethod'` → import hoặc inline cast.
6. `Type 'string' is not assignable to type 'PaymentMethod'` → cast dữ liệu trước.

## Tài liệu quan trọng

- `.kilo/skills/emerald-vault-standards.md` — Quy chuẩn code (đọc mỗi task).
- `flows.md` §15 + §15.17 — Chatbot spec.
- `lib/supabase/types.ts` — DB types.
- `lib/chatbot/tools.ts` — 11 AI tools.
- `lib/chatbot/system-prompt.ts` — Bà Chủ Tiệm persona.

## Tuyệt đối KHÔNG

- ❌ Dùng `<Database>` cho supabase client (gây `never`).
- ❌ Dùng `.single<T>()` type arg.
- ❌ Dùng `parameters:` trong `tool()` (v5 syntax).
- ❌ Để tool `execute` không có try/catch.
- ❌ Để empty content vào model messages.
- ❌ Render product card mà không guard NaN price.
- ❌ Bật lại `incremental: true` trong tsconfig.
- ❌ Bật lại `@next/next/no-img-element` rule.
- ❌ Dùng `rm -f` trong package.json (Windows fail).
- ❌ Dùng `declare module './types'` (duplicate Database).
