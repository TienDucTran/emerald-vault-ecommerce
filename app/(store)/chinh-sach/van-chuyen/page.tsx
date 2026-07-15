import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính Sách Vận Chuyển | Emerald Vault',
  description:
    'Chính sách vận chuyển của Emerald Vault: phí ship, thời gian giao hàng, đóng gói cẩn thận, miễn phí vận chuyển cho đơn hàng từ 2.000.000đ.',
};

export default function VanChuyenPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          ✦ CHÍNH SÁCH
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          <span className="text-gradient-gold">Chính Sách Vận Chuyển</span>
        </h1>
      </div>

      <div className="prose prose-invert mx-auto max-w-3xl text-text-base">
        <p className="lead text-lg leading-relaxed text-text-muted">
          Emerald Vault cam kết giao hàng nhanh chóng, an toàn và đóng gói cẩn thận cho từng món trang
          sức. Dưới đây là thông tin chi tiết về phí vận chuyển, thời gian giao hàng và chính sách freeship
          áp dụng cho mọi đơn hàng.
        </p>

        <h2 className="font-heading text-2xl text-gold">1. Phí vận chuyển</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Nội thành Hà Nội & TP. HCM</strong> — 25.000đ / đơn.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Các tỉnh thành khác</strong> — 35.000đ / đơn (giao qua đơn vị vận chuyển uy tín).</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Vùng sâu, vùng xa, huyện đảo</strong> — phí theo bảng giá của đơn vị vận chuyển, shop xác nhận trước khi gửi.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">2. Miễn phí vận chuyển</h2>
        <p>
          Đơn hàng có tổng giá trị <strong>từ 2.000.000đ trở lên</strong> sẽ được <em>freeship toàn quốc</em>.
          Một số chương trình khuyến mãi có thể điều chỉnh mức freeship thấp hơn — vui lòng theo dõi fanpage
          hoặc banner trên trang chủ để cập nhật.
        </p>

        <h2 className="font-heading text-2xl text-gold">3. Thời gian giao hàng</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Nội thành HN & HCM</strong> — 1 đến 2 ngày làm việc.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Liên tỉnh</strong> — 2 đến 4 ngày làm việc (tùy khu vực).</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Vùng sâu, vùng xa</strong> — 4 đến 7 ngày làm việc.</li>
        </ul>
        <p>
          Thời gian được tính từ khi đơn hàng được xác nhận và đóng gói xong. Trong các đợt cao điểm (lễ,
          Tết), thời gian có thể kéo dài thêm 1–2 ngày.
        </p>

        <h2 className="font-heading text-2xl text-gold">4. Đóng gói</h2>
        <p>
          Mỗi món trang sức si Nhật trước khi gửi đều được:
        </p>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Đựng trong hộp riêng, có túi chống ẩm.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Bọc lớp chống sốc, bảo vệ khỏi va đập.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Đóng thùng carton kín, dán tem niêm phong.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">5. Theo dõi đơn hàng</h2>
        <p>
          Sau khi đơn hàng được gửi, shop sẽ gửi <em>mã vận đơn</em> qua SMS và email để bạn tự theo dõi
          hành trình đơn hàng. Mọi thắc mắc vui lòng liên hệ fanpage hoặc hotline để được hỗ trợ nhanh
          nhất.
        </p>

        <h2 className="font-heading text-2xl text-gold">6. Lưu ý khi nhận hàng</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Kiểm tra bao bì, niêm phong trước khi nhận.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Quay video mở hộp để làm bằng chứng nếu có vấn đề.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Từ chối nhận nếu thùng hàng đã móp, ướt, rách seal.</li>
        </ul>
      </div>
    </div>
  );
}
