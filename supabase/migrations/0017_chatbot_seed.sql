-- 0017_chatbot_seed.sql
-- Seed data mặc định cho knowledge base chatbot
-- Idempotent: chỉ insert nếu chưa có (dựa vào title/category)

-- ============ chat_knowledge ============
INSERT INTO chat_knowledge (category, title, content, keywords, priority, is_published)
SELECT * FROM (VALUES
  ('about', 'Về Emerald Vault',
   'Emerald Vault — tiệm trang sức si Nhật vintage thành lập từ 2018 tại TP.HCM. Mỗi món trang sức si Nhật là một câu chuyện, một lát cắt thời gian từ thời Showa đến Heisei, được tuyển chọn bởi Bà Chủ Tiệm.',
   ARRAY['emerald vault','giới thiệu','about','lịch sử','bà chủ tiệm'], 10, true),
  ('shipping', 'Chính sách vận chuyển',
   'Đối tác: GHN, GHTK, Viettel Post. Nội thành TP.HCM: 24h. Tỉnh thành khác: 2-4 ngày. Miễn phí ship cho đơn từ 1.000.000đ. Đơn dưới mức: 30.000đ nội thành / 40.000đ tỉnh. Hiện chưa hỗ trợ vận chuyển quốc tế.',
   ARRAY['ship','giao hàng','vận chuyển','phí ship','thời gian ship'], 20, true),
  ('warranty', 'Bảo hành & chăm sóc trọn đời',
   'Bảo hành 12 tháng cho lỗi sản xuất (đứt móc, oxit hóa bất thường). Làm sạch và đánh bóng MIỄN PHÍ trọn đời tại cửa hàng 12 Nguyễn Huệ, Q.1.',
   ARRAY['bảo hành','warranty','làm sạch','đánh bóng'], 20, true),
  ('return', 'Chính sách đổi trả',
   'Đổi trả trong 7 ngày nếu sản phẩm còn nguyên tem, chưa sử dụng, có hóa đơn. Hoàn tiền 100% qua cổng thanh toán ban đầu trong 3-5 ngày làm việc. Đổi size nhẫn miễn phí lần đầu.',
   ARRAY['đổi trả','return','refund','hoàn tiền','đổi size'], 20, true),
  ('payment', 'Hình thức thanh toán',
   'Hỗ trợ: COD, chuyển khoản ngân hàng, ví MoMo, thẻ quốc tế Visa/Master/JCB. COD áp dụng đơn dưới 5.000.000đ toàn quốc.',
   ARRAY['thanh toán','payment','cod','chuyển khoản','momo','visa','mastercard'], 15, true),
  ('care', 'Cách bảo quản trang sức bạc',
   'Bạc 925: tránh nước biển, mồ hôi, nước hoa. Bảo quản trong hộp kín kèm gói hút ẩm. Lau bằng khăn mềm sau khi đeo. Bạc xỉn nhẹ là hiện tượng tự nhiên — mang qua tiệm đánh bóng miễn phí.',
   ARRAY['bảo quản bạc','care silver','bạc xỉn','bạc đen','làm sạch'], 10, true),
  ('care', 'Cách bảo quản trang sức vàng',
   'Vàng 18K / mạ vàng: tránh cọ xát mạnh, hóa chất, mỹ phẩm. Lau bằng khăn chuyên dụng sau khi đeo. Tháo trước khi tắm, bơi, tập gym.',
   ARRAY['bảo quản vàng','care gold','vàng 18k','mạ vàng'], 10, true),
  ('care', 'Cách bảo quản ngọc trai',
   'Ngọc trai: tránh nước hoa, keo xịt tóc, mồ hôi. Lau bằng khăn mềm ẩm sau khi đeo. Đeo sau cùng khi trang điểm, tháo trước tiên khi về nhà.',
   ARRAY['ngọc trai','pearl','bảo quản ngọc'], 10, true),
  ('contact', 'Liên hệ',
   'Địa chỉ: 12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh. Hotline: 1900 6868 — Điện thoại: 0903 123 654. Email: cua@emerald-vault.vn. Zalo: 0903123654. Mở cửa 10:00-21:00 (T7-CN: 09:00-22:00), cả ngày lễ Tết.',
   ARRAY['liên hệ','contact','địa chỉ','số điện thoại','hotline','cửa hàng','showroom'], 30, true),
  ('size', 'Hướng dẫn đo size',
   'Nhẫn: đo đường kính trong (mm) của nhẫn cũ vừa tay, đối chiếu bảng size trên trang sản phẩm. Vòng tay: đo chu vi cổ tay + 1-2cm. Dây chuyền: chọn độ dài theo style (40cm choker, 45cm cổ điển, 50cm dài).',
   ARRAY['size nhẫn','size vòng','size dây chuyền','đo size','ring size'], 10, true)
) AS v(category, title, content, keywords, priority, is_published)
WHERE NOT EXISTS (
  SELECT 1 FROM chat_knowledge ck WHERE ck.title = v.title AND ck.category = v.category
);

