/**
 * Bootstrap admin user — chạy 1 lần để tạo tài khoản admin đầu tiên.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> <password>
 *
 * Ví dụ:
 *   node scripts/create-admin.mjs admin@emerald-vault.vn MatKhauManh123!
 *
 * Sau khi chạy:
 *   1. User đã tồn tại trong auth.users
 *   2. Profile row đã được tạo tự động (trigger handle_new_user)
 *   3. profiles.role đã được set = 'admin'
 *   4. Login tại /admin/login bằng email/password vừa tạo
 *
 * Lưu ý:
 *   - Cần SUPABASE_SERVICE_ROLE_KEY trong .env.local (đã có sẵn, bypass RLS)
 *   - User có thể đăng nhập ngay lập tức
 *   - KHÔNG commit email/password thật vào git
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local — Node 20.6+ hỗ trợ --env-file natively
// Chạy: node --env-file=.env.local scripts/create-admin.mjs <email> <password>

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Usage: node scripts/create-admin.mjs <email> <password>');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Password phải >= 8 ký tự');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`🔧 Tạo admin user: ${email}`);
  console.log('---');

  // 1. Tạo user trong auth.users
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm, không cần email verify
    user_metadata: { full_name: 'Admin' },
  });

  if (createErr) {
    // Nếu user đã tồn tại thì bỏ qua, tiếp tục update role
    if (createErr.message?.includes('already') || createErr.status === 422) {
      console.log(`⚠️  User đã tồn tại, tiếp tục update role...`);
    } else {
      console.error('❌ Lỗi tạo user:', createErr.message);
      process.exit(1);
    }
  } else {
    console.log(`✅ Đã tạo user: ${created.user?.id}`);
  }

  // 2. Lấy user id (từ create hoặc lookup)
  let userId = created?.user?.id;
  if (!userId) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      console.error('❌ Lỗi list users:', listErr.message);
      process.exit(1);
    }
    const found = list.users.find((u) => u.email === email);
    if (!found) {
      console.error('❌ Không tìm thấy user sau khi tạo');
      process.exit(1);
    }
    userId = found.id;
  }

  // 3. Update profiles.role = 'admin' (trigger handle_new_user đã tạo row, ta chỉ cần update)
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);

  if (profileErr) {
    console.error('❌ Lỗi update profile:', profileErr.message);
    process.exit(1);
  }
  console.log(`✅ Đã set profiles.role = 'admin'`);

  // 4. Verify
  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();

  if (readErr) {
    console.error('❌ Lỗi verify:', readErr.message);
    process.exit(1);
  }

  console.log('---');
  console.log('✅ DONE. Admin user ready:');
  console.log(JSON.stringify(profile, null, 2));
  console.log('---');
  console.log(`👉 Login tại: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/login`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${'*'.repeat(password.length)}`);
}

main().catch((err) => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
