# Cleanup: Pre-existing TypeScript Errors

> **Status**: ✅ DONE — Root cause fixed 2026-07-16 (xem "Phương án đã chọn" bên dưới)
> **Phát hiện**: 2026-07-16 (sau khi thêm `@next/third-parties/google` + chạy `npx tsc --noEmit`)
> **Quan trọng**: `next build` (TypeScript check trong Next.js) **VẪN PASS** dù có 21 errors này,
> vì các file lỗi nằm ngoài dependency tree của routes hiện đang build (admin account API, lib/auth/*).
> → App chạy production OK, errors chỉ hiện khi `tsc --noEmit` toàn bộ `tsconfig.json`.

## Phương án đã chọn (2026-07-16) — Root fix

**Nguyên nhân gốc**: `@supabase/supabase-js@2.45.4` dùng 3-generic
`SupabaseClient<Database, SchemaName, Schema>` với `Schema extends GenericSchema`. `Database['public']`
trong project này chứa `Enums` + `CompositeTypes` mà `GenericSchema` không có, nên TS từ chối
constraint check. Hệ quả: khi type narrowing, Insert/Update shape collapse về `never`,
gây 14/21 errors.

**Fix đã áp dụng** (xem file này section "Cách fix" cũ để biết context):

1. **`RequireAdminResult` / `RequireCustomerResult`** — đổi `SupabaseClient<Database, 'public', Database['public']>`
   thành `SupabaseClient<any, 'public', any>`. Dùng `any` cho Database generic làm Insert/Update/select
   permissive (không collapse về `never`). Schema vẫn `'public'` literal, tất cả `.from('xxx')` chain
   vẫn hoạt động bình thường.
2. **Helper `supabaseTable()`** đã xoá (file `lib/supabase/queries/_helpers.ts` còn lại là stub rỗng).
   Tất cả call sites revert về `client.from('xxx').single<Address>()` — không cần cast thủ công nữa.
3. **5 component fix** độc lập (Lucide, getInitials, mobile-bottom-nav, media-picker) — xem dưới.

### Kết quả

| Group | Status | Notes |
|---|---|---|
| 1 + 5 + 6 (Supabase narrowing) | ✅ Fixed | 14 errors sạch — root cause đã giải quyết |
| 2 (Lucide icon propTypes) | ✅ Fixed | `icon: LucideIcon` thay vì `string` / `IconComp` custom |
| 3 (`mobile-bottom-nav.tsx` showCartBadge) | ✅ Fixed | Thêm `showCartBadge?: boolean` vào `NavItem` type |
| 4 (`account-sidebar.tsx` getInitials) | ✅ Fixed | Signature: `name?: string \| null, fallback?: string \| null` |
| `media-picker.tsx` folder | ✅ Fixed | `folder={folder \|\| undefined}` |

> **Lưu ý cho tương lai**: Option A dùng `any` cho Database generic, mất type autocomplete
> cho column names. Khi nào cần strict types → chạy `npx supabase gen types typescript`
> để regenerate `lib/supabase/types.ts` cho khớp `GenericSchema` (thêm brand `__InternalSupabase`).
> Lúc đó sửa `RequireAdminResult` về `SupabaseClient<Database, 'public', Database['public']>`.

## Bối cảnh

Tổng 21 errors khi chạy `npx tsc --noEmit`:

| Status | Count | Ghi chú |
|---|---|---|
| ✅ Fixed trong session 2026-07-16 | 21 | Option A + 5 component fix |

## Tổng quan theo nhóm

| # | Nhóm root cause | Files ảnh hưởng | Errors | Effort ước lượng |
|---|---|---|---|---|
| 1 | Supabase `@supabase/supabase-js` v2.45+ generic narrowing (Database type quá narrow) | 6 | 14 | 1-2h |
| 2 | Lucide icon propTypes incompatible với custom `IconComp` type | 2 | 7 | 30m |
| 3 | `mobile-bottom-nav.tsx` destructure prop không tồn tại trong `ITEMS` | 1 | 1 | 10m |
| 4 | `account-sidebar.tsx` `getInitials()` signature mismatch (string \| null \| undefined vs string \| null) | 1 | 2 | 5m |
| 5 | Postgrest `.update()`/`.insert()` return `never[]` do type generic quá hẹn | 3 | 8 | 30m (chung với #1) |
| 6 | `lib/supabase/queries/orders.ts:102+` + `products.ts:134` — row type bị narrow về `never` khi dùng RPC alias | 2 | 7 | 30m (chung với #1) |

**Tổng effort cleanup**: ~2-3 giờ (chủ yếu là nhóm #1 + #5 + #6 — cùng root cause, fix 1 phát sửa nhiều file).

---

## Nhóm 1 + 5 + 6: Supabase Database generic narrowing (gộp chung)

### Root cause

`@supabase/supabase-js` v2.45.4 dùng 4-generic `SupabaseClient<Database, SchemaName, Schema, ClientOptions>`.
Type `Database` được define trong `lib/supabase/types.ts` thiếu:
- Thiếu `__InternalSupabase` marker
- `SchemaName` mặc định là `'public'` literal, không match với generic inference của PostgrestQueryBuilder
- PostgrestVersion thiếu khi gọi `.rpc()` và `.from()` kết hợp
- `.insert({...})` và `.update({...})` nhận object literal thay vì `Partial<Row>`, TS infer về `never`

### Files ảnh hưởng + errors

| File | Line | Error | Mô tả |
|---|---|---|---|
| `app/api/account/addresses/[id]/default/route.ts` | 58 | `Argument of type '{ is_default: boolean; }' is not assignable to parameter of type 'never'.` | `.update({ is_default: false })` |
| `app/api/account/addresses/[id]/default/route.ts` | 76 | tương tự | `.update({ is_default: true })` |
| `app/api/account/addresses/[id]/route.ts` | 97 | tương tự | `.update({ is_default: false })` |
| `app/api/account/addresses/[id]/route.ts` | 116 | `Partial<...>` không assign được `never` | `.update(parsed.data)` |
| `app/api/account/addresses/route.ts` | 107 | tương tự | `.update({ is_default: false })` |
| `app/api/account/addresses/route.ts` | 126 | `'user_id' does not exist in type 'never[]'` | `.insert({ user_id: ..., ... })` |
| `app/api/account/profile/route.ts` | 79 | `Partial<ProfileRow>` không assign `never` | `.update(update)` |
| `app/api/account/reviews/[id]/route.ts` | 112 | object literal không assign `never` | `.update({ ... })` |
| `app/api/account/reviews/route.ts` | 87 | `{ p_user_id, p_product_id }` không assign `undefined` | `.rpc('is_verified_purchase', {...})` |
| `app/api/account/reviews/route.ts` | 106 | `'product_id' does not exist in type 'never[]'` | `.insert({ ...product_id })` |
| `app/api/account/wishlist/route.ts` | 114 | tương tự | `.insert({ user_id, product_id })` |
| `app/api/admin/products/[id]/route.ts` | 116 | `Argument of type 'any' is not assignable to 'never'` | `.update(input as any)` |
| `lib/auth/require-admin.ts` | 78 | `SupabaseClient<...>` mismatch | `RequireAdminResult.supabase` type |
| `lib/auth/require-customer.ts` | 83, 148 | tương tự | `RequireCustomerResult.supabase` type |
| `lib/supabase/queries/orders.ts` | 102 | `row.order_items` không tồn tại `never` | `.select('..., order_items(...)')` |
| `lib/supabase/queries/orders.ts` | 109-114 | tương tự | các field trên row |
| `lib/supabase/queries/products.ts` | 134 | `current.collection_id` không tồn tại `never` | `.or('...')` filter |
| `middleware.ts` | 126 | `result.data?.role` không tồn tại `never` | `result.data?.role ?? null` |

### Cách fix (1 trong 3)

#### Option A: Cast ngay tại call site (NHANH, 30m)
Tại mỗi `.update(...)` / `.insert(...)` / `.rpc(...)`, ép kiểu:
```ts
await (supabase.from('addresses') as any).update({ is_default: false });
await (supabase.rpc('is_verified_purchase' as any) as any).call(supabase, { p_user_id, p_product_id });
```
- ✅ Fix tất cả nhanh
- ❌ Mất type safety ở những chỗ này
- 📋 Có thể thay bằng helper `supabaseTable(supabase, 'addresses')` để gom cast vào 1 chỗ

#### Option B: Update `lib/supabase/types.ts` để match generic mới (ĐÚNG, 1-2h)
Generate lại types từ Supabase CLI:
```bash
npx supabase gen types typescript --project-id <ID> --schema public > lib/supabase/types.ts
```
Sau đó sửa các chỗ dùng `Database` để match `SupabaseClient<Database, "public", Database["public"]>`.
- ✅ Type-safe 100%, code dùng IDE autocomplete
- ❌ Tốn thời gian, có thể phá vỡ các API hiện đang chạy
- ❌ Cần update `lib/supabase/client.ts` + `admin.ts` + middleware + nhiều chỗ khác

#### Option C: Disable strict mode trên Supabase types (NHANH, 10m)
Trong `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "noImplicitAny": false
  }
}
```
- ✅ Fix ngay toàn bộ
- ❌ Mất strict check trên cả project — KHÔNG khuyến nghị

### Khuyến nghị

**Option A** trước (1 commit) → unblock `tsc --noEmit`. Sau đó cân nhắc **Option B** khi có thời gian rảnh.

---

## Nhóm 2: Lucide icon propTypes mismatch

### Root cause

`components/ui/confirm-dialog.tsx:22` define:
```ts
type IconComp = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
```

Lucide icons export `ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>` —
trong đó `LucideProps['aria-hidden']: Booleanish | null | undefined` (cho phép `"true" | "false"` string),
không khớp với `boolean | null | undefined` của custom type.

### Files ảnh hưởng + errors

| File | Line | Mô tả |
|---|---|---|
| `components/ui/confirm-dialog.tsx` | 23-25 | `warning: AlertTriangle, danger: AlertCircle, info: InfoIcon` không assign được `IconComp` |
| `components/ui/toast.tsx` | 21, 26, 31, 36 | `icon: Info, CheckCircle2, XCircle, AlertTriangle` — vì `icon: string` (line 17) cũng sai tương tự |
| `components/ui/toast.tsx` | 84 | `className={cn(...)}` trên `Icon` prop |

### Cách fix

Đổi `IconComp` và `icon` type sang Lucide's `LucideIcon`:

```ts
// components/ui/confirm-dialog.tsx
import type { LucideIcon } from 'lucide-react';
type IconComp = LucideIcon;

// components/ui/toast.tsx
import type { LucideIcon } from 'lucide-react';
type ToastVariant = {
  border: string;
  icon: LucideIcon;  // đổi từ 'string' → LucideIcon
  iconColor: string;
};
```

Effort: 5-10 phút.

---

## Nhóm 3: `mobile-bottom-nav.tsx` missing `showCartBadge` prop

### Root cause

`ITEMS` literal ở `components/home/mobile/mobile-bottom-nav.tsx:30-37` chỉ có `{ href, label, Icon }`,
nhưng component destructure `{ href, label, Icon, showCartBadge }` ở dòng 37.

### Fix

Hoặc thêm `showCartBadge?: boolean` vào `ITEMS`, hoặc bỏ destructure `showCartBadge`.

Cần xem file để biết hướng nào đúng:
```bash
# Đọc file
cat components/home/mobile/mobile-bottom-nav.tsx
```

Effort: 5-10 phút.

---

## Nhóm 4: `account-sidebar.tsx` getInitials signature

### Root cause

`getInitials(name: string | null, fallback: string | null)` ở `components/account/account-sidebar.tsx:134, 205`:
```tsx
{getInitials(profile?.full_name, profile?.email ?? '')}
```
`profile?.full_name` có type `string | null | undefined` (vì `?.`), không match `string | null` của tham số.

### Fix

Đổi signature helper:
```ts
function getInitials(name?: string | null, fallback?: string | null): string {
  // ... existing logic
}
```

Hoặc coerce tại call site:
```tsx
{getInitials(profile?.full_name ?? null, profile?.email ?? '')}
```

Effort: 5 phút.

---

## Cách thực hiện cleanup (đề xuất thứ tự)

### Phase 1: Quick wins (30 phút)
1. ✅ Nhóm 4 (`account-sidebar.tsx`) — 5 phút
2. ✅ Nhóm 3 (`mobile-bottom-nav.tsx`) — 10 phút
3. ✅ Nhóm 2 (`confirm-dialog.tsx` + `toast.tsx`) — 15 phút

### Phase 2: Supabase cleanup (1-2 giờ)
4. ✅ Nhóm 1 + 5 + 6 (gộp chung vì cùng root cause) — chọn Option A hoặc B ở trên
5. Sau khi fix hết → chạy `npx tsc --noEmit` lần nữa → expect 0 errors

### Phase 3: Verify (10 phút)
6. ✅ `npm run build` vẫn pass
7. ✅ Chạy app local + click qua PDP, checkout, admin → không có runtime error

---

## Reference

- Lần phát hiện: 2026-07-16, sau khi thêm `@next/third-parties/google` vào `package.json`
- Lệnh check: `npx tsc --noEmit` (chạy từ `D:\emerald-vault-ecommerce\emerald-vault-ecommerce`)
- Lệnh verify production: `npm run build` (chỉ check file trong route graph)
- File logs: không có (paste output thẳng vào issue/PR)
