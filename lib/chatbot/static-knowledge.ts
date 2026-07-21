// lib/chatbot/static-knowledge.ts
// Knowledge base tĩnh cho chatbot "Bà Chủ Tiệm" — thông tin shop cố định, ít thay đổi.
// Admin không cần edit code; thay đổi qua .env / config.

export interface StaticFaq {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: 'about' | 'shipping' | 'return' | 'warranty' | 'payment' | 'care' | 'contact' | 'general' | 'size';
}

export interface StaticPolicy {
  id: string;
  category: 'shipping' | 'return' | 'warranty' | 'payment' | 'about' | 'contact' | 'care' | 'size' | 'general';
  title: string;
  content: string;
  keywords: string[];
  priority: number;
}

export const SHOP_INFO = {
  name: 'Emerald Vault',
  brand: 'Trang sức si Nhật vintage',
  tagline: 'Bà Chủ Tiệm — nơi cất giữ những viên ngọc kể chuyện thời gian',
  establishedYear: 2018,
  address: {
    street: '12 Nguyễn Huệ',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    country: 'Việt Nam',
  },
  contact: {
    phone: '0903 123 654',
    hotline: '1900 6868',
    email: 'cua@emerald-vault.vn',
    zalo: '0903123654',
    facebook: 'https://facebook.com/emeraldvault.vn',
    instagram: 'https://instagram.com/emeraldvault.vn',
  },
  hours: {
    weekdays: '10:00 – 21:00',
    weekend: '09:00 – 22:00',
    note: 'Cả ngày lễ, Tết',
  },
  payment: ['COD', 'Chuyển khoản ngân hàng', 'Ví MoMo', 'Visa/Master/JCB'],
  shipping: {
    partners: ['GHN', 'GHTK', 'Viettel Post'],
    domesticDays: '2 – 4 ngày (nội thành HCM: 24h)',
    international: 'Hiện chưa hỗ trợ vận chuyển quốc tế.',
  },
  warranty: {
    duration: '12 tháng',
    scope: 'Lỗi sản xuất, đứt móc, oxit hóa bất thường.',
    lifetime: 'Làm sạch, đánh bóng MIỄN PHÍ trọn đời tại cửa hàng.',
  },
  returnPolicy: {
    windowDays: 7,
    conditions: [
      'Còn nguyên tem, hộp, phụ kiện đi kèm',
      'Chưa qua sử dụng, chưa có dấu hiệu trầy xước / tiếp xúc da',
      'Có hóa đơn hoặc mã đơn hàng',
    ],
    refundMethod: 'Hoàn tiền qua cổng thanh toán ban đầu trong 3-5 ngày làm việc.',
  },
  care: {
    silver: 'Bạc 925: tránh nước biển, mồ hôi, nước hoa. Bảo quản trong hộp kín kèm gói hút ẩm. Lau bằng khăn mềm sau khi đeo.',
    gold: 'Vàng 18K / mạ vàng: tránh cọ xát mạnh, hóa chất, mỹ phẩm. Lau bằng khăn chuyên dụng.',
    pearl: 'Ngọc trai: tránh nước hoa, keo xịt tóc, mồ hôi. Lau bằng khăn mềm ẩm sau khi đeo.',
  },
  sizing: {
    ring: 'Đo đường kính trong (mm) của nhẫn cũ vừa tay. Tham chiếu bảng size tại trang sản phẩm.',
    bracelet: 'Vòng tay: đo chu vi cổ tay + 1-2cm để thoải mái.',
  },
} as const;

