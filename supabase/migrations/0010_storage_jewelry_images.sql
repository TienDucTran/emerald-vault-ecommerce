-- =====================================================
-- Migration 0010: Storage bucket `jewelry-images` + policies
-- =====================================================
-- Chạy thủ công trên Supabase Dashboard → SQL Editor
-- Repo không dùng Supabase CLI nên không chạy tự động được.
--
-- Tạo bucket:
--   - Public (cho phép đọc ảnh qua public URL mà không cần ký JWT)
--   - Dung lượng file tối đa: 10MB (an toàn vì client đã resize xuống webp ~500KB,
--     nhưng vẫn để margin cho ảnh gốc nếu upload trực tiếp từ bulk import script)
--   - MIME types cho phép: image/jpeg, image/png, image/webp, image/avif
--   - Folder permission: KHÔNG cấu hình (vì chỉ admin dùng service_role upload)
--
-- Policies:
--   1. Public SELECT (đọc ảnh): ai cũng xem được vì bucket public
--   2. Service role INSERT/UPDATE/DELETE: KHÔNG cần policy vì service_role
--      bypass mọi policy. Tuy nhiên cần policy cho authenticated admin nếu
--      sau này muốn upload thẳng từ client (khuyến nghị: KHÔNG làm thế).
--
-- Lưu ý bảo mật:
--   - KHÔNG cấp INSERT/UPDATE/DELETE cho `authenticated` role. Mọi upload phải
--     qua API route `/api/admin/uploads` đã verify role=admin.
--   - Service role key TUYỆT ĐỐI KHÔNG lộ client.

-- 1. Tạo bucket nếu chưa tồn tại
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jewelry-images',
  'jewelry-images',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Xoá policies cũ nếu tồn tại (idempotent, cho phép re-run)
DROP POLICY IF EXISTS "Public read jewelry images" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access jewelry images" ON storage.objects;

-- 3. Policy: public đọc (vì bucket public, ai cũng xem được ảnh qua public URL)
CREATE POLICY "Public read jewelry images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'jewelry-images');

-- 4. Policy: admin (qua JWT claim role check) INSERT/UPDATE/DELETE
--   Dùng subquery kiểm tra profiles.role = 'admin' của user hiện tại.
--   Service role bypass policy này (đó là lý do route /api/admin/uploads dùng service_role client).
--   Cho phép admin upload thẳng qua client nếu muốn (optional, khuyến nghị KHÔNG nhưng có cũng không hại).
CREATE POLICY "Admin full access jewelry images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'jewelry-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'jewelry-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
