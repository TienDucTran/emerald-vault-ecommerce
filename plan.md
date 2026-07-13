Markdown
# BẢN THIẾT KẾ HỆ THỐNG & CẤU TRÚC WEBSITE TRANG SỨC SI NHẬT (RETRO / DARK MODE)

Tài liệu này cung cấp toàn bộ kiến trúc hệ thống, cấu trúc thư mục Next.js (App Router), định hướng thiết kế giao diện (UI/UX) theo phong cách tiệm kim hoàn cổ điển Pháp/Nhật, kịch bản cấu hình Google Analytics 4 (GA4) để tracking hành vi client, và các prompt chi tiết cho từng component để bạn đưa vào Cline/VS Code triển khai.

---

## 1. TECHSTACK ARCHITECTURE & PRODUCTION DEPLOYMENT (SUPABASE-CENTRIC)

Hệ thống được thiết kế theo mô hình decoupled (Headless) nhằm tối ưu hóa tốc độ tải trang, khả năng chịu tải khi chạy Ads lớn và tăng cường điểm SEO hình ảnh (Next/Image với định dạng WebP/AVIF).

[ Client Browser ] ---> ( Vercel Edge Network / Next.js Frontend )
|
+---------------------+---------------------+
| (Rest API / GraphQL)                      | (Script Injection)
v                                           v
( Supabase Backend Service )                    ( Google Analytics 4 )

PostgreSQL: Dữ liệu thực thể & Phân loại      - Phân tích hành vi

Storage: Bucket 'jewelry-images' (.webp)      - Đo lường chuyển đổi

Auth: Phân quyền Admin/Client Middleware


### Quản lý Trạng thái Kho hàng Đặc thù (Đồ Si - Độc bản)
*   **Vấn đề:** Mỗi món hàng chỉ có số lượng `quantity = 1`.
*   **Giải pháp:** Áp dụng cơ chế **DB Row-level locking** thông qua Supabase. Khi client trigger sự kiện `addToCart`, trạng thái sản phẩm chuyển thành `PENDING_LOCK` trong 10 phút. Sử dụng PostgreSQL với lệnh `SELECT FOR UPDATE` để tránh tình trạng race-condition khi hai client cùng bấm chốt một mẫu trang sức từ quảng cáo đổ về.
*   **Media Storage:** Sử dụng trực tiếp **Supabase Storage (Bucket public `jewelry-images`)** để lưu trữ hình ảnh trang sức dưới định dạng `.webp`. URL ảnh lưu trong DB sẽ có dạng: `https://[your-project-id].supabase.co/storage/v1/object/public/jewelry-images/[image-name].webp`. Giai đoạn đầu không cần cấu hình bên thứ ba (Cloudinary/S3) để tối ưu chi phí và vận hành gọn nhẹ.

---

## 2. CONFIGURING GA4 IN NEXT.JS (APP ROUTER)

Để phân tích sâu hành vi người dùng (User Behavior), chúng ta tích hợp GA4 thông qua gói chính thức `@next/third-parties`. Bạn cần đo lường các sự kiện e-commerce tiêu chuẩn thay vì chỉ đo pageviews chung chung.

### Cách cấu hình trong Root Layout (`app/layout.tsx`)
Sử dụng component `<GoogleAnalytics />` để tránh làm chậm quá trình render luồng chính (Main thread):