export const STATIC_FAQS: StaticFaq[] = [
  {
    id: 'faq-shop-intro',
    question: 'Emerald Vault là gì? Bà Chủ Tiệm là ai?',
    answer:
      'Emerald Vault là tiệm trang sức si Nhật vintage thành lập từ 2018 tại TP.HCM. "Bà Chủ Tiệm" là biệt danh của người sáng lập — người tuyển chọn từng món trang sức Nhật Bản thời Showa, Heisei với con mắt tinh tế và câu chuyện riêng.',
    keywords: ['emerald vault', 'bà chủ tiệm', 'giới thiệu', 'about', 'là gì', 'who'],
    category: 'about',
  },
  {
    id: 'faq-authentic',
    question: 'Trang sức có chính hãng, có giấy tờ không?',
    answer:
      'Mỗi món trang sức đều có phiếu kiểm định chất liệu (BAC_925 / VANG_18K / KIM_CUONG...) kèm mã sản phẩm. Nguồn gốc Nhật Bản được ghi rõ trong phần mô tả chi tiết.',
    keywords: ['chính hãng', 'giấy tờ', 'kiểm định', 'authentic', 'certificate'],
    category: 'about',
  },
  {
    id: 'faq-shipping-time',
    question: 'Đặt hàng bao lâu nhận được?',
    answer:
      'Nội thành TP.HCM: 24h. Tỉnh thành khác: 2-4 ngày qua GHN/GHTK/Viettel Post. Đơn quốc tế hiện chưa hỗ trợ.',
    keywords: ['giao hàng', 'ship', 'bao lâu', 'khi nào nhận', 'thời gian'],
    category: 'shipping',
  },
  {
    id: 'faq-shipping-fee',
    question: 'Phí vận chuyển bao nhiêu?',
    answer:
      'Miễn phí vận chuyển cho đơn từ 1.000.000đ. Đơn dưới mức đó, phí 30.000đ nội thành / 40.000đ các tỉnh. Khu vực xa (huyện đảo, vùng sâu) tính theo biểu phí đơn vị vận chuyển.',
    keywords: ['phí ship', 'phí giao hàng', 'shipping fee', 'bao nhiêu tiền ship'],
    category: 'shipping',
  },
  {
    id: 'faq-cod',
    question: 'Có hỗ trợ COD (thanh toán khi nhận hàng) không?',
    answer:
      'Có. COD áp dụng toàn quốc với đơn dưới 5.000.000đ. Đơn trên 5 triệu vui lòng chuyển khoản trước để đảm bảo an toàn.',
    keywords: ['cod', 'thanh toán khi nhận', 'giao hàng thu tiền'],
    category: 'payment',
  },
  {
    id: 'faq-payment-methods',
    question: 'Các hình thức thanh toán?',
    answer: 'Hiện hỗ trợ: COD, chuyển khoản ngân hàng, ví MoMo, thẻ quốc tế Visa/Master/JCB.',
    keywords: ['thanh toán', 'payment', 'chuyển khoản', 'momo', 'visa'],
    category: 'payment',
  },
  {
    id: 'faq-return',
    question: 'Chính sách đổi trả như thế nào?',
    answer:
      'Đổi trả trong 7 ngày nếu sản phẩm còn nguyên tem, chưa sử dụng, có hóa đơn. Hoàn tiền 100% qua cổng thanh toán ban đầu trong 3-5 ngày làm việc.',
    keywords: ['đổi trả', 'return', 'refund', 'hoàn tiền', 'đổi hàng'],
    category: 'return',
  },
  {
    id: 'faq-warranty',
    question: 'Bảo hành bao lâu? Bảo hành những gì?',
    answer:
      'Bảo hành 12 tháng cho lỗi sản xuất (đứt móc, oxit hóa bất thường). Làm sạch và đánh bóng MIỄN PHÍ trọn đời tại cửa hàng.',
    keywords: ['bảo hành', 'warranty', 'bảo hành bao lâu'],
    category: 'warranty',
  },
  {
    id: 'faq-silver-tarnish',
    question: 'Bạc bị xỉn đen thì làm sao?',
    answer:
      'Bạc 925 khi tiếp xúc lưu huỳnh trong không khí/mồ hôi sẽ xỉn nhẹ — hiện tượng tự nhiên. Lau bằng khăn chuyên dụng hoặc mang qua tiệm để đánh bóng miễn phí.',
    keywords: ['bạc xỉn', 'bạc đen', 'oxit', 'tarnish', 'làm sạch bạc'],
    category: 'care',
  },
  {
    id: 'faq-store-visit',
    question: 'Có cửa hàng offline để xem trực tiếp không?',
    answer:
      'Có. Địa chỉ: 12 Nguyễn Huệ, Quận 1, TP.HCM. Mở cửa 10:00-21:00 (T7-CN: 09:00-22:00). Khách đến xem không bắt buộc mua.',
    keywords: ['cửa hàng', 'offline', 'showroom', 'đến xem', 'địa chỉ'],
    category: 'contact',
  },
  {
    id: 'faq-consult',
    question: 'Tư vấn chọn trang sức theo mệnh / màu da?',
    answer:
      'Mệnh Kim hợp bạc, vàng trắng. Mệnh Thổ hợp vàng, đá màu nâu/đỏ. Mệnh Thủy hợp đá đen, xanh dương. Da sáng dễ phối màu; da ngăm ưu tiên vàng ấm. Bà Chủ có thể tư vấn cụ thể nếu em cho biết thêm.',
    keywords: ['mệnh', 'phong thủy', 'màu da', 'tư vấn', 'hợp tuổi'],
    category: 'general',
  },
  {
    id: 'faq-size',
    question: 'Làm sao biết size nhẫn/vòng của mình?',
    answer:
      'Nhẫn: đo đường kính trong (mm) của nhẫn cũ vừa tay, đối chiếu bảng size trên trang sản phẩm. Vòng tay: đo chu vi cổ tay + 1-2cm. Không chắc? Đặt mua, tiệm hỗ trợ đổi size miễn phí lần đầu.',
    keywords: ['size nhẫn', 'size vòng', 'đo size', 'ring size'],
    category: 'size',
  },
];

