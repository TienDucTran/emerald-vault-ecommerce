# 💎 Emerald Vault — Trang sức si Nhật vintage

Website e-commerce cho cửa hàng trang sức si Nhật vintage, phong cách retro/dark mode.

## 🚀 Quick start

```bash
# 1. Cài dependencies
npm install

# 2. Copy env & điền giá trị (xem .env.example)
cp .env.example .env.local

# 3. Chạy dev server
npm run dev
```

Mở http://localhost:3000

### 3. Setup ngân hàng (VietQR) — bắt buộc cho payment chính
- Copy `.env.example` → `.env.local` (nếu chưa)
- Điền `BANK_CODE` (xem danh sách ở `lib/bank/types.ts`) + `BANK_ACCOUNT_NUMBER` + `BANK_ACCOUNT_NAME`
- **KHÔNG cần đăng ký kinh doanh**, dùng tài khoản cá nhân được
- Test: tạo đơn BANK_TRANSFER → check QR render đúng STK + số tiền

### 4. Setup MoMo (Phase 2, optional)
- Làm theo `docs/momo-sandbox-setup.md` (cần MST doanh nghiệp)

## 📁 Structure

- `app/` — Next.js App Router (pages + API routes)
- `components/` — UI components (atomic design)
- `lib/` — utilities, types, mock data
- `flows.md` — Kiến trúc & luồng xử lý chi tiết
- `analysis.md` — Phân tích UI từ Laurelle & Lillicoco
- `todo.md` — Danh sách task cần làm
- `docs/momo-sandbox-setup.md` — Hướng dẫn đăng ký MoMo test account

## 🎨 Design System

- **Background**: `#0D1117` (Quartz Black) + `#051C12` (Deep Emerald)
- **Accent**: `#D4AF37` (Gold) + `#F1E5AC` (Champagne)
- **Text**: `#E6EDF0` (Silver White)
- **Heading**: Cinzel (Serif)
- **Body**: Inter (Sans-serif)

Xem chi tiết trong `tailwind.config.ts` + `app/globals.css`.

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router, RSC)
- **DB**: Supabase (Postgres + Storage + Auth)
- **State**: Zustand
- **Animation**: GSAP + ScrollTrigger (planned)
- **Payment**: **VietQR** (FREE, không cần MST — phương thức chính MVP) + MoMo captureWallet (sandbox ready, Phase 2) + COD
- **AI**: Vercel AI SDK + Google Gemini 2.5 Flash (FREE)
- **Deploy**: Vercel

## 📋 Next steps

Xem `todo.md` để biết task còn lại. Thứ tự ưu tiên:

1. 🔴 P0: Schema Supabase + Auth + MoMo integration
2. 🟡 P1: Product detail page đầy đủ + Cart flow
3. 🟣 P1: AI Chatbot
4. 🟢 P2: Polish, SEO, content

## 📊 Trạng thái (2026-07-17)

- ✅ Customer flow: end-to-end (COD + VietQR)
- ✅ Admin products + dashboard + orders + collections + newsletter: real data
- ✅ **VietQR payment** (sprint "VietQR + Unblock"): QR động + manual confirm + upload bill
- 🟡 **MoMo payment**: API ready (signature + IPN + idempotency), chờ populate env (Phase 2 khi có MST)
- 🟡 Admin inventory + payments + settings: còn mock (P2)
- ❌ AI Chatbot (P1 — 0%)
- ❌ End-user account (P1 — 0%)

Xem chi tiết trong `flows.md` §0 và `todo.md`.

### Setup nhanh cho contributor mới

1. Đọc `flows.md` (kiến trúc + flow chuẩn — **update file này trước khi code**)
2. Check `todo.md` để biết task còn pending
3. Setup **VietQR** bằng tài khoản cá nhân (3 env BANK_*) — bắt buộc cho payment
4. Setup MoMo sandbox theo [`docs/momo-sandbox-setup.md`](./docs/momo-sandbox-setup.md) (8 bước, ~20 phút, **cần MST** — Phase 2)

## 🔌 MCP Servers (optional)

Figma MCP đã config trong `kilo.json`. Set `FIGMA_TOKEN` trong `.env.local` rồi restart Kilo.