```tsx
import { GoogleAnalytics } from '@next/third-parties/google';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {children}
        <GoogleAnalytics gaId="G-XXXXXXXXXX"/>
      </body>
    </html>
  );
}
Các Custom Event Matrix cần đo lường (Dành riêng cho Đồ Si)
view_item: Kích hoạt khi khách vào xem chi tiết sản phẩm. Cần lưu tham số material (Bạc 925, mạ vàng) và condition (độ mới) để phân tích gu của khách.

lock_item_success: Đo lường khi khách thêm vào giỏ hàng thành công (bắt đầu chu kỳ giữ hàng 10 phút).

lock_item_timeout: Khách giữ hàng nhưng không thanh toán, để bộ đếm thời gian (countdown) về 0. Định vị xem tỷ lệ drop-off nằm ở bước nào.

purchase: Gửi kèm thông tin doanh thu, danh mục hàng (Nhẫn, Dây chuyền, Bông tai) lên GA4 dashboard.

3. CHỈ ĐỊNH DESIGN SYSTEM (RETRO / DARK MODE VISUAL)
Giao diện giả lập không gian một tiệm kim hoàn cổ kính, ánh đèn mờ tập trung vào tủ kính nhung tối màu, nơi trang sức bắt sáng rực rỡ nhất.

Bảng màu (Tailwind Config Color):

Background: #0D1117 (Đen thạch anh sâu) kết hợp #07140F (Gradient mờ sang xanh lục bảo cực tối).

Surface / Card: #161B22 hoặc Xanh Lục Bảo cổ điển (#0A2F1D).

Accent / Text Highlight: Vàng Gold cổ kính (#D4AF37) hoặc Vàng Champagne (#F1E5AC).

Text Base: #E6EDF0 (Trắng bạc nhạt, tránh dùng trắng tinh #FFF gây mỏi mắt trên nền tối).

Typography:

Headings (h1, h2, h3): Sử dụng Font Serif sang trọng như Cinzel, Playfair Display, hoặc Cormorant Garamond để khơi gợi cảm giác hoài cổ Pháp/Nhật.

Body Text: Dùng Font Sans-serif mượt mà, dễ đọc trên môi trường tối như Inter hoặc Montserrat.

Hiệu ứng Thừa hành (GSAP Layer):

Sparkle Effect: Khi client hover vào một card trang sức, một hiệu ứng lấp lánh (Canvas-based hoặc SVG tinh gọn) chạy dọc theo bề mặt mộc triện hoặc viên đá đính trên nhẫn.

Smooth Scroll & Reveal: Sử dụng gsap kết hợp ScrollTrigger để các bộ sưu tập trượt ra từ bóng tối (Fade-in mượt kết hợp scale nhẹ từ 0.95 lên 1).

4. ARCHITECTURE & NEXT.JS DIRECTORY STRUCTURE (MONOREPO ADMIN)
Trang quản trị Admin Dashboard được quản lý tập trung ngay trong cấu trúc Route của dự án (app/(admin)/dashboard/) thay vì tách Repo, giúp tối ưu hạ tầng Serverless và đồng bộ Design System Tailwind CSS. Bảo mật nghiêm ngặt bằng Supabase Auth + Next.js Middleware (Kiểm tra JWT metadata role === 'admin').

Plaintext
my-vintage-jewelry/
├── app/
│   ├── layout.tsx                 # Cấu hình Root Layout, Font Google, GA4 Provider
│   ├── page.tsx                   # Trang chủ (Hero, Collection Grid, Story)
│   ├── san-pham/
│   │   ├── page.tsx               # Trang danh sách sản phẩm (Server-side Filter)
│   │   └── [slug]/
│   │       └── page.tsx           # Chi tiết sản phẩm (SEO Meta động, SSR)
│   ├── gio-hang/
│   │   └── page.tsx               # Giỏ hàng với tính năng Countdown Lock 10 phút
│   ├── (admin)/
│   │   └── dashboard/
│   │       ├── page.tsx           # Tổng quan báo cáo đơn hàng & sản phẩm độc bản
│   │       ├── collections/       # Quản lý danh mục/kiện hàng theo mùa
│   │       └── products/
│   │           └── bulk-upload/   # Giao diện Quick-form/Import Excel đăng hàng loạt
│   └── api/
│       ├── lock-item/
│       │   └── route.ts           # API Route xử lý concurrency lock bằng Supabase DB
│       └── admin/
│           └── bulk-import/       # API xử lý insert hàng loạt sản phẩm độc bản (quantity=1)
├── components/
│   ├── ui/                        # Các Atomic Components (Button, Input, Badge)
│   │   ├── shine-button.tsx
│   │   └── product-card.tsx       # Card tích hợp GSAP Sparkle
│   └── shared/
│       ├── navbar.tsx             # Thanh điều hướng Retro cố định
│       └── footer.tsx
├── hooks/
│   ├── use-gsap-sparkle.ts        # Custom hook kích hoạt hiệu ứng lấp lánh
│   └── use-ga4-events.ts          # Custom hook trigger các hành vi e-commerce
├── lib/
│   ├── supabase-client.ts         # Khởi tạo kết nối Supabase Backend
│   └── utils.ts
├── public/
│   └── assets/                    # Lưu trữ logo, hình ảnh nền mờ nghệ thuật
└── tailwind.config.js             # Định nghĩa mã màu Gold, Emerald, Đen Thạch Anh
5. DATABASE SCHEMA PHÂN LOẠI (MÙA, NỔI BẬT, CHẤT LƯỢNG)
Bảng products được thiết kế chặt chẽ bằng các trường dữ liệu tĩnh phục vụ tối ưu hóa câu lệnh Query (Index-optimized) trên Supabase:

SQL
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    price NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE',   -- AVAILABLE, PENDING_LOCK, SOLD_OUT
    image_url VARCHAR(500) NOT NULL,           -- Đường dẫn public từ Supabase Storage
    
    -- Các trường phục vụ phân loại chiến dịch và tối ưu UI/UX
    is_featured BOOLEAN DEFAULT false,         -- Đưa sản phẩm lên Banner/Hero Section
    quality_tier VARCHAR(50) NOT NULL,         -- Phân cấp nước si: 'SSS' (Mới nguyên tag), 'SS' (>95%), 'S' (>90%)
    season_tags VARCHAR[] DEFAULT '{}',        -- Chạy sản phẩm theo mùa: ['SUMMER_2026', 'VINTAGE_AUTUMN']
    
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index tăng tốc truy vấn khi chạy Ads đổ bộ lớn vào bộ lọc
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_filters ON products(is_featured, quality_tier);
6. PROMPTS HƯỚNG DẪN CLINE / VS CODE TỰ ĐỘNG GENERATE CODE
Dưới đây là các prompt chuẩn chỉ kỹ thuật để bạn copy-paste thẳng vào Cline/VS Code Extension để nó tự động sinh code cho bạn.

PROMPT 1: Khởi tạo Project & Tailwind Design System
Plaintext
Hãy tạo file config tailwind.config.js cho một dự án Next.js 14+ sử dụng App Router. Thiết lập một Design System theo phong cách tiệm kim hoàn cổ điển Pháp/Nhật (Retro/Dark Mode) với các thông số:
- Màu nền background: Đen thạch anh `#0D1117` và Xanh lục bảo tối `#051C12`.
- Màu bề mặt card/component: `#12241C` (Emerald tối) và `#161B22`.
- Màu điểm nhấn (Accent): Vàng Gold cổ kính `#D4AF37` và Vàng Champagne `#F1E5AC`.
- Cấu hình Font family: Chèn font 'Cormorant Garamond' hoặc 'Cinzel' (Serif) cho headings, và 'Inter' (Sans-serif) cho body text.
Hãy tạo thêm các class utility cho border mờ hiệu ứng ánh kim (gold borders). Trả về mã cấu hình hoàn chỉnh sạch sẽ, không giải thích dông dài.
PROMPT 2: Component Card Sản Phẩm Tích Hợp GSAP Sparkle Animation
Plaintext
Hãy viết một component React Client Component tên là `ProductCard.tsx` sử dụng Next.js Image, Tailwind CSS và thư viện GSAP. 
Yêu cầu chức năng:
1. Hiển thị thông tin một món trang sức si Nhật bao gồm: Ảnh sản phẩm (URL từ Supabase Storage), Tên (font Serif), Độ mới (ví dụ: Tier SSS - kèm một tag nhỏ), Chất liệu (ví dụ: Bạc 925), Giá tiền (màu vàng Gold).
2. Khi người dùng hover chuột vào Card, sử dụng GSAP để tạo một hiệu ứng lấp lánh hoặc một vệt sáng (Shine flash) chạy xéo từ góc trái qua góc phải của tấm ảnh để tạo cảm giác trang sức bắt sáng dưới ánh đèn. Hiệu ứng phải mượt mà và tự dọn dẹp (cleanup) khi unmount.
3. Nếu sản phẩm đã bán (status = 'SOLD_OUT'), hiển thị một lớp phủ mờ (overlay) màu đen xanh lục với font chữ Serif ghi "Đã được sưu tầm" và vô hiệu hóa các tương tác hover.
Viết code tối ưu hiệu năng, import đầy đủ từ 'gsap'.
PROMPT 3: Luồng API & Giỏ Hàng Xử Lý Khóa Sản Phẩm Độc Bản (Supabase Lock)
Plaintext
Hãy xây dựng một giải pháp đồng bộ dữ liệu cho sản phẩm độc bản (đồ si chỉ có số lượng bằng 1) gồm hai phần sử dụng Supabase:
1. Một Route API Next.js (`app/api/lock-item/route.ts`) kết nối với Supabase/PostgreSQL. Khi nhận được một request POST chứa `productId` và `clientId`, thực hiện một transaction kiểm tra nếu trạng thái sản phẩm là 'AVAILABLE', hãy cập nhật trạng thái thành 'PENDING_LOCK' và gán `locked_by = clientId`, `locked_at = NOW()`. Sử dụng cơ chế khóa PostgreSQL SELECT FOR UPDATE thông qua một RPC function trên Supabase để tránh race-condition.
2. Một Page Giỏ Hàng (`app/gio-hang/page.tsx`) hiển thị sản phẩm đang được giữ. Tích hợp một bộ đếm ngược (Countdown Timer) từ 10 phút về 0 (lấy mốc thời gian từ trường `locked_at` của API). Khi bộ đếm đạt 0, tự động gọi một API giải phóng khóa (unlock) và hiển thị thông báo: "Món đồ độc bản này đã được nhả lại kho cho những nhà sưu tầm khác". Có hiển thị giao diện Dark mode với viền Gold sang trọng.
PROMPT 4: Giao Diện Dashboard Admin Đăng Hàng Hàng Loạt (Bulk Upload)
Plaintext
Hãy tạo một React Client Component cho trang quản trị Next.js tại `app/(admin)/dashboard/products/bulk-upload/page.tsx`. 
Giao diện này phục vụ việc đăng hàng loạt sản phẩm độc bản (đồ si) vào một Collection cụ thể:
1. Chứa một trường Select để chọn `collection_id` hiện có từ Supabase.
2. Cung cấp một vùng Drag-and-drop file Excel/CSV chứa danh sách sản phẩm hoặc một giao diện Quick-form dạng Table cho phép nhập nhanh các cột: Tiêu đề sản phẩm, Giá, Tier chất lượng (SSS, SS, S), Mảng tag theo mùa (Ví dụ: SUMMER_2026), và nút chọn tải ảnh lên Supabase Storage.
3. Khi bấm "Đăng bộ sưu tập", client sẽ upload toàn bộ ảnh lên bucket `jewelry-images` của Supabase Storage, lấy về danh sách các public URLs, sau đó gọi API Route `api/admin/bulk-import` để thực hiện câu lệnh bulk insert (`supabase.from('products').insert(data_array)`) vào database.
Thiết kế giao diện dashboard tối giản, tinh tế, sạch sẽ với Tailwind.
PROMPT 5: Custom Hook Tracking Hành Vi Client bằng GA4 E-commerce Events
Plaintext
Hãy tạo một custom hook React có tên `useJewelryAnalytics.ts` để tracking hành vi e-commerce của khách hàng sử dụng gói `@next/third-parties/google`.
Hook này cần cung cấp các hàm sau để gọi ở các client component:
1. `trackViewProduct(product)`: Kích hoạt sự kiện `view_item` gửi lên GA4 các metadata bao gồm: id, name, price, category, material (bạc/vàng), condition (trường quality_tier).
2. `trackLockProduct(product)`: Kích hoạt sự kiện `lock_item_success` khi khách cho đồ vào giỏ hàng thành công.
3. `trackLockTimeout(product)`: Kích hoạt sự kiện `lock_item_timeout` khi khách để hết giờ giữ hàng mà không thanh toán.
4. `trackCheckoutSuccess(order)`: Kích hoạt sự kiện `purchase` kèm tổng giá trị đơn hàng, mã đơn hàng để GA4 ghi nhận doanh thu quảng cáo.
Đảm bảo kiểm tra sự tồn tại của cửa sổ trình duyệt (window) trước khi trigger để tránh lỗi Crash SSR trên Server side.
7. CHIẾN LƯỢC DEPLOYMENT & QUẢNG CÁO ĐỂ TỐI ƯU CHI PHÍ ADS
Deploy lên Vercel: Kết nối repo GitHub của bạn với Vercel. Kích hoạt tính năng Edge Middleware nếu cần cấu hình redirect hoặc phân tách tệp khách hàng theo vị trí. Toàn bộ hình ảnh trang sức phải dùng component <Image /> của Next.js trỏ link từ Supabase Storage về để Vercel tự động nén dung lượng xuống dạng .webp giúp web đạt điểm Core Web Vitals tối đa (99-100 điểm), giảm thiểu tỷ lệ thoát trang khi khách bấm từ Facebook/TikTok Ads vào web.

Chiến lược Đo lường phễu bằng GA4:
Sau khi deploy lên Vercel và cấu hình GA4 thành công, hãy tạo một custom report trên Google Analytics Dashboard theo luồng: view_item -> lock_item_success -> purchase.

Nếu tỷ lệ từ view_item sang lock_item_success thấp: Do hình ảnh chưa đủ độ bắt mắt hoặc giá cấu hình chưa hợp lý so với độ mới.

Nếu tỷ lệ từ lock_item_success sang purchase thấp (rớt đơn ở giỏ hàng nhiều do đếm ngược hết giờ): Bạn cần cấu hình thêm tính năng tự động gửi tin nhắn nhắc nhở (Zalo ZNS hoặc Mess) khi giỏ hàng còn 2 phút đếm ngược.

Tài liệu này được tối ưu hóa cho tư duy của một kỹ sư phần mềm vận hành kinh doanh (IT Founder). Chúc bạn triển khai hệ thống thành công và bùng nổ doanh số trang sức si Nhật!