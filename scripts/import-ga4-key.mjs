#!/usr/bin/env node
/**
 * scripts/import-ga4-key.mjs
 *
 * Helper import service account JSON + Property ID vào .env.local
 * mà KHÔNG phải copy/paste thủ công (tránh sai escape \n).
 *
 * Usage:
 *   node scripts/import-ga4-key.mjs
 *
 * Sau đó nhập:
 *   1) Đường dẫn tới file service account JSON (download từ Google Cloud)
 *   2) GA4 Property ID (dạng số, lấy từ GA4 Admin → Property details)
 *
 * Script sẽ:
 *   - Đọc file JSON
 *   - Loại bỏ 2 dòng GA4_PROPERTY_ID / GA4_SERVICE_ACCOUNT_JSON cũ (nếu có)
 *   - Append 2 dòng mới vào .env.local (JSON 1 dòng, không escape)
 *   - In ra hướng dẫn tiếp theo
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const keyPath = (await ask('Path to service account JSON (vd: C:\\Users\\USER\\Downloads\\ev-ga4-abc123.json): ')).trim();
const propertyId = (await ask('GA4 Property ID (số, vd: 472839105): ')).trim();
rl.close();

if (!fs.existsSync(keyPath)) {
  console.error(`❌ Không tìm thấy file: ${keyPath}`);
  process.exit(1);
}

let json;
try {
  json = fs.readFileSync(keyPath, 'utf8');
  // Minify: bỏ newline + collapse whitespace. .env cần JSON trên 1 dòng
  // vì shell parse env chỉ lấy đến newline đầu tiên.
  json = json.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
  JSON.parse(json); // validate
} catch (e) {
  console.error(`❌ File JSON không hợp lệ: ${e.message}`);
  process.exit(1);
}

if (json.length > 4000) {
  console.log(`ℹ️  Service account JSON length: ${json.length} chars (expected ~2500, nếu >4000 kiểm tra lại file).`);
}

if (!/^\d+$/.test(propertyId)) {
  console.error(`❌ Property ID phải là số (không phải "${propertyId}"). Tìm ở GA4 Admin → Property details.`);
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), '.env.local');
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const stripped = existing
  .split('\n')
  .filter((l) => !/^GA4_PROPERTY_ID=/.test(l) && !/^GA4_SERVICE_ACCOUNT_JSON=/.test(l))
  .join('\n');

const next = `${stripped.replace(/\s+$/, '')}\n\n# === GA4 Data API (cho /admin/analytics) ===\nGA4_PROPERTY_ID=${propertyId}\nGA4_SERVICE_ACCOUNT_JSON=${json}\n`;

fs.writeFileSync(envPath, next, 'utf8');
console.log(`\n✅ Đã ghi vào ${envPath}`);
console.log('\nTiếp theo:');
console.log('  1. Restart dev server: npm run dev');
console.log('  2. Mở /admin/analytics, banner warning phải biến mất, KPI có số liệu thật.');
console.log('  3. Nếu vẫn lỗi, xem docs/GA4_SETUP.md §9 Troubleshooting.\n');
