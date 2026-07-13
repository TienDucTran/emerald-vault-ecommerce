# WORKFLOW UI DESIGN — EMERALD VAULT
> Tổng hợp 3 tool được sử dụng, vai trò từng cái, workflow tối ưu.

---

## 3 TOOL CHÍNH

### 1. html.to.design (Plugin Figma)
- **Mục đích**: Clone layout từ URL website thật → Figma layer
- **Input**: URL (vd: `https://www.lillicoco.com/...`)
- **Output**: Figma frame với đầy đủ text, colors, layout
- **Khi nào dùng**: Lấy cảm hứng component structure từ Laurelle / Lillicoco
- **Free tier**: 1 site/ngày

### 2. Figma MCP Server
- **Mục đích**: Để tôi (AI agent) đọc Figma file → generate code chính xác
- **Input**: Figma file URL + Personal Access Token
- **Output**: Tôi đọc nodes/text/colors/fonts → viết code Tailwind match 100%
- **Khi nào dùng**: Sau khi bạn đã design xong trong Figma, muốn tôi code

### 3. Google Stitch (stitch.withgoogle.com)
- **Mục đích**: AI generate UI từ natural language prompt
- **Input**: Prompt mô tả UI (vd: "Tạo homepage trang sức vintage dark theme có hero, trust strip, 4 collection cards")
- **Output**: HTML + Tailwind code (auto-generate)
- **Khi nào dùng**: Mockup nhanh nhiều biến thể, test ý tưởng trước khi design chi tiết
- **Lưu ý**: Output generic, không theo design system EV; không dùng làm code sản xuất

---

## WORKFLOW ĐỀ XUẤT (TỔNG CỘNG ~30-45 PHÚT)

```
Bước A: Setup Figma (3 phút)
   ↓
Bước B: html.to.design — import Laurelle + Lillicoco (10 phút)
   ↓
Bước C: Stitch — generate dark theme mockup (5 phút, optional)
   ↓
Bước D: Bạn design lại trong Figma theo dark theme (30-60 phút)
   ↓
Bước E: Gửi Figma URL → tôi đọc tokens → generate code (tôi làm)
```

---

## BƯỚC A: SETUP FIGMA (3 phút)
Xem `figma-setup-checklist.md`. Tóm tắt:
1. Tạo file `Emerald Vault - Design System`
2. 4 pages: Design System / Laurelle Ref / Lillicoco Ref / Wireframes
3. Tạo 2 frame tokens: `Color Tokens` (8 màu) + `Typography` (2 font)
4. Copy URL → gửi tôi

## BƯỚC B: HTML.TO.DESIGN (10 phút)
1. Figma → Plugins → `html.to.design` → install (nếu chưa có)
2. Page `📸 Laurelle Reference` → Plugins → html.to.design
3. URL: `https://laurelleantiquejewellery.com/`
4. Đợi 30-60s → Figma layer xuất hiện
5. Tương tự với Lillicoco URL trong page `📸 Lillicoco Reference`
6. **Lưu ý**: Free tier 1 site/ngày, nên làm 2 site khác ngày HOẶC screenshot section quan trọng bằng Chrome DevTools

## BƯỚC C: STITCH (5 phút, optional)
1. Vào `https://stitch.withgoogle.com` (cần Google account)
2. Prompt ví dụ:
   ```
   "Generate a homepage for an antique Japanese jewelry e-commerce site 
   with dark theme (#0D1117 background, gold #D4AF37 accent, emerald #12241C 
   card). Layout: 1 full-bleed hero with featured product, trust strip 
   with 4 icons (authentic / 10-min hold / freeship / secure), 4 collection 
   cards in grid, latest arrivals grid 4 columns, footer with newsletter. 
   Use Cinzel serif for headings, Inter sans-serif for body."
   ```
3. Stitch generate → bạn chọn variant đẹp nhất
4. Screenshot hoặc export → paste vào Figma page `🏠 Wireframes`
5. Dùng làm reference khi design tay

## BƯỚC D: DESIGN TRONG FIGMA (30-60 phút)
- Vẽ tay lại homepage, PLP, PDP, Cart, Checkout theo `flows.md` §16
- Dùng screenshots từ B + C làm reference
- Apply đúng color/typography tokens đã tạo ở Bước A

## BƯỚC E: TÔI GENERATE CODE
Bạn gửi:
```
Figma URL: https://www.figma.com/design/AbCdEf12345XyZ/...
File key: AbCdEf12345XyZ
```

Tôi dùng Figma MCP:
- `mcp_figma_get_file` → liệt kê structure
- `mcp_figma_get_node` → đọc tokens chính xác
- → Generate code Next.js + Tailwind từng component

---

## FALLBACK: NẾU BẠN KHÔNG DÙNG FIGMA
Bỏ qua A, B, D, E. Làm theo hướng:
1. Dùng Stitch (Bước C) generate mockup dark theme
2. Paste screenshot vào chat kèm mô tả
3. Tôi đọc layout từ ảnh + dùng `figma-design-tokens.json` làm chuẩn
4. Generate code (độ chính xác 80-90%, không 100%)

**Hoặc** bỏ qua hết — tôi generate code theo `flows.md` + `analysis.md` không cần Figma/Stitch (độ chính xác 70-80%, nhanh nhất).
