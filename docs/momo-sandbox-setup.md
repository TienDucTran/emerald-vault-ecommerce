# 🚀 Hướng dẫn đăng ký MoMo Business Test/Sandbox

> Tài liệu này hướng dẫn 8 bước để đăng ký tài khoản MoMo Business Test, lấy sandbox credentials và tích hợp vào Emerald Vault.
>
> Tham khảo: [docs official MoMo](https://developers.momo.vn/v3/vi/docs/payment/onboarding/), `flows.md` §7 (luồng thanh toán MoMo), `todo.md` §C (task MoMo).

---

## Bước 1: Đăng ký MoMo Business account 🎯

1. Truy cập **[https://business.momo.vn/](https://business.momo.vn/)**
2. Nhấn **"Đăng ký"** và chọn loại tài khoản **Doanh nghiệp**.
3. Chuẩn bị các thông tin sau:
   - **Tên doanh nghiệp** (đúng giấy ĐKKD)
   - **Mã số thuế (MST)**
   - **Email doanh nghiệp** (dùng để verify + nhận thông báo)
   - **Số điện thoại** người đại diện
   - **Tài khoản ngân hàng** doanh nghiệp (để nhận tiền khi go-live)
4. Xác thực **email** (click link MoMo gửi về) và **SĐT** (nhập OTP).
5. Hoàn tất hồ sơ doanh nghiệp theo checklist của MoMo Business portal.

> 💡 Mẹo: dùng email chính của dự án (vd: `finance@emerald-vault.vn`) để dễ quản lý team.

---

## Bước 2: Đăng ký MoMo Developer (test environment) 🛠️

1. Truy cập **[https://developers.momo.vn/](https://developers.momo.vn/)**
2. Nhấn **"Đăng nhập"** và chọn **"Đăng nhập bằng MoMo Business"** (dùng tài khoản vừa tạo ở Bước 1).
3. Sau khi vào Developer Dashboard, vào menu **"Kết nối ứng dụng"** → **"Tạo ứng dụng mới"**.
4. Điền thông tin app:
   - **Tên app**: `Emerald Vault` (hoặc `Emerald Vault Dev`)
   - **Loại tích hợp**: chọn **"Website/App"**
   - **Mô tả**: mô tả ngắn về shop (vd: "Ecommerce bán trang sức vàng")
5. Submit → chờ MoMo duyệt app test (thường trong vài phút).

---

## Bước 3: Lấy test credentials (sandbox) 🔑

Sau khi app được tạo:

1. Vào **"Thông tin ứng dụng"** của app vừa tạo.
2. Copy **3 giá trị** sau (giữ bí mật, KHÔNG commit lên git):

| Field          | Ví dụ                          | Env var             |
| -------------- | ------------------------------ | ------------------- |
| Partner Code   | `MOMOLRJN20210729`             | `MOMO_PARTNER_CODE` |
| Access Key     | `F8BBA842ECF85`                | `MOMO_ACCESS_KEY`   |
| Secret Key     | `K951B6N1yM0G6q5B6L6F0K8W7I9P3R4Q` | `MOMO_SECRET_KEY`   |

3. **Lưu ý quan trọng — endpoint test environment:**

   ```
   https://test-payment.momo.vn/v2/gateway/api/create
   ```

   (Khác với production là `https://payment.momo.vn/v2/gateway/api/create`)

---

## Bước 4: Tài khoản test thanh toán 👤

MoMo cung cấp sẵn **test user** để mô phỏng thanh toán trên sandbox:

- **Số điện thoại test**: `0963181714`
- Tài khoản này đã có sẵn số dư ảo và được dùng để test flow `captureWallet`.
- Khi MoMo redirect sang trang sandbox, đăng nhập bằng SĐT này để thanh toán thử.

> 📖 Xem chi tiết test scenarios: [https://developers.momo.vn/v3/vi/docs/payment/onboarding/test-instructions/](https://developers.momo.vn/v3/vi/docs/payment/onboarding/test-instructions/)

---

## Bước 5: Cấu hình Redirect URL & IPN URL 🔗

Trong dashboard MoMo → chọn **App** → tab **"Cấu hình"**:

### Redirect URL
- **Production**: `https://emerald-vault.vn/momo/return`
- **Development**: `http://localhost:3000/momo/return`

### IPN URL (callback server-to-server)
- **Production**: `https://emerald-vault.vn/api/momo/ipn`
- **Development**: `http://localhost:3000/api/momo/ipn` — **cần expose qua ngrok** (xem Bước 6)

> ⚠️ IPN URL phải publicly accessible từ internet — MoMo server không gọi được `localhost`.

---

## Bước 6: Populate `.env.local` 📝

Thêm **5 biến** sau vào file `D:\emerald-vault-ecommerce\emerald-vault-ecommerce\.env.local` (xem chi tiết trong `flows.md` §14):

```bash
# MoMo Sandbox Credentials
MOMO_PARTNER_CODE=MOMOLRJNxxxxxxxx
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6N1xxxxxxxx

# MoMo Endpoints
MOMO_REDIRECT_URL=http://localhost:3000/momo/return
MOMO_IPN_URL=http://localhost:3000/api/momo/ipn
```

### Expose IPN URL qua ngrok (cho dev local)

Vì MoMo không gọi được `localhost`, dùng [ngrok](https://ngrok.com/) để tunnel:

```bash
# Cài ngrok (nếu chưa có): https://ngrok.com/download
ngrok http 3000
```

Output sẽ có dạng:

```
Forwarding   https://abc123.ngrok.io → http://localhost:3000
```

Copy URL `https://abc123.ngrok.io` và cập nhật `MOMO_IPN_URL` trong `.env.local`:

```bash
MOMO_IPN_URL=https://abc123.ngrok.io/api/momo/ipn
```

> 🔁 Mỗi lần restart ngrok (free plan) URL sẽ đổi → phải cập nhật lại `MOMO_IPN_URL` trong dashboard MoMo **và** trong `.env.local`.

---

## Bước 7: Verify env trong code ✅

File `app/api/momo/create/route.ts` đã check 3 biến env. Khi đủ credentials, API sẽ không trả `503` nữa.

### Test nhanh bằng curl

```bash
curl -X POST http://localhost:3000/api/momo/create \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<uuid>"}'
```

**Response thành công (HTTP 200):**

```json
{
  "payUrl": "https://test-payment.momo.vn/v2/gateway/api/create?...",
  "deeplink": "momo://...",
  "qrCodeUrl": "https://test-payment.momo.vn/..."
}
```

> 🎉 Có `payUrl` → sẵn sàng test full flow: mở `payUrl` trong browser, đăng nhập bằng SĐT test `0963181714`, thanh toán, kiểm tra redirect về `/momo/return` và IPN callback.

---

## Bước 8: Production switch (sau khi MoMo duyệt live) 🌐

Khi MoMo duyệt app live, thực hiện 3 thay đổi:

### 1. Đổi base URL trong `lib/momo/client.ts`

```ts
// Test (sandbox)
const MOMO_BASE_URL = 'https://test-payment.momo.vn/v2/gateway/api/create';

// Production (sau khi duyệt)
const MOMO_BASE_URL = 'https://payment.momo.vn/v2/gateway/api/create';
```

### 2. Đổi credentials từ test → production

Cập nhật 3 biến trong production env (vd: Vercel/Railway env vars):

```bash
MOMO_PARTNER_CODE=<prod_partner_code>
MOMO_ACCESS_KEY=<prod_access_key>
MOMO_SECRET_KEY=<prod_secret_key>
```

### 3. Đổi URLs sang domain thật

```bash
MOMO_REDIRECT_URL=https://emerald-vault.vn/momo/return
MOMO_IPN_URL=https://emerald-vault.vn/api/momo/ipn
```

Và cập nhật lại **Redirect URL** + **IPN URL** trong MoMo Dashboard tương ứng.

> 🔐 Lưu ý bảo mật: production `Secret Key` phải được lưu trong secret manager (Vercel env, Doppler, …), **không** commit lên git.

---

## 🛠️ Troubleshooting thường gặp

| Lỗi                                    | Nguyên nhân                                          | Cách xử lý                                                                                       |
| --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Invalid signature**                   | Sai format raw string hoặc sort key                  | Đối chiếu [docs ký signature](https://developers.momo.vn/v3/vi/docs/payment/onboarding/signature/); kiểm tra sort key theo alphabet, format đúng thứ tự field. |
| **Invalid partner code**                | Copy sai / typo Partner Code                         | Copy lại từ dashboard, **không tự sửa** thủ công.                                               |
| **IPN timeout / không nhận callback**   | IPN URL không public (đang dùng localhost)           | Dùng `ngrok http 3000` hoặc deploy lên staging có public URL.                                   |
| **Amount invalid**                      | Gửi số thập phân (`"amount": 1000.00`)               | Phải là **số nguyên** (vd: `1000` = 1.000 VND), không có `.00`.                                 |
| **User cancels / `resultCode: 1006`**   | User từ chối thanh toán trên MoMo app                | Đây là flow bình thường — xử lý state = `cancelled` trong `app/api/momo/ipn/route.ts`.            |

---

## ✅ Checklist cuối

| #   | Task                                                                 |
| --- | -------------------------------------------------------------------- |
| 1   | ☐ Đăng ký MoMo Business                                              |
| 2   | ☐ Đăng ký MoMo Developer                                             |
| 3   | ☐ Tạo app test (loại Website/App)                                    |
| 4   | ☐ Copy Partner Code + Access Key + Secret Key                        |
| 5   | ☐ Cấu hình Redirect URL + IPN URL trong dashboard                    |
| 6   | ☐ Paste credentials vào `.env.local`                                 |
| 7   | ☐ Test `POST /api/momo/create` → 200 với `payUrl`                   |
| 8   | ☐ (Production) Submit app cho MoMo duyệt live                        |

---

> 📚 Tài liệu liên quan:
> - `docs/flows.md` §7 — Luồng thanh toán MoMo
> - `docs/flows.md` §14 — Biến môi trường MoMo
> - `todo.md` §C — Task tích hợp MoMo
> - [MoMo Official Onboarding](https://developers.momo.vn/v3/vi/docs/payment/onboarding/)
