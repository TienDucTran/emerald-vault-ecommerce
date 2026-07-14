import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính Sách Bảo Mật | Emerald Vault',
  description:
    'Chính sách bảo mật của Emerald Vault: thu thập thông tin cá nhân, mục đích sử dụng, cam kết bảo vệ dữ liệu khách hàng và chính sách cookie.',
};

export default function BaoMatPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          ✦ CHÍNH SÁCH
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          <span className="text-gradient-gold">Chính Sách Bảo Mật</span>
        </h1>
      </div>

      <div className="prose prose-invert mx-auto max-w-3xl text-text-base">
        <p className="lead text-lg leading-relaxed text-text-muted">
          Emerald Vault tôn trọng và cam kết bảo vệ quyền riêng tư của mọi khách hàng. Chính sách bảo
          mật dưới đây giải thích rõ những thông tin chúng tôi thu thập, mục đích sử dụng và cách thức
          bảo vệ dữ liệu cá nhân của bạn khi truy cập website và mua sắm tại shop.
        </p>

        <h2 className="font-heading text-2xl text-gold">1. Thông tin chúng tôi thu thập</h2>
        <p>Khi bạn mua sắm hoặc đăng ký tài khoản, shop có thể thu thập các thông tin sau:</p>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Họ tên, số điện thoại, email.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Địa chỉ giao hàng, địa chỉ thanh toán.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Lịch sử đơn hàng, sản phẩm đã xem, sản phẩm yêu thích.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Địa chỉ IP, loại trình duyệt, thiết bị truy cập (qua cookie).</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">2. Mục đích sử dụng thông tin</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Xử lý đơn hàng, giao hàng và chăm sóc khách hàng sau bán.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Gửi thông báo về đơn hàng, chương trình khuyến mãi, sản phẩm mới (nếu bạn đăng ký nhận).</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Cải thiện trải nghiệm website, cá nhân hóa nội dung hiển thị.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Phát hiện và ngăn chặn gian lận, bảo vệ quyền lợi khách hàng.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">3. Cam kết bảo vệ dữ liệu</h2>
        <p>
          Thông tin khách hàng tại Emerald Vault được lưu trữ trên hệ thống máy chủ bảo mật, mã hóa
          bằng chuẩn SSL. Chúng tôi cam kết:
        </p>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Không bán, trao đổi</strong> thông tin cá nhân khách hàng cho bên thứ ba vì mục đích thương mại.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Chỉ chia sẻ thông tin tối thiểu với đơn vị vận chuyển và cổng thanh toán để hoàn tất đơn hàng.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Áp dụng biện pháp kỹ thuật, tổ chức để ngăn chặn truy cập trái phép.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Nhân viên chỉ truy cập dữ liệu trong phạm vi công việc được phân công.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">4. Chính sách cookie</h2>
        <p>
          Website sử dụng cookie để ghi nhớ trạng thái đăng nhập, giỏ hàng, ngôn ngữ và phân tích lưu
          lượng truy cập. Bạn có thể tắt cookie trong phần cài đặt trình duyệt, tuy nhiên một số tính
          năng có thể không hoạt động đầy đủ.
        </p>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Cookie cần thiết</strong> — bắt buộc cho hoạt động cơ bản của website.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Cookie phân tích</strong> — giúp chúng tôi hiểu cách khách truy cập sử dụng site.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> <strong>Cookie tiếp thị</strong> — hiển thị quảng cáo phù hợp trên các nền tảng khác (nếu bạn đồng ý).</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">5. Quyền của khách hàng</h2>
        <p>Bạn có quyền yêu cầu:</p>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Xem, chỉnh sửa thông tin cá nhân đã cung cấp.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Xóa tài khoản và dữ liệu liên quan.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Từ chối nhận email marketing, tin nhắn quảng cáo.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">6. Liên hệ</h2>
        <p>
          Mọi câu hỏi liên quan đến chính sách bảo mật, vui lòng liên hệ qua email
          <em> support@emerald-vault.vn </em> hoặc hotline hiển thị tại footer website. Chúng tôi sẽ
          phản hồi trong vòng 24 giờ làm việc.
        </p>

        <p className="text-sm italic text-text-muted">
          Chính sách này có hiệu lực từ ngày đăng tải và có thể được cập nhật theo từng thời kỳ. Mọi
          thay đổi sẽ được thông báo công khai trên website.
        </p>
      </div>
    </div>
  );
}
