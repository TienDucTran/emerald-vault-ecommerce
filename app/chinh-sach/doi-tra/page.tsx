import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính Sách Đổi Trả | Emerald Vault',
  description:
    'Chính sách đổi trả của Emerald Vault: điều kiện đổi trả, thời hạn 7 ngày, quy trình hoàn tiền nhanh chóng, áp dụng cho đồ si Nhật nguyên seal.',
};

export default function DoiTraPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          ✦ CHÍNH SÁCH
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          <span className="text-gradient-gold">Chính Sách Đổi Trả</span>
        </h1>
      </div>

      <div className="prose prose-invert mx-auto max-w-3xl text-text-base">
        <p className="lead text-lg leading-relaxed text-text-muted">
          Emerald Vault luôn đặt quyền lợi của khách hàng lên hàng đầu. Chính sách đổi trả được thiết
          kế minh bạch, thủ tục đơn giản, đảm bảo bạn hoàn toàn yên tâm khi sưu tầm đồ si Nhật tại shop.
        </p>

        <h2 className="font-heading text-2xl text-gold">1. Điều kiện đổi trả</h2>
        <p>Sản phẩm được chấp nhận đổi trả khi thỏa <strong>đồng thời</strong> các điều kiện sau:</p>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Còn nguyên seal, nguyên tem, chưa qua sử dụng.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Còn đầy đủ hộp, túi, giấy chứng nhận (nếu có).</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Trong thời hạn đổi trả cho phép (xem mục 2).</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Sai mô tả, sai kích thước, hoặc có lỗi từ phía shop.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">2. Thời hạn đổi trả</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Đổi hàng</strong> — trong vòng <em>7 ngày</em> kể từ khi nhận hàng.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Hoàn tiền</strong> — trong vòng <em>3 ngày</em> kể từ khi shop nhận lại sản phẩm và xác nhận đạt điều kiện.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">3. Quy trình đổi trả</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Liên hệ shop qua fanpage hoặc hotline, cung cấp mã đơn hàng và lý do đổi trả.</li>
          <li>Shop xác nhận yêu cầu và hướng dẫn đóng gói gửi về.</li>
          <li>Khách gửi hàng về địa chỉ shop (phí ship do khách chịu, trừ trường hợp lỗi shop).</li>
          <li>Shop kiểm tra, xác nhận đạt điều kiện và tiến hành đổi hàng hoặc hoàn tiền.</li>
        </ol>

        <h2 className="font-heading text-2xl text-gold">4. Hoàn tiền</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Hoàn 100% giá trị sản phẩm qua chuyển khoản ngân hàng.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Thời gian nhận lại tiền: 1–3 ngày làm việc tùy ngân hàng.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Phí vận chuyển phát sinh khi đổi trả không thuộc lỗi shop sẽ không được hoàn.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">5. Trường hợp không áp dụng đổi trả</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Sản phẩm đã tháo seal, có dấu hiệu sử dụng, trầy xước do người dùng.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Sản phẩm bị hư hỏng do tác động bên ngoài (rơi, va đập, hóa chất).</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Quá thời hạn 7 ngày kể từ khi nhận hàng.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Đơn hàng trong chương trình sale, xả kho cuối mùa (ghi rõ ở mô tả).</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">Lời kết</h2>
        <p>
          Mỗi món đồ si Nhật tại Emerald Vault đều đã qua thẩm định chuyên gia và được mô tả chi tiết,
          chụp ảnh thực tế. Tuy nhiên, nếu có bất kỳ vấn đề nào, đừng ngần ngại liên hệ shop — chúng
          tôi luôn sẵn lòng hỗ trợ bạn trong vòng 24 giờ.
        </p>
      </div>
    </div>
  );
}
