# PHÂN TÍCH UI/UX & FEATURES — LAURELLE & LILLICOCO
> Phân tích chi tiết 2 website tham khảo để đối chiếu với plan Emerald Vault. Ngày: 2026-07-13.

---

## 1. TỔNG QUAN 2 WEBSITE

### 1.1. Laurelle Antique Jewellery (`laurelleantiquejewellery.com`)
- **Style**: Luxury single-product focus, rất museum-like
- **Màu chủ đạo**: White/cream background, gold accent, dark green logo
- **Tone**: Formal, storytelling, provenance-focused
- **Slogan ẩn**: "30 năm chuyên gia, 100,000 khách hàng hạnh phúc"
- **Trust signals mạnh**: NAJ logo (National Association of Jewellers), Trustpilot, 30 năm kinh nghiệm

### 1.2. Lillicoco (`lillicoco.com`)
- **Style**: Cute vintage/romantic, illustration-driven
- **Màu chủ đạo**: Off-white, soft pastels, hand-drawn illustrations
- **Tone**: Playful, thân thiện, dễ tiếp cận
- **Điểm đặc biệt**: "Latest Drops" — collection mới mỗi tuần (thứ 3, 5, 7), tạo FOMO
- **Illustration icon**: Mỗi category có 1 icon vẽ tay riêng

### 1.3. Đối chiếu với Emerald Vault
| Khía cạnh | Laurelle | Lillicoco | Emerald Vault (hiện tại) | Gợi ý |
|---|---|---|---|---|
| Tone | Luxury, formal | Cute, friendly | **Retro/dark, vintage Pháp-Nhật** | Giữ tone riêng |
| Audience | Collector già (UK) | Collector trẻ (UK) | Collector Việt Nam | UI tiếng Việt, vibe Á Đông |
| Color | White/gold | Off-white/pastel | **Dark/black/gold/emerald** | Khớp brand |
| Trust | NAJ, 30 năm | Reviews | Cần xây dựng | Xem §4.2 |
| Drop cadence | Không cố định | Mỗi tuần 2-3 lần | Chưa có | **Nên áp dụng "Weekly Drop"** |
| Hero pattern | Single featured product | Hero slideshow + drops | Chưa có | Clone pattern này |

---

## 2. CẤU TRÚC TRANG CHI TIẾT

### 2.1. Trang chủ (Homepage)

**Laurelle**:
```
1. Top bar: "ENGLAND | 0333 700 4500" + Social icons
2. Header: Logo + Nav (Engagement / Antique / Vintage / New In / About) + Login/Search/Cart
3. Announcement bar: "SUMMER SALE - 50% OFF" (rotating)
4. HERO: Full-bleed image với overlay text "Up to 50% off" + CTA
5. Trust strip: 4 icons (Free Sizing / Free Delivery / Free Valuation / Sustainability)
6. "Shop with confidence" + Trustpilot embed
7. SHOP CURATED COLLECTIONS: 8 cards grid (Rings, Earrings, Necklaces, ...)
8. Unique Engagement Rings: Ảnh full-width + heading lớn + CTA
9. Browse by Era: 5 cards (Georgian / Victorian / Edwardian / Art Deco / Vintage)
10. Price filter grid: 7 chips (Under £200 → Over £5000)
11. About Us: 2-column (text + image)
12. Luxury Boxes: Image + text + CTA
13. Payment Options: Image + text + CTA
14. Tariffs Covered: Image + text
15. App download: CTA
16. "As seen in" press logos
17. Footer với newsletter signup
```

**Lillicoco** (collection landing):
```
1. Header: Logo + Search + Wishlist + Account + Cart
2. Country selector modal (multi-currency)
3. COLLECTION HERO: H1 title + story text (3-4 câu) + 3 hero images carousel
4. Breadcrumb (Home / Shop / Opalescent Waters)
5. SIDEBAR FILTER (sticky):
   - In stock toggle
   - Price range slider (£)
   - Era (multi-select)
   - Gemstone (multi-select)
   - Semi-Precious Stone
   - Metal
   - Product Type
6. MAIN: Sort dropdown + "X of Y products" + Grid 2-col mobile / 4-col desktop
7. Footer
```

