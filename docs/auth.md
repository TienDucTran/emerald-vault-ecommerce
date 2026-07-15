# Auth & Phân quyền (flows.md §10)

Hệ thống auth của Emerald Vault dùng **Supabase Auth** (email/password) cho **admin only**. End-user (khách mua hàng) là **guest checkout**, không cần đăng ký/đăng nhập.

## 1. Tổng quan

```
[Request tới /dashboard/* hoặc /api/admin/*]
        │
        ▼
[middleware.ts (Edge)]
   supabase.auth.getUser() (cookie qua @supabase/ssr)
   ├─ !user        → redirect /admin/login?next=…  (page)
   │              → 401 JSON                          (API)
   │
   └─ user tồn tại
        │
        ▼
   SELECT role FROM profiles WHERE id = user.id
        │
        ├─ role !== 'admin' → redirect /403  (page)
        │                    → 403 JSON       (API)
        │
        └─ role === 'admin' → cho qua
```

## 2. Bootstrap admin đầu tiên

Khi một user mới đăng ký qua Supabase Auth, trigger `handle_new_user()` tự động tạo row trong `profiles` với `role = 'customer'` (mặc định). Để promote thành admin:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@emerald-vault.vn'
);
```

Chạy trong **Supabase Dashboard → SQL Editor**. Trigger `handle_new_user` đã có sẵn trong `supabase/migrations/0001_initial_schema.sql`.

## 3. Thêm admin mới

Có 2 cách:

**Cách A** — Invite qua Supabase Dashboard:

1. Authentication → Users → **Add user** → **Create new user** (email + password).
2. Trigger tự tạo `profiles` row với `role='customer'`.
3. Chạy SQL ở mục 2 để promote.

**Cách B** — Promote user hiện có:

```sql
UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
```

Lấy UUID qua Supabase Dashboard → Authentication → Users → copy `User UID`.

**Hạ cấp admin về customer:**

```sql
UPDATE profiles SET role = 'customer' WHERE id = '<user-uuid>';
```

## 4. Cách middleware hoạt động

File: `middleware.ts` (project root, không phải trong `app/`).

- **Matcher**: `['/dashboard/:path*', '/api/admin/:path*']` — chỉ chạy với admin pages và admin API.
- **Tạo Supabase client** mỗi request bằng `createServerClient` từ `@supabase/ssr` với cookie adapter đọc từ `request.cookies` và ghi vào `response.cookies` (để rotate session khi cần).
- **`supabase.auth.getUser()`** — validate JWT thật với Supabase Auth server. **Không dùng `getSession`** vì `getSession` chỉ decode cookie, attacker có thể forge cookie payload.
- **Profile lookup**: `supabase.from('profiles').select('role').eq('id', user.id).single()`.
- **Response**:
  - Page không hợp lệ → `NextResponse.redirect()`.
  - API không hợp lệ → `NextResponse.json({ error, message }, { status })`. API client (fetch/axios) không tự follow redirect tới login, JSON giúp client xử lý lỗi rõ ràng.

## 5. `requireAdmin()` helper

File: `lib/auth/require-admin.ts`. Dùng trong Server Components và Route Handlers khi cần truy cập admin DB.

```ts
import { requireAdmin, AuthError } from '@/lib/auth/require-admin';

export async function POST(request: Request) {
  try {
    const { user, profile, adminClient } = await requireAdmin();
    // ... business logic với adminClient
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.code }, { status: err.status });
    }
    throw err;
  }
}
```

Hàm trả về `{ user, profile, supabase, adminClient }`. `adminClient` dùng service-role key (bypass RLS) — chỉ dùng sau khi đã verify user là admin.

## 6. Test gate

### 6.1. Logged out

1. Mở `http://localhost:3000/dashboard` trong trình duyệt ẩn danh.
2. Mong đợi: redirect `http://localhost:3000/admin/login?next=%2Fdashboard`.
3. `curl -i http://localhost:3000/api/admin/anything` → status `401` + body JSON `{ "error": "UNAUTHENTICATED", "message": "Yêu cầu đăng nhập" }`.

### 6.2. Logged in as customer (non-admin)

1. Đăng ký user mới qua Supabase Dashboard (mặc định `role='customer'`).
2. Đăng nhập trên `/admin/login`.
3. Mong đợi: form báo lỗi `"Tài khoản không có quyền admin"`, tự `signOut()`.
4. Nếu cố truy cập `/dashboard` thẳng bằng cách gắn cookie thủ công → redirect `/403`.
5. `curl` với cookie hợp lệ tới `/api/admin/*` → status `403` + body `{ "error": "FORBIDDEN", "message": "Tài khoản không có quyền admin" }`.

### 6.3. Logged in as admin

1. Bootstrap admin theo mục 2.
2. Đăng nhập trên `/admin/login`.
3. Mong đợi: redirect `?next=` (mặc định `/dashboard`), thấy dashboard bình thường.
4. `curl` với cookie admin tới `/api/admin/*` → pass through (handler xử lý tiếp).
5. Click "Đăng xuất" trên header → về `/admin/login`.

## 7. Security notes

| Quyết định | Lý do |
|---|---|
| `supabase.auth.getUser()` thay vì `getSession()` | `getSession` chỉ decode JWT từ cookie mà KHÔNG verify chữ ký với Supabase server. Attacker có thể craft cookie payload giả mạo user. `getUser` gọi lên server để verify token thật. |
| API trả JSON 401/403 thay vì redirect | Frontend SPA gọi `fetch('/api/admin/x')` không tự follow 302 tới `/admin/login` như browser. Trả JSON giúp client hiển thị lỗi phù hợp (vd: toast "Phiên hết hạn, vui lòng đăng nhập lại"). |
| Middleware matchers cố định `/dashboard/:path*`, `/api/admin/:path*` | Tránh kiểm tra cho public pages (`/`, `/san-pham`, `/bo-suu-tap`...) → giảm latency + giảm tải Supabase. |
| Bootstrap admin bằng SQL thủ công | Không có self-signup admin flow. Trigger tạo profile với `role='customer'`; chỉ dev có quyền SQL Editor mới promote được. |
| RLS trên `profiles` | Policy `profiles_self_read` chỉ cho user đọc row của chính mình. Admin check qua service-role client (middleware dùng anon client nhưng role check là business logic, không phụ thuộc RLS — xem `next.config.js`/RLS). |
| `service_role` key chỉ trong `lib/supabase/admin.ts` | Bypass RLS, KHÔNG được ship ra client. Đã enforce bằng cách file này import `SUPABASE_SERVICE_ROLE_KEY` (server-only env). |
| Logout qua cả client + server endpoint | `supabase.auth.signOut()` phía client xóa local session; `/api/auth/logout` (POST/GET) dùng server client để đảm bảo cookie được rotated chính xác qua `@supabase/ssr`. |

## 8. Files trong implementation

| File | Vai trò |
|---|---|
| `middleware.ts` | Edge gate cho `/dashboard/*` và `/api/admin/*` |
| `lib/auth/require-admin.ts` | Helper server-side trong Server Component / Route Handler |
| `app/(admin)/login/page.tsx` | Form đăng nhập admin |
| `app/(admin)/403/page.tsx` | Trang lỗi 403 khi không phải admin |
| `app/api/auth/logout/route.ts` | Server-side signOut (POST + GET) |
| `components/layout/admin-header.tsx` | (UPDATED) Thêm nút "Đăng xuất" |
| `docs/auth.md` | File này |