-- ============ chat_faqs ============
INSERT INTO chat_faqs (question, answer, keywords, category, display_order, is_published)
SELECT * FROM (VALUES
  ('Emerald Vault là gì? Bà Chủ Tiệm là ai?',
   'Emerald Vault là tiệm trang sức si Nhật vintage thành lập từ 2018 tại TP.HCM. "Bà Chủ Tiệm" là biệt danh của người sáng lập — người tuyển chọn từng món trang sức Nhật Bản thời Showa, Heisei với con mắt tinh tế và câu chuyện riêng.',
   ARRAY['emerald vault','bà chủ tiệm','giới thiệu','about','là gì'], 'about', 1, true),
  ('Trang sức có chính hãng, có giấy tờ không?',
   'Mỗi món trang sức đều có phiếu kiểm định chất liệu (BAC_925 / VANG_18K / KIM_CUONG...) kèm mã sản phẩm. Nguồn gốc Nhật Bản được ghi rõ trong phần mô tả chi tiết.',
   ARRAY['chính hãng','giấy tờ','kiểm định','authentic','certificate'], 'about', 2, true),
  ('Đặt hàng bao lâu nhận được?',
   'Nội thành TP.HCM: 24h. Tỉnh thành khác: 2-4 ngày qua GHN/GHTK/Viettel Post. Đơn quốc tế hiện chưa hỗ trợ.',
   ARRAY['giao hàng','ship','bao lâu','khi nào nhận','thời gian'], 'shipping', 1, true),
  ('Phí vận chuyển bao nhiêu?',
   'Miễn phí vận chuyển cho đơn từ 1.000.000đ. Đơn dưới mức đó, phí 30.000đ nội thành / 40.000đ các tỉnh. Khu vực xa tính theo biểu phí đơn vị vận chuyển.',
   ARRAY['phí ship','phí giao hàng','shipping fee','bao nhiêu tiền ship'], 'shipping', 2, true),
  ('Có hỗ trợ COD (thanh toán khi nhận hàng) không?',
   'Có. COD áp dụng toàn quốc với đơn dưới 5.000.000đ. Đơn trên 5 triệu vui lòng chuyển khoản trước để đảm bảo an toàn.',
   ARRAY['cod','thanh toán khi nhận','giao hàng thu tiền'], 'payment', 1, true),
  ('Bạc bị xỉn đen thì làm sao?',
   'Bạc 925 khi tiếp xúc lưu huỳnh trong không khí/mồ hôi sẽ xỉn nhẹ — hiện tượng tự nhiên. Lau bằng khăn chuyên dụng hoặc mang qua tiệm để đánh bóng miễn phí.',
   ARRAY['bạc xỉn','bạc đen','oxit','tarnish','làm sạch bạc'], 'care', 1, true),
  ('Có cửa hàng offline để xem trực tiếp không?',
   'Có. Địa chỉ: 12 Nguyễn Huệ, Quận 1, TP.HCM. Mở cửa 10:00-21:00 (T7-CN: 09:00-22:00). Khách đến xem không bắt buộc mua.',
   ARRAY['cửa hàng','offline','showroom','đến xem','địa chỉ'], 'contact', 1, true),
  ('Làm sao biết size nhẫn/vòng của mình?',
   'Nhẫn: đo đường kính trong (mm) của nhẫn cũ vừa tay, đối chiếu bảng size trên trang sản phẩm. Vòng tay: đo chu vi cổ tay + 1-2cm. Không chắc? Đặt mua, tiệm hỗ trợ đổi size miễn phí lần đầu.',
   ARRAY['size nhẫn','size vòng','đo size','ring size'], 'size', 1, true)
) AS v(question, answer, keywords, category, display_order, is_published)
WHERE NOT EXISTS (
  SELECT 1 FROM chat_faqs cf WHERE cf.question = v.question
);