**Emerald Vault đề xuất (kết hợp cả 2)**:
```
1. Announcement bar (rotating): "Miễn phí ship nội địa đơn từ 2 triệu"
2. Header: Logo + Nav + Search/Cart với countdown badge
3. HERO: 1 sản phẩm nổi bật (full-bleed) + GSAP fade-in
4. Trust strip: 4 icons (Authentic / 10-min Hold / Free Ship / 100% Secure)
5. Featured Collections: 4-6 cards (GSAP stagger reveal)
6. "Si Mới Về" (Latest Drops): Grid 4 col, copy từ Lillicoco
7. "Khám phá theo mùa" (Browse by Season): 4 cards
8. Tier showcase: SSS / SS / S với giải thích chất lượng
9. Chatbot bubble (góc phải, nổi bật)
10. Footer: Newsletter + Social + Payment icons
```

### 2.2. Trang danh sách sản phẩm (PLP)

**Cả 2 site dùng pattern giống nhau**:
- Breadcrumb phía trên
- Collection title + description (storytelling)
- Sidebar filter trái (sticky trên desktop, drawer trên mobile)
- Sort dropdown phải: Most relevant / Price ↑↓ / Date ↑↓
- Grid 2 col mobile, 3 col tablet, 4 col desktop
- Product card: Ảnh chính (hover swap ảnh phụ) + Title + Price
- Pagination cuối trang

**Laurelle còn có**:
- "Sale items" badge highlight
- "Newly listed" section riêng
- Price filter chip ở homepage

**Lillicoco còn có**:
- "In stock" toggle prominent
- Multi-currency selector
- "17 of 29 products" counter
- Filter có badge đếm số kết quả

**Emerald Vault nên làm**:
```
- Filter sidebar:
  [✓] Chỉ còn hàng (default: ON — vì đồ si độc bản)
  Khoảng giá (slider VND)
  Danh mục (Nhẫn / Dây chuyền / Bông tai / Vòng / Mặt dây)
  Chất liệu (Bạc 925 / Mạ vàng / ...)
  Tier chất lượng (SSS / SS / S) — điểm độc đáo của EV
  Mùa (SUMMER_2026 / VINTAGE_AUTUMN / ...)
  Collection (dropdown)
- Grid responsive 2/3/4 col
- Counter "Hiển thị 12 / 45 sản phẩm"
- Sort: Nổi bật / Mới nhất / Giá ↑↓ / Tier
- Empty state: "Chưa có sản phẩm phù hợp, bạn có thể đăng ký nhận thông báo"
```

### 2.3. Trang chi tiết sản phẩm (PDP)

**Laurelle** (chưa fetch, dựa trên pattern e-commerce chuẩn):
- Gallery ảnh lớn + thumbnails bên trái
- Title + Price + Material + Era + Provenance story
- Quantity selector + Add to Cart
- Accordion: Description / Era Details / Shipping / Care Instructions
- Related products

**Lillicoco** (chưa fetch, dựa trên pattern):
- Gallery với zoom
- Title dạng vintage typography
- Ảnh phụ: model wearing, scale shot, macro detail
- Provenance / story
- Era badge
- Metal badge (18ct Gold, Silver, etc.)
- Add to cart + Wishlist
- Layaway option (3 installments)
- Trust badges (authenticity, returns, worldwide shipping)

**Emerald Vault PDP nên có**:
```
[ Gallery ảnh 1 chính + 4 phụ (zoom) ]   [ Sticky info column:
                                          - Tier badge (SSS gold, lớn)
                                          - Title (font Serif, lớn)
                                          - Material (Bạc 925 - subtle)
                                          - Era/Origin (Nhật 1960s)
                                          - Price (Gold, lớn)
                                          - Story (2-3 dòng)
                                          - [GIỮ HÀNG 10 PHÚT] button (gold, primary)
                                          - [Wishlist] heart icon
                                          - Trust micro-icons ]
[ Long description: CÂU CHUYỆN MÓN ĐỒ ]
   - Provenance (lịch sử nguồn gốc)
   - Cách bảo quản
   - Kích thước/chất liệu chi tiết
[ Accordion: Vận chuyển / Đổi trả / Hướng dẫn bảo quản ]
[ Bạn có thể thích: 4 sản phẩm cùng tier/category ]
[ Recently Viewed ]
```

