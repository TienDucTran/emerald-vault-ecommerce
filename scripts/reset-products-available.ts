/**
 * Script: Reset tất cả products về AVAILABLE
 * Chạy: npx tsx scripts/reset-products-available.ts
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createAdminClient();

  // Count trước
  const { data: before, error: beforeErr } = await supabase
    .from('products')
    .select('status')
    .neq('status', 'AVAILABLE');

  console.log(`[reset] ${before?.length ?? 0} sản phẩm cần reset (SOLD_OUT/RESERVED)`);

  if (beforeErr) {
    console.error('[reset] Error counting:', beforeErr.message);
    process.exit(1);
  }

  if (!before || before.length === 0) {
    console.log('[reset] Tất cả sản phẩm đã AVAILABLE — không cần reset');
    return;
  }

  // Reset
  const { data, error } = await supabase
    .from('products')
    .update({ status: 'AVAILABLE' })
    .in('status', ['SOLD_OUT', 'RESERVED'])
    .select('id, title, status');

  if (error) {
    console.error('[reset] Error updating:', error.message);
    process.exit(1);
  }

  console.log(`[reset] ✅ Đã reset ${data?.length ?? 0} sản phẩm về AVAILABLE:`);
  for (const p of data ?? []) {
    console.log(`  - ${p.title} → ${p.status}`);
  }

  // Verify
  const { data: after } = await supabase
    .from('products')
    .select('status')
    .eq('status', 'AVAILABLE');

  console.log(`[reset] Tổng sản phẩm AVAILABLE: ${after?.length ?? 0}`);
}

main().catch((err) => {
  console.error('[reset] Fatal error:', err);
  process.exit(1);
});