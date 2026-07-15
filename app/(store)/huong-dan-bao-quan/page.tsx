import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hướng Dẫn Bảo Quản Trang Sức Si Nhật | Emerald Vault',
  description:
    'Cách làm sạch và bảo quản trang sức si Nhật (bạc 925, bạc 950, mạ vàng, đá quý) đúng cách, tránh hóa chất, giữ món đồ luôn sáng đẹp theo thời gian.',
};

export default function HuongDanBaoQuanPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          ✦ HƯỚNG DẪN
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          <span className="text-gradient-gold">Hướng Dẫn Bảo Quản Trang Sức Si Nhật</span>
        </h1>
      </div>

      <div className="prose prose-invert mx-auto max-w-3xl text-text-base">
        <p className="lead text-lg leading-relaxed text-text-muted">
          Đồ si Nhật nổi tiếng bền bỉ, nhưng để giữ được vẻ sáng bóng và chi tiết sắc nét qua nhiều năm
          sử dụng, bạn cần bảo quản đúng cách. Bài viết dưới đây tổng hợp quy trình làm sạch, những điều
          cần tránh và thời điểm nên đánh bóng lại cho từng chất liệu phổ biến.
        </p>

        <h2 className="font-heading text-2xl text-gold">1. Cách làm sạch bạc 925 & bạc 950</h2>
        <p>
          Bạc thật sau một thời gian sẽ xuất hiện lớp xỉn màu đen hoặc ánh vàng — đây là hiện tượng oxy
          hóa tự nhiên, hoàn toàn bình thường. Bạn có thể làm sạch tại nhà theo các bước:
        </p>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Pha nước ấm với một ít sữa rửa tay dịu nhẹ.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Ngâm trang sức khoảng 5–10 phút.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Dùng bàn chải lông mềm (bàn chải đánh răng cũ) chải nhẹ các kẽ, đường hoa văn.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Rửa lại bằng nước sạch, lau khô bằng vải cotton mềm.</li>
        </ul>
        <p>
          Với vết xỉn nặng, dùng <em>khăn đánh bóng bạc chuyên dụng</em> (silvera polishing cloth) có
          bán tại các cửa hàng trang sức. Tránh dùng giấm, chanh tươi hoặc kem đánh răng — chúng có thể
          ăn mòn chi tiết mạ vàng và làm xước bề mặt.
        </p>

        <h2 className="font-heading text-2xl text-gold">2. Cách làm sạch trang sức mạ vàng</h2>
        <p>
          Lớp mạ vàng rất mỏng, cần thao tác nhẹ nhàng:
        </p>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Lau bề mặt bằng vải microfiber ẩm, không chà xát mạnh.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Tuyệt đối không dùng hóa chất, nước rửa bát hay chất tẩy rửa.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Tránh để trang sức mạ vàng tiếp xúc nước biển, nước clo và mồ hôi nhiều.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">3. Cách làm sạch kim cương & đá quý</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Ngâm trong nước ấm pha sữa rửa tay dịu nhẹ khoảng 15 phút.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Dùng bàn chải lông mềm chải nhẹ quanh viên đá và chấu giữ.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Lau khô bằng vải không xơ.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Với đá mềm như ngọc trai, opal, turquoise — chỉ lau bằng vải ẩm, không ngâm.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">4. Tránh hóa chất & tác động mạnh</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Tháo trang sức trước khi tắm, bơi, tập gym, nấu ăn.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Tránh xịt nước hoa, keo xịt tóc, lotion lên trang sức.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Không đeo khi làm việc nặng, xách đồ nặng để tránh méo form.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Tránh để trang sức tiếp xúc trực tiếp với ánh nắng mặt trời trong thời gian dài.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">5. Bảo quản đúng cách</h2>
        <ul className="list-none space-y-2">
          <li className="flex gap-2"><span className="text-gold">✦</span> Cất riêng từng món trong <em>túi zip nhỏ kèm gói hút ẩm</em> hoặc hộp trang sức có ngăn.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Đặt ở nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Không để nhiều món cọ xát vào nhau — bạc sẽ trầy và rối.</li>
          <li className="flex gap-2"><span className="text-gold">✦</span> Với dây chuyền, nên móc khi đóng cúc để tránh rối mắt xích.</li>
        </ul>

        <h2 className="font-heading text-2xl text-gold">6. Khi nào cần đánh bóng lại?</h2>
        <p>
          Nếu món đồ xỉn nặng, xuất hiện vết ố vàng không làm sạch được tại nhà, hoặc bề mặt mạ vàng
          đã mờ rõ rệt, bạn nên mang đến tiệm kim hoàn chuyên nghiệp để <em>đánh bóng lại và mạ lại</em>.
          Tại Emerald Vault, mỗi món đồ si Nhật đều được hỗ trợ đánh bóng miễn phí trọn đời — bạn chỉ
          cần gửi về shop, chúng tôi sẽ chăm sóc lại như mới.
        </p>

        <h2 className="font-heading text-2xl text-gold">Lời kết</h2>
        <p>
          Một món trang sức được yêu thương và bảo quản đúng cách có thể đồng hành cùng bạn cả chục năm,
          thậm chí truyền lại cho thế hệ sau. Hãy dành vài phút chăm sóc mỗi tuần — bạn sẽ luôn tự hào
          khi đeo một món đồ si Nhật sáng đẹp, giữ trọn giá trị theo thời gian.
        </p>
      </div>
    </div>
  );
}