### 2.4. Trang Collection

**Laurelle**: Mỗi collection có hero ảnh + story + filter inline (Era, Stone) + grid
**Lillicoco**: Ấn tượng hơn với "Latest Drops" pattern — mỗi collection mới có:
- Title độc đáo (Opalescent Waters, Berry Romantic, Antique Candy, Harlequin Finery)
- Drop date/time cụ thể
- Story dạng editorial ngắn
- Hero gallery 3 ảnh
- "Inspired by..." storytelling

**Emerald Vault nên có**:
- Bảng `collections` đã có trong schema ✓
- Mỗi collection có: name, slug, cover_image, description (rich text), is_published, display_order
- Pattern "Seasonal Drops" — mỗi 2-4 tuần ra collection mới, có launch_at timestamp
- Trang /bo-suu-tap/[slug] hiển thị grid products trong collection
- Trang /bo-suu-tap (list all) dạng mosaic ảnh lớn

### 2.5. Giỏ hàng & Checkout

**Laurelle dùng Shopify checkout** (3-step: Information / Shipping / Payment)
**Lillicoco dùng Shopify checkout** (có express checkout, Shop Pay, multi-currency)

**Emerald Vault checkout flow đã có trong flows.md §7**, cần polish:
- Step 1: Thông tin (tên, SĐT, email, tỉnh/quận, địa chỉ, ghi chú)
- Step 2: Phương thức TT (MoMo / COD)
- Step 3: Xác nhận + thanh toán
- Không bắt buộc đăng ký (đã chốt guest checkout)

### 2.6. Trust signals & Conversion

**Laurelle có rất nhiều**:
- "12,000 proposals and counting" (social proof)
- "Over 100,000 happy customers since 1991"
- Trustpilot embed
- NAJ logo
- Press logos ("As seen in")
- EU/USA Tariffs Covered banner
- Free Ring Sizing
- Free Delivery
- Free Valuation

**Lillicoco có**:
- "Exclusively Available Online"
- Express Shipping Worldwide
- Wishlist counter
- New arrival countdown (drops ngày giờ cụ thể)
- "Lillicoco Guarantee"
- 14-day return
- Layaway (3 installments)

**Emerald Vault cần bổ sung**:
- Trust strip: "Đồ si đã qua tuyển chọn bởi chuyên gia" / "Giữ hàng 10 phút — không ai cướp được" / "Freeship nội địa từ 2 triệu" / "Đổi trả 7 ngày"
- Counter social proof: "Đã có 500+ nhà sưu tầm tin tưởng" (nếu có data)
- Trustpilot Vietnam (chưa phổ biến) → thay bằng Google Reviews widget
- "Sản phẩm đã được thẩm định" badge
- WhatsApp/Zalo chat button (đã có chatbot AI, có thể thêm 1 entry point)

---

## 3. CẤU TRÚC NAVIGATION CHI TIẾT