export const STATIC_KNOWLEDGE: StaticPolicy[] = [
  {
    id: 'kb-about',
    category: 'about',
    title: 'Về Emerald Vault',
    content: `${SHOP_INFO.name} — ${SHOP_INFO.brand} thành lập từ ${SHOP_INFO.establishedYear}. Mỗi món trang sức si Nhật là một câu chuyện, một lát cắt thời gian từ thời Showa đến Heisei, được tuyển chọn bởi Bà Chủ Tiệm.`,
    keywords: ['emerald vault', 'giới thiệu', 'about', 'lịch sử'],
    priority: 10,
  },
  {
    id: 'kb-shipping',
    category: 'shipping',
    title: 'Chính sách vận chuyển',
    content: `Đối tác: ${SHOP_INFO.shipping.partners.join(', ')}. Nội địa: ${SHOP_INFO.shipping.domesticDays}. ${SHOP_INFO.shipping.international} Miễn phí ship cho đơn từ 1.000.000đ.`,
    keywords: ['ship', 'giao hàng', 'vận chuyển', 'phí ship'],
    priority: 20,
  },
  {
    id: 'kb-warranty',
    category: 'warranty',
    title: 'Bảo hành & chăm sóc trọn đời',
    content: `Bảo hành ${SHOP_INFO.warranty.duration}: ${SHOP_INFO.warranty.scope} ${SHOP_INFO.warranty.lifetime}`,
    keywords: ['bảo hành', 'warranty', 'làm sạch', 'đánh bóng'],
    priority: 20,
  },
  {
    id: 'kb-return',
    category: 'return',
    title: 'Chính sách đổi trả',
    content: `Đổi trả trong ${SHOP_INFO.returnPolicy.windowDays} ngày. Điều kiện: ${SHOP_INFO.returnPolicy.conditions.join('; ')}. ${SHOP_INFO.returnPolicy.refundMethod}`,
    keywords: ['đổi trả', 'return', 'refund', 'hoàn tiền'],
    priority: 20,
  },
  {
    id: 'kb-payment',
    category: 'payment',
    title: 'Hình thức thanh toán',
    content: `Hỗ trợ: ${SHOP_INFO.payment.join(', ')}.`,
    keywords: ['thanh toán', 'payment', 'cod', 'chuyển khoản', 'momo'],
    priority: 15,
  },
  {
    id: 'kb-care-silver',
    category: 'care',
    title: 'Cách bảo quản trang sức bạc',
    content: SHOP_INFO.care.silver,
    keywords: ['bảo quản bạc', 'care silver', 'bạc xỉn', 'làm sạch'],
    priority: 10,
  },
  {
    id: 'kb-care-gold',
    category: 'care',
    title: 'Cách bảo quản trang sức vàng',
    content: SHOP_INFO.care.gold,
    keywords: ['bảo quản vàng', 'care gold'],
    priority: 10,
  },
  {
    id: 'kb-contact',
    category: 'contact',
    title: 'Liên hệ',
    content: `Địa chỉ: ${SHOP_INFO.address.street}, ${SHOP_INFO.address.district}, ${SHOP_INFO.address.city}. Hotline: ${SHOP_INFO.contact.hotline} — ${SHOP_INFO.contact.phone}. Email: ${SHOP_INFO.contact.email}. Zalo: ${SHOP_INFO.contact.zalo}. Giờ mở: ${SHOP_INFO.hours.weekdays} (T7-CN: ${SHOP_INFO.hours.weekend}).`,
    keywords: ['liên hệ', 'contact', 'địa chỉ', 'số điện thoại', 'hotline'],
    priority: 30,
  },
];

export function findStaticFaqByKeyword(text: string): StaticFaq | null {
  const t = text.toLowerCase();
  let best: { faq: StaticFaq; score: number } | null = null;
  for (const faq of STATIC_FAQS) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (t.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { faq, score };
    }
  }
  return best ? best.faq : null;
}
