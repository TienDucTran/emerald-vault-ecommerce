# FIGMA SETUP CHECKLIST — EMERALD VAULT
> Bạn cần thực hiện thủ công trong Figma Desktop. Làm theo từng bước, tổng ~3 phút.

---

## BƯỚC 1: TẠO FILE (30 giây)
1. Mở **Figma Desktop** (không phải web)
2. Click **+** → **New design file**
3. Đặt tên: `Emerald Vault - Design System`

---

## BƯỚC 2: TẠO 4 PAGES (30 giây)
Click chuột phải vào tab "Page 1" phía dưới → **Rename**:
```
Page 1 → 🎨 Design System (tokens, components, typography)
Page 2 (new) → 📸 Laurelle Reference
Page 3 (new) → 📸 Lillicoco Reference
Page 4 (new) → 🏠 Wireframes (vẽ tay)
```

Để tạo page mới: click icon **+** cạnh tên page hiện tại.

---

## BƯỚC 3: DESIGN SYSTEM TOKENS (60 giây)

Trên page **"🎨 Design System"**, tạo 1 frame tên `Color Tokens` (1440×600):

```
┌─────────────────────────────────────────────────────────────┐
│  COLOR TOKENS — Emerald Vault (Retro Dark)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  #0D1117  ■■■■■  Background (Quartz Black)                 │
│  #051C12  ■■■■■  Background Gradient (Deep Emerald)         │
│  #161B22  ■■■■■  Surface                                    │
│  #12241C  ■■■■■  Card (Emerald Dark)                        │
│  #0A2F1D  ■■■■■  Card Alt (Emerald Antique)                 │
│  #D4AF37  ■■■■■  Gold (Primary Accent)                      │
│  #F1E5AC  ■■■■■  Champagne Gold (Highlight)                 │
│  #E6EDF0  ■■■■■  Text Base (Silver White)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Cách làm nhanh:
- Vẽ rectangle (R), đổ fill = hex code
- Text bên cạnh ghi tên + hex

Frame thứ 2 tên `Typography` (1440×400):
```
HEADINGS: Cinzel / Cormorant Garamond (Serif)
  H1: 48px / Bold     "Si Nhật — Antique Jewelry"
  H2: 36px / Semibold "Bộ Sưu Tập Mùa Hè"
  H3: 24px / Medium   "Nhẫn Bạc 925 SSS"

BODY: Inter (Sans-serif)
  Body L: 16px / Regular
  Body M: 14px / Regular
  Caption: 12px / Regular  "Bạc 925 · Nhật 1960s"
```

---

## BƯỚC 4: PASTE SCREENSHOTS TỪ 2 SITE (60 giây)

### 4.1. Lấy screenshot từ Lillicoco
1. Mở Chrome → incognito → vào: `https://www.lillicoco.com/collections/opalescent-waters?filter.v.availability=1&filter.p.m.custom.in_stock`
2. Click **Reject all** cookies
3. Đóng chat popup (nếu có)
4. Resize window về 1440px width
5. Nhấn **F12** (DevTools) → toggle device toolbar **OFF** (để ở desktop view)
6. Nhấn **Ctrl+Shift+P** → gõ `screenshot` → chọn **"Capture full size screenshot"**
7. File PNG sẽ tự download
8. Vào Figma page `📸 Lillicoco Reference` → **Ctrl+V** paste

### 4.2. Lấy screenshot từ Laurelle
1. Chrome incognito → `https://laurelleantiquejewellery.com/`
2. Tương tự như trên, capture full page
3. Paste vào page `📸 Laurelle Reference`

### 4.3. Lấy screenshot từng section quan trọng (optional nhưng khuyến nghị)
Tạo thêm các page con trong `📸 Lillicoco Reference`:
- Lillicoco - Hero
- Lillicoco - Filter Sidebar
- Lillicoco - Product Grid
- Lillicoco - Footer

Tương tự cho Laurelle.

---

## BƯỚC 5: COPY URL FILE (10 giây)
1. Trong Figma, click vào **Home** (góc trên trái) → click tên file
2. Chuột phải vào file `Emerald Vault - Design System` → **Copy link**
3. URL có dạng: `https://www.figma.com/design/XXXXXXXXXXXXXXX/Emerald-Vault-Design-System`
4. **File key** = phần giữa `/design/` và `/tên-file` (vd: `AbCdEf12345XyZ`)

---

## BƯỚC 6: GỬI CHO TÔI
Paste vào chat:
```
"Figma file: https://www.figma.com/design/AbCdEf12345XyZ/Emerald-Vault-Design-System
File key: AbCdEf12345XyZ"
```

Tôi sẽ dùng MCP để:
1. Đọc design tokens (colors, fonts, spacing) chính xác 100%
2. Liệt kê các section structure
3. Generate code Next.js + Tailwind từng component

---

## 🔗 SHORTCUTS HỮU ÍCH
| Phím tắt | Chức năng |
|---|---|
| `F` | Tạo Frame |
| `R` | Tạo Rectangle |
| `T` | Tạo Text |
| `Ctrl+Alt+K` | Color picker (paste hex) |
| `Ctrl+G` | Group |
| `Ctrl+Shift+K` | Plugin search |
| `2` | Zoom 100% |
| `0` | Zoom to fit |

---

## ❓ NẾU BẠN CHƯA CÓ FIGMA DESKTOP
Tải tại: https://www.figma.com/downloads
- Windows: file .exe
- Mac: file .dmg
- Yêu cầu đăng nhập tài khoản Figma (free)