### 3.1. Laurelle nav structure
```
ENGAGEMENT RINGS
├── Precious Stones
│   ├── Diamond / Sapphire / Ruby / Emerald / View All
├── Semi-Precious Stones
│   ├── Amethyst / Aquamarine / Zircon / Citrine / Moonstone / Opal / ...
├── Ring Type
│   ├── Cluster / Solitaire / Trilogy / Platinum / Gold
└── Rings By Era
    ├── Antique / Art Deco / Edwardian / Georgian / Victorian / Vintage

ANTIQUE JEWELLERY
├── Antique Rings (Diamond/Sapphire/Emerald/Ruby/Semi-Precious/Georgian/...)
├── Antique Jewellery (Rings/Earrings/Necklaces/Bracelets/Pendants/Brooches/...)
├── Shop by Stone (Amethyst/Aquamarite/Citrine/Diamond/Emerald/...)
└── Special Offers
    ├── Sale 50% Off / Under £300 / Under £500 / Under £750 / Under £1,000
    ├── Lab Grown Diamond / Luxury Boxes / App / Sell Your Jewellery

VINTAGE JEWELLERY
├── Precious Stones (Diamond/Sapphire/Ruby/Emerald/Pearl)
├── Semi-Precious (Amethyst/Aquamarite/Moonstone/Opal/...)
├── Jewellery Type (Brooches/Bracelets/Earrings/Necklaces/Rings)
└── Ring Type (Engagement/Cluster/Eternity/Trilogy/Toi et Moi/5 Stone/Cocktail/Daisy)

NEW IN
ABOUT US (Our Blog / Advice Centre / Finance / Shipping / FAQs)
CONTACT US
VACANCIES
```

**Phân tích**: Laurelle dùng cấu trúc filter lồng nhau rất sâu (3-4 cấp) → dễ overwhelm người dùng. Phù hợp với audience là collector chuyên nghiệp.

### 3.2. Lillicoco nav structure
```
SHOP JEWELLERY
├── By Collection (Shop All, Engagement Rings)
├── By Type (Engagement/Rings/Earrings/Pendants/Lockets/Necklaces/Chains/Bracelets/Brooches)
├── By Gemstone (Diamond/Ruby/Emerald/Sapphire/Semi-precious)
├── By Era (Art Deco/Art Nouveau/Edwardian/Georgian/Victorian)
└── By Semi-Precious Gemstone (Amethyst/Agate/Aquamarite/Carnelian/Citrine/...)

LATEST DROPS (4 collection mới nhất với date)

LOVE & ENGAGEMENT
├── Shop Engagement Rings
├── Begin Your Journey
├── Why Buy Antique or Vintage?
├── How to Choose the Perfect Ring
└── The Lillicoco Guarantee

LEARN
├── Join the Lillicoco Vault
├── Lillicoco University
├── Hallmarking
├── Blog
└── Ring Size Conversion Chart

ABOUT
├── About us
├── Get in Touch (Contact, Schedule Appointment)
├── Deliveries & Returns
├── Servicing, Maintenance & Repairs
├── Layaway
└── FAQs
```

**Phân tích**: Lillicoco structure gọn hơn (2 cấp) + có "Latest Drops" sidebar rất tốt cho FOMO.

### 3.3. Emerald Vault nav đề xuất (gọn hơn, hợp dark theme)
```
SI NHẬT
├── Nhẫn (Rings)
├── Dây chuyền (Necklaces)
├── Bông tai (Earrings)
├── Vòng tay (Bracelets)
└── Mặt dây (Pendants)

BỘ SƯU TẬP
├── [List collection với cover image]
└── Mùa mới (season_tags filter)

THEO CHẤT LIỆU
├── Bạc 925
├── Mạ vàng 18K
├── Mạ vàng 24K
└── Vàng 18K

THEO TIER
├── SSS — Mới nguyên seal
├── SS — Trên 95%
└── S — Trên 90%

CÂU CHUYỆN
├── Về chúng tôi
├── Cách phân biệt đồ si
├── Hướng dẫn bảo quản
└── Blog

LIÊN HỆ
```

---

## 4. FEATURES MỚI CẦN THÊM VÀO PLAN

### 4.1. P0 — Bắt buộc cho MVP