-- ============ upcoming_products (mẫu demo) ============
INSERT INTO upcoming_products (title, slug, description, short_pitch, estimated_price, material, category, expected_launch_date, is_announced, notify_enabled)
SELECT * FROM (VALUES
  ('Nhẫn Sakura Opal', 'nhan-sakura-opal-2026',
   'Nhẫn bạc 925 đính opal trắng hồng, thiết kế lấy cảm hứng từ hoa anh đào Nhật Bản. Giới hạn 50 chiếc.',
   'Nhẫn bạc opal hồng — limited 50 chiếc, ra mắt tháng 8/2026',
   1850000, 'BAC_925', 'NHAN', DATE '2026-08-15', true, true),
  ('Dây chuyền Moonstone Vintage', 'day-chuyen-moonstone-vintage-2026',
   'Dây chuyền vàng 18K đính đá mặt trăng Myanmar, dây xích vintage Nhật thời Showa.',
   'Dây chuyền vàng 18K moonstone — BST Trung Thu 2026',
   8900000, 'VANG_18K', 'DAY_CHUYEN', DATE '2026-09-20', true, true),
  ('Bông tai Pearl Drop 2026', 'bong-tai-pearl-drop-2026',
   'Bông tai ngọc trai Akoya Nhật, thiết kế giọt nước tối giản.',
   'Bông tai ngọc trai Akoya — dòng basic cao cấp 2026',
   3200000, 'BAC_925', 'BONG_TAI', DATE '2026-10-10', true, true)
) AS v(title, slug, description, short_pitch, estimated_price, material, category, expected_launch_date, is_announced, notify_enabled)
WHERE NOT EXISTS (SELECT 1 FROM upcoming_products up WHERE up.slug = v.slug);

-- ============ upcoming_collections (mẫu demo) ============
INSERT INTO upcoming_collections (name, slug, description, theme, expected_launch_date, teaser_note, is_announced)
SELECT * FROM (VALUES
  ('Sakura Whisper 2026', 'sakura-whisper-2026',
   'BST lấy cảm hứng từ sắc hồng nhạt của hoa anh đào đầu xuân — bạc 925, opal, ngọc trai nhân tạo.',
   'Sakura pastel — Xuân Nhật 2026',
   DATE '2026-08-15',
   'Mở bán trước cho khách đăng ký nhận thông báo vào 01/08/2026. Đăng ký ngay để được xem trước BST nhé!',
   true),
  ('Mid-Autumn Moon 2026', 'mid-autumn-moon-2026',
   'BST Trung Thu — vàng 18K, đá mặt trăng, thiết kế hình trăng lưỡi liềm.',
   'Trăng rằm — Thu 2026',
   DATE '2026-09-20',
   'Sẽ có 3 thiết kế limited; đăng ký sớm để chọn số.',
   true)
) AS v(name, slug, description, theme, expected_launch_date, teaser_note, is_announced)
WHERE NOT EXISTS (SELECT 1 FROM upcoming_collections uc WHERE uc.slug = v.slug);

-- ============ chat_promotions (mẫu demo) ============
INSERT INTO chat_promotions (title, description, code, discount_type, discount_value, min_order_value, applicable_categories, valid_from, valid_until, is_active)
SELECT * FROM (VALUES
  ('Giảm 10% đơn từ 3 triệu', 'Áp dụng cho tất cả sản phẩm, không giới hạn lượt dùng.', 'WELCOME10',
   'percent', 10, 3000000, ARRAY[]::TEXT[], NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', true),
  ('Freeship đơn từ 1 triệu', 'Miễn phí vận chuyển toàn quốc cho đơn từ 1.000.000đ.', 'FREESHIP',
   'shipping', 40000, 1000000, ARRAY[]::TEXT[], NOW() - INTERVAL '7 days', NOW() + INTERVAL '60 days', true),
  ('Quà tặng Ngọc trai cho đơn từ 5 triệu', 'Tặng 1 đôi hoa tai ngọc trai nhân tạo cho đơn từ 5 triệu.', NULL,
   'gift', 0, 5000000, ARRAY['BONG_TAI','NHAN','DAY_CHUYEN']::TEXT[], NOW(), NOW() + INTERVAL '14 days', true)
) AS v(title, description, code, discount_type, discount_value, min_order_value, applicable_categories, valid_from, valid_until, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM chat_promotions cp WHERE cp.title = v.title
);
