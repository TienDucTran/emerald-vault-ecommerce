# Hướng dẫn cấu hình Zalo OA (Official Account) cho Emerald Vault

Tài liệu hướng dẫn chi tiết đăng ký Zalo OA, lấy credentials, cấu hình webhook và kết nối với hệ thống.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Đăng ký Zalo OA](#2-đăng-ký-zalo-oa)
3. [Lấy credentials (env vars)](#3-lấy-credentials-env-vars)
4. [Cấu hình Webhook](#4-cấu-hình-webhook)
5. [Điền env vars vào `.env.local`](#5-điền-env-vars-vào-envlocal)
6. [Chạy migration database](#6-chạy-migration-database)
7. [Kiểm tra hoạt động](#7-kiểm-tra-hoạt-động)
8. [Khắc phục sự cố](#8-khắc-phục-sự-cố)

---

## 1. Tổng quan

Zalo OA (Official Account) cho phép doanh nghiệp nhận/gửi tin nhắn với khách hàng qua Zalo. Emerald Vault tích hợp 3 tính năng:

| Tính năng | Mô tả | Cần Zalo OA? |
|---|---|---|
| **Nút "Chat Zalo"** | Khách nhấn → mở Zalo chat | ❌ Không (chỉ cần SĐT) |
| **Chatbot gợi ý Zalo** | AI tự gợi ý khách liên hệ Zalo khi cần | ❌ Không |
| **Zalo OA API** | Nhận tin qua webhook + admin reply | ✅ Có |

**Gói Starter (MIỄN PHÍ)** — đủ cho Emerald Vault:
- Tối đa 10.000 follower
- 4 tin push / người / ngày
- API access + webhook
- Không giới hạn tin reply

---

## 2. Đăng ký Zalo OA

### Bước 2.1: Truy cập Zalo OA

1. Mở trình duyệt → vào **https://oa.zalo.me**
2. Đăng nhập bằng tài khoản Zalo cá nhân (số điện thoại)

### Bước 2.2: Tạo Official Account mới

1. Click **"Tạo OA"** (hoặc "Create OA")
2. Chọn loại: **Doanh nghiệp / Cá nhân** (chọn theo quy mô shop)
3. Điền thông tin:
   - **Tên OA:** `Emerald Vault` (hoặc tên shop bạn muốn hiển thị với khách)
   - **Danh mục:** `Thời trang & Phụ kiện` hoặc `Trang sức`
   - **Mô tả:** `Trang sức si Nhật vintage — tuyển chọn thủ công`
   - **Avatar:** Logo shop (PNG, kích thước tối thiểu 200x200px)
   - **SĐT liên hệ:** SĐT Zalo của shop (sẽ nhận tin khách)
4. Click **"Tạo"** → chờ Zalo duyệt (thường 1-3 ngày làm việc)

### Bước 2.3: Xác minh doanh nghiệp (tùy chọn nhưng nên làm)

1. Sau khi OA được duyệt, vào **Cài đặt** → **Xác minh doanh nghiệp**
2. Tải lên:
   - Giấy phép kinh doanh (nếu có)
   - CCCD của chủ shop
3. Lợi ích: Tăng giới hạn tin nhắn, hiển thị dấu tick xanh

---

## 3. Lấy credentials (env vars)

Sau khi OA được duyệt, lấy 4 thông tin sau:

### 3.1: OA ID

1. Vào **https://oa.zalo.me** → chọn OA của bạn
2. Vào **Cài đặt** → **Thông tin chung**
3. Tìm **OA ID** (dạng số, vd: `478923456789123`)
4. Copy → đây là `ZALO_OA_ID`

### 3.2: Access Token & Refresh Token

1. Vào **https://oa.zalo.me** → chọn OA
2. Vào **Cài đặt** → **API & Webhook** (hoặc "Developer")
3. Click **"Tạo Access Token"** (hoặc "Generate Token")
4. Copy 2 giá trị:
   - **Access Token** → đây là `ZALO_OA_ACCESS_TOKEN`
   - **Refresh Token** → đây là `ZALO_OA_REFRESH_TOKEN`

> ⚠️ **Lưu ý quan trọng:**
> - Access Token hết hạn sau **90 ngày** → cần refresh (Zalo sẽ gửi notification qua email)
> - Refresh Token hết hạn sau **1 năm**
> - Lưu trữ an toàn, không chia sẻ công khai

### 3.3: Secret Key (dùng cho Webhook)

1. Vào **https://oa.zalo.me** → chọn OA
2. Vào **Cài đặt** → **API & Webhook**
3. Tìm **Secret Key** (hoặc "Webhook Secret")
4. Copy → đây là `ZALO_OA_SECRET_KEY`

---

## 4. Cấu hình Webhook

Webhook cho phép server của bạn nhận tin nhắn từ khách Zalo theo thời gian thực.

### Bước 4.1: Chuẩn bị URL webhook

URL webhook phải là **HTTPS** và có thể truy cập công khai. Emerald Vault đã có route:

```
https://emerald-vault.vn/api/zalo/webhook
```

> Nếu đang test local, dùng **ngrok** để tunnel:
> ```bash
> ngrok http 3000
> # Copy URL dạng https://xxxx.ngrok.io → dùng làm webhook URL tạm
> ```

### Bước 4.2: Cấu hình trong Zalo OA Dashboard

1. Vào **https://oa.zalo.me** → chọn OA
2. Vào **Cài đặt** → **API & Webhook**
3. Tìm mục **Webhook** → click **"Cấu hình"** (hoặc "Configure")
4. Điền:
   - **Webhook URL:** `https://emerald-vault.vn/api/zalo/webhook`
   - (Zalo sẽ gửi test request để verify)
5. Click **"Lưu"** (Save)
6. Zalo hiển thị **"Webhook đã được kích hoạt"** nếu thành công

### Bước 4.3: Bật sự kiện nhận tin nhắn

1. Trong mục Webhook, tìm **"Sự kiện nhận"** (Events to receive)
2. Bật các event sau:
   - ✅ `user_send_text` — khách gửi tin nhắn text
   - ✅ `user_send_image` — khách gửi ảnh
   - ✅ `user_send_link` — khách gửi link
   - ✅ `follow` — khách follow OA
   - ✅ `unfollow` — khách unfollow OA
3. Click **"Lưu"** (Save)

---

## 5. Điền env vars vào `.env.local`

Mở file `.env.local` (tạo nếu chưa có) và thêm:

```env
# Zalo OA Integration
ZALO_OA_ID=478923456789123
ZALO_OA_ACCESS_TOKEN=your_access_token_here
ZALO_OA_REFRESH_TOKEN=your_refresh_token_here
ZALO_OA_SECRET_KEY=your_secret_key_here

# Auto-reply (tùy chọn)
# true: gửi tin xác nhận "Bà Chủ sẽ trả lời sớm" ngay khi nhận tin
# false (default): admin trả lời thủ công qua admin UI
ZALO_OA_AUTO_REPLY=false
```

> ⚠️ **Restart server** sau khi đổi env:
> ```bash
> # Ctrl+C để dừng next dev, rồi chạy lại:
> npm run dev
> ```

---

## 6. Chạy migration database

Tạo bảng `zalo_messages` để lưu lịch sử chat:

### Cách 1: Supabase CLI (khuyến nghị)

```bash
supabase db push
```

### Cách 2: SQL Editor (thủ công)

1. Vào **Supabase Dashboard** → **SQL Editor**
2. Copy toàn bộ nội dung file `supabase/migrations/0034_zalo_messages.sql`
3. Paste vào SQL Editor → click **Run**
4. Kiểm tra bảng `zalo_messages` đã được tạo:
   ```sql
   SELECT * FROM zalo_messages LIMIT 5;
   ```

---

## 7. Kiểm tra hoạt động

### 7.1: Kiểm tra nút "Chat Zalo" (Giai đoạn 1)

1. Vào trang chủ: **http://localhost:3000** (hoặc domain production)
2. Kiểm tra góc trái dưới → có nút tròn màu xanh dương "Chat Zalo"
3. Nhấn vào → mở `https://zalo.me/{SĐT}`

> Nếu không thấy nút: vào `/admin/settings` → Site Info → điền "Zalo / SĐT Zalo OA" → Save

### 7.2: Kiểm tra Admin Zalo Messages (Giai đoạn 3)

1. Vào **http://localhost:3000/admin/zalo**
2. Nếu chưa có tin nhắn → hiển thị "Chưa có tin nhắn Zalo nào"
3. Nếu có tin (sau khi khách nhắn Zalo) → hiển thị danh sách hội thoại

### 7.3: Test webhook (Giai đoạn 3)

**Cách 1: Test bằng Zalo thật**
1. Dùng Zalo cá nhân → tìm tên OA "Emerald Vault" → follow
2. Gửi 1 tin nhắn text: "Chào tiệm"
3. Vào `/admin/zalo` → kiểm tra tin nhắn xuất hiện (trong 30 giây)

**Cách 2: Test bằng curl (không cần Zalo thật)**

```bash
curl -X POST http://localhost:3000/api/zalo/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"event_name\":\"user_send_text\",\"message\":{\"text\":\"Chào tiệm\",\"msg_id\":\"test123\"},\"sender\":{\"id\":\"test_user_1\",\"display_name\":\"Khách test\"},\"recipient\":{\"id\":\"oa_id\"}}"
```

Sau đó vào `/admin/zalo` → sẽ thấy tin nhắn từ "Khách test".

**Cách 3: Test reply từ admin**
1. Vào `/admin/zalo` → chọn hội thoại
2. Gõ tin nhắn reply → nhấn Enter
3. Nếu Zalo OA đã cấu hình đúng → khách nhận được tin trên Zalo
4. Nếu chưa cấu hình → báo lỗi "Gửi thất bại. Kiểm tra Zalo OA config"

---

## 8. Khắc phục sự cố

### Lỗi: Nút "Chat Zalo" không hiển thị

**Nguyên nhân:** Chưa cấu hình `contact_zalo` trong admin settings.

**Giải pháp:**
1. Vào `/admin/settings` → tab "Site Info"
2. Điền SĐT Zalo vào field "Zalo / SĐT Zalo OA"
3. Click "Save Changes"
4. Refresh trang chủ → nút sẽ xuất hiện

---

### Lỗi: Webhook không nhận được tin nhắn

**Kiểm tra:**
1. Webhook URL có truy cập được từ internet? (test: `curl https://emerald-vault.vn/api/zalo/webhook`)
2. `ZALO_OA_SECRET_KEY` đã điền đúng?
3. Server log có lỗi không? (xem terminal `next dev`)

**Fix:**
- Nếu dùng local → dùng ngrok: `ngrok http 3000` → copy HTTPS URL
- Nếu production → đảm bảo domain có SSL (Vercel tự có)
- Kiểm tra signature: Zalo gửi header `X-ZEvent-Signature`, server verify bằng `ZALO_OA_SECRET_KEY`

---

### Lỗi: Reply từ admin thất bại

**Thông báo:** "Gửi thất bại. Kiểm tra Zalo OA config."

**Nguyên nhân:**
1. `ZALO_OA_ACCESS_TOKEN` hết hạn (90 ngày)
2. `ZALO_OA_ACCESS_TOKEN` sai hoặc trống
3. User chưa follow OA (Zalo yêu cầu user phải follow trước khi OA gửi tin)

**Fix:**
1. Vào Zalo OA dashboard → tạo lại Access Token
2. Cập nhật `.env.local` → restart server
3. Đảm bảo khách đã follow OA trước

---

### Lỗi: Access Token hết hạn

Zalo Access Token hết hạn sau 90 ngày. Cần refresh:

**Cách 1: Manual refresh (khuyến nghị)**
1. Vào Zalo OA dashboard → API & Webhook → tạo Access Token mới
2. Cập nhật `ZALO_OA_ACCESS_TOKEN` trong `.env.local`
3. Restart server

**Cách 2: Auto refresh (nâng cao — chưa implement)**
> Hiện chưa auto-refresh. Có thể thêm sau bằng cách gọi endpoint `ZALO_REFRESH_TOKEN_ENDPOINT` khi token hết hạn.

---

### Lỗi: Bảng `zalo_messages` không tồn tại

**Fix:**
```bash
# Chạy migration
supabase db push

# Hoặc chạy SQL thủ công trong Supabase SQL Editor
# Copy nội dung supabase/migrations/0034_zalo_messages.sql → Run
```

---

### Lỗi: TypeScript / Build error

Nếu gặp lỗi build sau khi thêm code Zalo:

```bash
# Xóa cache + rebuild
rm -rf .next
npm run build
```

---

## Tóm tắt nhanh (Quick Start)

```bash
# 1. Đăng ký Zalo OA tại https://oa.zalo.me (miễn phí)
# 2. Lấy 4 credentials: OA_ID, ACCESS_TOKEN, REFRESH_TOKEN, SECRET_KEY
# 3. Điền vào .env.local
# 4. Chạy migration database
supabase db push

# 5. Cấu hình webhook trong Zalo OA dashboard:
#    URL: https://emerald-vault.vn/api/zalo/webhook

# 6. Cấu hình SĐT Zalo trong admin:
#    Vào /admin/settings → Site Info → Zalo field → Save

# 7. Restart server
npm run dev

# 8. Test: nhắn Zalo cho OA → vào /admin/zalo xem tin nhắn
```

---

**Last Updated:** 2026-08-11
**Project:** Emerald Vault Ecommerce
**Zalo OA Docs:** https://developers.zalo.me/docs/api/official-account-api-ns