| Feature | Từ site nào | Mô tả | Update vào |
|---|---|---|---|
| **Announcement bar** | Laurelle | Top bar xoay vòng (sale, free ship, ...) | `components/layout/announcement-bar.tsx` |
| **Tier showcase section** | Mới | Giải thích SSS/SS/S trên homepage | `components/home/tier-showcase.tsx` |
| **Currency selector** | Lillicoco | Multi-currency (VND/USD) cho khách QT | Có thể bỏ MVP — chỉ VND |
| **Multi-currency** | Lillicoco | Hiển thị giá theo locale | Optional P2 |
| **Wishlist heart icon** | Lillicoco | Lưu yêu thích (localStorage) | `components/ui/wishlist-button.tsx` |
| **Trustpilot/review embed** | Laurelle | Review widget | Optional P2 |
| **Breadcrumb component** | Cả 2 | Mỗi page có breadcrumb | `components/ui/breadcrumb.tsx` |
| **"X of Y products" counter** | Lillicoco | Trên PLP | `components/product/product-count.tsx` |
| **In-stock toggle default** | Lillicoco | Filter bật sẵn (vì đồ si độc bản) | Update filter logic |

### 4.2. P1 — Quan trọng

| Feature | Từ site nào | Mô tả |
|---|---|---|
| **"Latest Drops" pattern** | Lillicoco | Collection mới có ngày giờ release, tạo FOMO |
| **Story-driven collection** | Cả 2 | Mỗi collection có "Inspired by..." narrative |
| **Editorial long-form story** | Cả 2 | PDP có phần CÂU CHUYỆN dài, có ảnh minh họa |
| **Care/Authentication guide** | Laurelle | Trang hướng dẫn phân biệt đồ si thật |
| **Newsletter popup** | Cả 2 | Sau 30s hiện popup đăng ký |
| **Recently viewed** | Cả 2 | Lưu 6 sản phẩm vừa xem |
| **Comparison table** | Mới | So sánh 2-3 sản phẩm cạnh nhau |
| **Zoom ảnh sản phẩm** | Cả 2 | Hover để zoom chi tiết |
| **Hover swap ảnh** | Cả 2 | Card hover → đổi sang ảnh phụ |

### 4.3. P2 — Polish

| Feature | Từ site nào | Mô tả |
|---|---|---|
| **Schedule an Appointment** | Lillicoco | Booking 1-1 tư vấn (calendar) |
| **Layaway (trả góp 3 đợt)** | Lillicoco | Cho khách mua sản phẩm giá cao |
| **App download banner** | Laurelle | Link App Store / Play Store |
| **Press logos** | Laurelle | "As seen in" → build credibility |
| **Currency converter** | Laurelle | Widget quy đổi tiền |
| **Tariff info banner** | Cả 2 | EU/USA tariff (chỉ khi xuất khẩu) |
| **Sell your jewellery** | Laurelle | User gửi đồ để resale (out of MVP scope) |
| **Lillicoco University (LMS)** | Lillicoco | Khóa học về antique jewelry (content marketing) |
| **Birthstone guide** | Cả 2 | Trang theo tháng sinh |
| **Era guide** | Cả 2 | Trang giải thích các era (Georgian, Victorian, ...) |
| **Hallmarking guide** | Lillicoco | Trang giải thích về dấu hallmark (chuyên sâu) |

---

## 5. THIẾU KẾT TRONG PLAN HIỆN TẠI

### 5.1. Component thiếu
- `components/layout/announcement-bar.tsx` ← **BỔ SUNG**
- `components/product/product-count.tsx` ← **BỔ SUNG**
- `components/product/recently-viewed.tsx` ← **BỔ SUNG**
- `components/product/zoom-image.tsx` ← **BỔ SUNG**
- `components/home/tier-showcase.tsx` ← **BỔ SUNG**
- `components/home/latest-drops.tsx` ← **BỔ SUNG** (nếu dùng pattern Lillicoco)
- `components/ui/breadcrumb.tsx` ← **BỔ SUNG**
- `components/ui/wishlist-button.tsx` ← **BỔ SUNG**
- `components/care/`
  - `care-guide.tsx` ← **BỔ SUNG** (trang hướng dẫn)
  - `authentication-guide.tsx` ← **BỔ SUNG**

