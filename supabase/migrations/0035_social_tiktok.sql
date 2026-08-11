-- =====================================================
-- 0035 — Replace social_youtube with social_tiktok
-- Footer: Instagram, Facebook, TikTok, Zalo (4 social)
-- =====================================================

-- 1. Insert social_tiktok key (nếu chưa có)
INSERT INTO site_settings (key, value)
VALUES ('social_tiktok', 'https://tiktok.com')
ON CONFLICT (key) DO NOTHING;

-- 2. Xóa social_youtube (không còn dùng trong footer)
DELETE FROM site_settings WHERE key = 'social_youtube';

-- =====================================================
-- DONE
-- =====================================================