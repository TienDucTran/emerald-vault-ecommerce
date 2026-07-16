# Hướng dẫn setup GA4 Data API cho `/admin/analytics`

> Cần làm **1 lần** để trang `/admin/analytics` hiển thị data thật (sessions, events, countries, …) thay vì `—`.
> Sau khi xong, code đã sẵn ở `lib/analytics/*` + `app/api/admin/analytics/route.ts` — không cần đổi gì thêm.

---

## 1. Phân biệt 2 loại ID GA4 (rất hay nhầm)

| Tên env | Dạng | Lấy ở đâu | Dùng cho |
|---|---|---|---|
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` (G- + 10 ký tự) | GA4 Admin → **Data Streams** → click stream → "Measurement ID" (đầu stream) | Browser gắn script `<GoogleAnalytics gaId="G-..."/>` để tracking user |
| `GA4_PROPERTY_ID` | `123456789` (chỉ số) | GA4 Admin → **Property settings** → "Property ID" (góc trên bên phải) | Server-side gọi **GA4 Data API** (BetaAnalyticsDataClient) |

> Hai ID này **khác nhau** nhưng cùng property. VD: stream `G-ABC123XYZ0` có thể thuộc property `123456789`.
> Cần populate **cả hai** nếu muốn cả tracking (browser) + analytics dashboard (server) đều chạy.

---

## 2. Tạo Service Account (Google Cloud)

1. Vào https://console.cloud.google.com/
2. Chọn project (hoặc tạo mới) — nên dùng **cùng project GCP** với GA4 property (mặc định GA4 tạo 1 project GCP cho bạn, có tên dạng `ga4-[id]`).
3. Menu bên trái → **IAM & Admin** → **Service Accounts** → **+ Create Service Account**.
4. Điền:
   - Service account name: `ev-ga4-readonly` (tùy ý)
   - Service account ID: tự sinh (vd `ev-ga4-readonly`)
   - Mô tả: "Read GA4 data for Emerald Vault admin analytics"
   - Bỏ qua "Grant this service account access to project" (không cần role GCP).
5. Nhấn **Done**.

### 2.1. Tạo key JSON

1. Trong danh sách Service Accounts, click vào account vừa tạo.
2. Tab **Keys** → **Add Key** → **Create new key** → chọn **JSON** → **Create**.
3. File `.json` tự động tải về. **GIỮ BÍ MẬT file này** (full quyền đọc GA4 property của bạn).

### 2.2. Enable GA4 Data API

1. Menu bên trái → **APIs & Services** → **Library**.
2. Tìm **"Google Analytics Data API"** → click → **Enable**.
3. (Khuyến nghị) Cũng enable **"Google Analytics Admin API"** để test quyền.

---

## 3. Grant quyền Service Account vào GA4 Property

1. Mở https://analytics.google.com/ → chọn **đúng property** bạn muốn đọc.
2. Góc dưới-trái → **Admin** (bánh răng).
3. Cột **Property** → **Property Access Management**.
4. Trên cùng bên phải → nút **+** (màu xanh) → **Add users**.
5. Paste email của service account (dạng `ev-ga4-readonly@your-project.iam.gserviceaccount.com` — tìm trong file JSON vừa tải, field `client_email`).
6. Role: chọn **Viewer** (chỉ cần đọc; KHÔNG cần Analyst/Editor).
7. Bỏ tick "Notify new users by email" → **Add**.

> Phải đợi vài phút để quyền propagate (có khi tới 15-30 phút).

---

## 4. Lấy `GA4_PROPERTY_ID`

1. GA4 Admin → cột **Property** → **Property details** (hoặc Property Settings).
2. Phần **"Property ID"** góc trên phải — copy con số (vd `472839105`).
3. KHÔNG lấy Measurement ID (G-XXXX) — đó là cái khác.

---

## 5. Populate `.env.local`

Mở `D:\emerald-vault-ecommerce\.env.local`, thêm 2 dòng:

```bash
# === GA4 Data API (cho /admin/analytics) ===
GA4_PROPERTY_ID=472839105