### 5.2. Pages thiếu
- `/cach-phan-biet-do-si` (hướng dẫn phân biệt) ← **BỔ SUNG**
- `/huong-dan-bao-quan` (hướng dẫn bảo quản) ← **BỔ SUNG**
- `/blog` (nếu làm content marketing) ← **OPTIONAL**
- `/cau-chuyen` (about) ← ĐÃ CÓ trong flows.md
- `/lien-he` ← ĐÃ CÓ

### 5.3. Schema bổ sung
```sql
-- Bảng newsletter subscribers
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(120) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng reviews (optional - P2)
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_name VARCHAR(120),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bổ sung field cho collections
ALTER TABLE collections
  ADD COLUMN launch_at TIMESTAMPTZ,            -- ngày giờ drop (Lillicoco pattern)
  ADD COLUMN story_text TEXT,                  -- "Inspired by..." narrative
  ADD COLUMN hero_gallery TEXT[] DEFAULT '{}', -- 3 ảnh hero
  ADD COLUMN meta_title VARCHAR(200),
  ADD COLUMN meta_description TEXT;
```

---

## 6. KHÁC BIỆT VỀ VISUAL STYLE (cần adapt sang dark theme)

| Element | Laurelle (light) | Lillicoco (light) | Emerald Vault (dark retro) |
|---|---|---|---|
| Background | Trắng ngà `#FBF8F3` | Off-white `#FAF6F0` | **Đen thạch anh `#0D1117`** |
| Card | Trắng | Trắng | **`#161B22` hoặc Emerald `#12241C`** |
| Border | Subtle gray | Subtle gray | **Gold `#D4AF37` mờ 20%** |
| Heading font | Serif (Playfair) | Serif (custom) | **Cinzel / Cormorant Garamond** |
| Body font | Sans (Inter) | Sans (custom) | **Inter** |
| Price color | Black | Black | **Gold `#D4AF37`** |
| Hover effect | Subtle zoom | Subtle swap | **Gold shine + GSAP sparkle** |
| Buttons | Solid black | Solid dark green | **Gold border + dark fill** |
| Sale badge | Red | Red | **Gold pulse** |

---

## 7. WORKFLOW ĐỀ XUẤT ĐỂ CLONE UI

### Phase 1: Research & Design (1-2 ngày)
1. Cài `html.to.design` plugin Figma (free tier)
2. Vào laurelle + lillicoco → capture full-page screenshot
3. Paste URL vào plugin → nhận Figma layer
4. Tạo 1 file Figma mới "Emerald Vault Design System"
5. Copy section patterns hay → adapt sang dark theme

### Phase 2: Wireframe (1 ngày)
1. Vẽ tay wireframe cho 5 page chính (Home / PLP / PDP / Cart / Checkout)
2. Define component library trong Figma
3. Setup color tokens, typography, spacing

### Phase 3: Visual design (2-3 ngày)
1. Design high-fidelity mockup
2. Export ảnh tham khảo
3. Đưa cho dev code

### Phase 4: Code (song song với việc implement flows.md)
1. Tạo components theo §4 của flows.md
2. Style theo design tokens
3. Test responsive

---

## 8. KẾT LUẬN

**Mức độ overlap với plan hiện tại**: ~75%
- Đã có: Schema, payment flow, auth, admin, chatbot
- **Thiếu**: Announcement bar, tier showcase, breadcrumb, wishlist, recently viewed, zoom image, care guide pages
- **Cần polish**: Nav structure gọn hơn, collection với launch date, story-driven PDP, trust signals cho thị trường VN

**Tóm tắt ưu tiên**:
1. Bổ sung 9 components thiếu (§5.1) — làm trong sprint đầu
2. Bổ sung 2 trang content (cách phân biệt, bảo quản) — P1
3. Schema thêm `newsletter_subscribers` + field cho collections — P1
4. Latest Drops pattern — P1 (differentiation mạnh)
5. Care guide UI — P2

**Không cần clone (vì không hợp dark theme)**:
- Press logos
- App download banner
- Currency converter (VND-only)
- Multi-currency selector
- Hallmarking guide (quá chuyên sâu UK)
