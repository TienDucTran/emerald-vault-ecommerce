-- =====================================================
-- Migration 0032: Update payment-bills bucket thành PUBLIC
-- =====================================================
-- Context:
--   Migration 0008 tạo bucket `payment-bills` với public=false (private).
--   Nhưng code dùng getPublicUrl() để lấy URL cho khách + admin xem bill CK
--   → URL không truy cập được khi bucket private (NoSuchBucket/AccessDenied).
--
--   So sánh: bucket `jewelry-images` (migration 0010) là public=true →
--   getPublicUrl() hoạt động bình thường.
--
-- Fix: update bucket thành public=true, thêm MIME types còn thiếu (heif),
--   thêm public SELECT policy (giống jewelry-images).
--
-- Chạy thủ công trên Supabase Dashboard → SQL Editor (repo không dùng CLI).
-- Idempotent: re-run an toàn (ON CONFLICT DO UPDATE).

-- 1. Update bucket thành public + thêm allowed_mime_types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-bills',
  'payment-bills',
  true,                            -- public = true (fix chính)
  5242880,                         -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Public SELECT policy (đọc bill qua public URL)
DROP POLICY IF EXISTS "Public read payment bills" ON storage.objects;
CREATE POLICY "Public read payment bills"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'payment-bills');

-- 3. Giữ admin policies từ migration 0008 (read + delete)
DROP POLICY IF EXISTS "admin_read_bills" ON storage.objects;
CREATE POLICY "admin_read_bills" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-bills'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_delete_bills" ON storage.objects;
CREATE POLICY "admin_delete_bills" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-bills'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Lưu ý: Upload bill qua API route dùng service_role (bypass RLS)
-- → không cần INSERT policy cho anon/authenticated.