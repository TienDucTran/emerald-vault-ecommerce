// scripts/embed-all-products.ts
// Batch embed toàn bộ products.embedding_text → vector(1536), update cột `embedding`.
// Chạy:  node --env-file=.env.local --import tsx scripts/embed-all-products.ts [--all] [--limit N]
import { embedBatch } from '../lib/chatbot/embeddings';
import { createAdminClient } from '../lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createAdminClient();

const args = process.argv.slice(2);
const forceAll = args.includes('--all');
const limitIdx = args.indexOf('--limit');
const limit =
  limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : undefined;

type ProductRow = {
  id: string;
  title: string;
  description: string | null;
  embedding_text: string | null;
  embedding: unknown;
};

async function main(): Promise<void> {
  console.log('🧠 Embedding products (provider:', process.env.EMBED_PRIMARY || 'gemini', ')');
  if (forceAll) console.log('   mode: --all (re-embed everything)');
  if (limit) console.log(`   limit: ${limit}`);

  // 1) Fetch products
  let query = supabase
    .from('products')
    .select('id, title, description, embedding_text, embedding')
    .order('created_at', { ascending: true });
  if (!forceAll) query = query.is('embedding', null);
  if (limit) query = query.limit(limit);

  const { data: products, error } = await query;
  if (error) throw error;
  const rows = (products ?? []) as ProductRow[];

  if (rows.length === 0) {
    console.log('No products to embed. Use --all to re-embed everything.');
    return;
  }
  console.log(`📦 Found ${rows.length} products to embed`);

  // 2) Build texts (fallback khi embedding_text null/empty)
  const texts = rows.map((p) => {
    if (p.embedding_text && p.embedding_text.trim()) return p.embedding_text;
    return [p.title, p.description].filter(Boolean).join(' | ');
  });

  // 3) Embed
  const vectors = await embedBatch(texts);
  if (vectors.length === 0) {
    console.warn('⚠️ embedBatch returned [] (no API key / not configured). Exiting.');
    return;
  }
  if (vectors.length !== rows.length) {
    console.warn(
      `⚠️ vectors length (${vectors.length}) != rows length (${rows.length}). Will align by index.`
    );
  }

  // 4) Update từng row
  let embedded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    const vec = vectors[i];

    if (!vec || vec.length === 0) {
      console.warn(`⊘ [${i + 1}/${rows.length}] ${p.id} — empty vector, skip`);
      skipped++;
      continue;
    }
    if (vec.length !== 1536) {
      console.error(
        `✗ [${i + 1}/${rows.length}] ${p.id} — wrong dim ${vec.length}, expected 1536`
      );
      failed++;
      continue;
    }

    const vecStr = `[${vec.join(',')}]`;

    try {
      const { error: upErr } = await supabase.rpc('update_product_embedding', {
        p_id: p.id,
        p_vec: vecStr,
      });
      if (upErr) {
        console.error(`✗ [${i + 1}/${rows.length}] ${p.id} — ${upErr.message}`);
        failed++;
        continue;
      }
      embedded++;
      if (embedded % 10 === 0 || embedded === rows.length) {
        console.log(`✓ Embedded ${embedded}/${rows.length}`);
      }
    } catch (err) {
      console.error(`✗ [${i + 1}/${rows.length}] ${p.id} — ${(err as Error).message}`);
      failed++;
    }
  }

  // 5) Summary
  console.log('\n=== Summary ===');
  console.log(`Total:    ${rows.length}`);
  console.log(`Embedded: ${embedded}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Skipped:  ${skipped}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
