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

## 📁 Structure

- `app/` — Next.js App Router (pages + API routes)
- `components/` — UI components (atomic design)
- `lib/` — utilities, types, mock data
- `flows.md` — Kiến trúc & luồng xử lý chi tiết
- `analysis.md` — Phân tích UI từ Laurelle & Lillicoco
- `todo.md` — Danh sách task cần làm

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
- **Payment**: MoMo captureWallet (sandbox ready)
- **AI**: Vercel AI SDK + Google Gemini 2.5 Flash (FREE)
- **Deploy**: Vercel

## 📋 Next steps

Xem `todo.md` để biết task còn lại. Thứ tự ưu tiên:

1. 🔴 P0: Schema Supabase + Auth + MoMo integration
2. 🟡 P1: Product detail page đầy đủ + Cart flow
3. 🟣 P1: AI Chatbot
4. 🟢 P2: Polish, SEO, content

## 🔌 MCP Servers (optional)

Figma MCP đã config trong `kilo.json`. Set `FIGMA_TOKEN` trong `.env.local` rồi restart Kilo.