# Paste TOÀN BỘ nội dung file JSON (1 dòng, escape cẩn thận) — KHÔNG dùng dấu nháy đơn.
# Cách dễ nhất: mở file JSON bằng Notepad, copy nguyên nội dung, rồi paste vào đây
# bằng cách bọc trong dấu nháy đôi và thay "\n" bằng newline thật (xem bước 6).
GA4_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}
```

### Escape `private_key` (Windows)

File JSON gốc có `private_key` chứa ký tự `\n` (literal). Khi dán vào `.env.local`:

- **Cách 1 (Node-friendly)**: dùng cú pháp `process.env.GA4_SERVICE_ACCOUNT_JSON!.replace(/\\n/g, '\n')` (code đã handle rồi).
- **Cách 2 (an toàn)**: dùng Node script để convert (xem bước 6).

Code ở `lib/analytics/ga4.ts` đã có `JSON.parse(...)` và truyền nguyên `credentials` cho `BetaAnalyticsDataClient`, nên chỉ cần 1 dòng JSON hợp lệ.

---

## 6. Cách populate an toàn bằng Node (khuyến nghị)

Mở PowerShell tại `D:\emerald-vault-ecommerce`:

```powershell
# 1. Lưu nội dung JSON vào file tạm (không commit)
node -e "const fs=require('fs');const j=fs.readFileSync('C:\Users\USER\Downloads\your-project-abc123.json','utf8');process.stdout.write(j)" > .ga4-key.tmp

# 2. Append vào .env.local dưới dạng 1 dòng (Node đã tự escape \n)
Add-Content -LiteralPath .env.local -Value "`nGA4_PROPERTY_ID=472839105"
Add-Content -LiteralPath .env.local -Value "GA4_SERVICE_ACCOUNT_JSON=$((Get-Content .ga4-key.tmp -Raw).Trim())"

# 3. Xóa file tạm
Remove-Item .ga4-key.tmp
```

Hoặc dùng helper script tự viết:

```js
// scripts/import-ga4-key.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const keyPath = await ask('Path to service account JSON: ');
const propertyId = await ask('GA4 Property ID (số): ');
rl.close();

const json = fs.readFileSync(keyPath.trim(), 'utf8').trim();
const envPath = path.resolve('.env.local');
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const stripped = existing
  .split('\n')
  .filter((l) => !l.startsWith('GA4_PROPERTY_ID=') && !l.startsWith('GA4_SERVICE_ACCOUNT_JSON='))
  .join('\n');
const next = `${stripped.replace(/\s+$/, '')}\n\n# === GA4 Data API ===\nGA4_PROPERTY_ID=${propertyId}\nGA4_SERVICE_ACCOUNT_JSON=${json}\n`;
fs.writeFileSync(envPath, next);
console.log('✅ Đã ghi .env.local. Nhớ restart dev server.');
```

Chạy: `node scripts/import-ga4-key.mjs`.

---

## 7. Test

1. Restart dev server: `npm run dev`.
2. Mở http://localhost:3000/admin/login → đăng nhập admin.
3. Vào http://localhost:3000/admin/analytics.
4. Banner warning "GA4 chưa configure" phải biến mất.
5. 4 KPI trên cùng + 4 ô phụ + donut country + chart daily sessions phải có số liệu thật.
6. Nếu vẫn báo warning → check:
   - `console.error` trong terminal dev server (route handler sẽ log lỗi GA4).
   - `GA4_PROPERTY_ID` đúng dạng số (không phải `properties/123`).
   - JSON hợp lệ: thử `node -e "JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON)"`.
   - Service account đã được add vào GA4 property với role Viewer (đợi 5-30 phút sau khi add).

---

## 8. Lưu ý production (Vercel)

- `GA4_SERVICE_ACCOUNT_JSON` chứa private key → KHÔNG commit vào git.
- Trên Vercel: Project Settings → Environment Variables → thêm `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` (paste nguyên JSON 1 dòng, Vercel tự xử lý).
- `.gitignore` đã có `.env.local` — an toàn.

---

## 9. Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `Permission denied` từ GA4 | Service account chưa được add vào GA4 property, hoặc role sai | Add lại với role **Viewer**; đợi 15-30 phút |
| `Property not found` | `GA4_PROPERTY_ID` sai (có thể đang dùng Measurement ID `G-XXX`) | Lấy lại từ Admin → Property details (con số) |
| `Invalid JWT Signature` | Service account JSON bị corrupt khi paste (thường do Windows line ending) | Dùng script ở bước 6 thay vì paste tay |
| `API not enabled` | Chưa enable Google Analytics Data API trong GCP project | Bước 2.2 |
| Banner warning vẫn hiện | Env chưa load (chưa restart) hoặc có typo | Restart dev server; check `.env.local` không có khoảng trắng thừa quanh dấu `=` |
| `Quota exceeded` | Quá 250K tokens/ngày (free GA4 Data API quota) | Giảm tần suất refresh; cache kết quả 60s với `unstable_cache` |
