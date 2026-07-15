// POST /api/admin/products/bulk
//   Body:
//     {
//       products: CreateProductInput[] (1..500),
//       atomic?: boolean (default false)
//     }
//   Response 201:
//     { ok: true, inserted: number, failed: number, errors?: { index, error }[], data: AdminProduct[] }
//
// Behavior:
//   - Pre-validate duplicates WITHIN batch (slugs, codes) → 400 BATCH_DUPLICATES
//   - Pre-check slug/code collisions vs DB (single query mỗi loại) → 409 DB_DUPLICATES
//   - Nếu atomic=true: insert tất cả trong 1 lần. Lỗi → 500, không insert gì.
//   - Nếu atomic=false (mặc định): thử bulk insert trước; nếu fail, fallback
//     per-row insert để thu thập per-row errors. Vẫn insert các row hợp lệ.

import { NextResponse } from 'next/server';
import { BulkProductsSchema } from '@/lib/admin/products-schema';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';
import type { AdminProduct } from '@/lib/supabase/queries/admin-products';

interface PerRowError {
  index: number;
  error: string;
}

export async function POST(req: Request) {
  try {
    const { adminClient } = await requireAdmin();

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    }

    const parsed = BulkProductsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { products, atomic } = parsed.data;

    // 1. Within-batch duplicate detection
    const slugCounts = new Map<string, number>();
    const codeCounts = new Map<string, number>();
    for (const p of products) {
      slugCounts.set(p.slug, (slugCounts.get(p.slug) ?? 0) + 1);
      if (p.code) codeCounts.set(p.code, (codeCounts.get(p.code) ?? 0) + 1);
    }
    const dupSlugs = [...slugCounts.entries()].filter(([, c]) => c > 1).map(([s]) => s);
    const dupCodes = [...codeCounts.entries()].filter(([, c]) => c > 1).map(([c]) => c);
    if (dupSlugs.length > 0 || dupCodes.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'BATCH_DUPLICATES',
          duplicates: { slugs: dupSlugs, codes: dupCodes },
        },
        { status: 400 }
      );
    }

    // 2. DB collision check
    const slugList = [...new Set(products.map((p) => p.slug))];
    const codeList = [...new Set(products.map((p) => p.code).filter((c): c is string => !!c))];

    async function fetchExistingSlugs(): Promise<string[]> {
      if (slugList.length === 0) return [];
      const { data, error } = await adminClient
        .from('products')
        .select('slug')
        .in('slug', slugList);
      if (error) throw error;
      return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
    }
    async function fetchExistingCodes(): Promise<string[]> {
      if (codeList.length === 0) return [];
      const { data, error } = await adminClient
        .from('products')
        .select('code')
        .in('code', codeList);
      if (error) throw error;
      return ((data ?? []) as { code: string }[]).map((r) => r.code);
    }
    const [existingSlugs, existingCodes] = await Promise.all([
      fetchExistingSlugs(),
      fetchExistingCodes(),
    ]);
    if (existingSlugs.length > 0 || existingCodes.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'DB_DUPLICATES',
          existing: { slugs: existingSlugs, codes: existingCodes },
        },
        { status: 409 }
      );
    }

    // 3. Insert
    if (atomic) {
      const { data, error } = await adminClient
        .from('products')
        .insert(products as any)
        .select();
      if (error) {
        return NextResponse.json(
          { ok: false, error: 'BULK_INSERT_FAILED', message: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { ok: true, inserted: (data ?? []).length, failed: 0, data: (data ?? []) as AdminProduct[] },
        { status: 201 }
      );
    }

    // Non-atomic: try bulk first, fallback to per-row
    const bulkAttempt = await adminClient.from('products').insert(products as any).select();
    if (!bulkAttempt.error) {
      return NextResponse.json(
        {
          ok: true,
          inserted: (bulkAttempt.data ?? []).length,
          failed: 0,
          data: (bulkAttempt.data ?? []) as AdminProduct[],
        },
        { status: 201 }
      );
    }

    // Fallback: per-row insert
    const inserted: AdminProduct[] = [];
    const errors: PerRowError[] = [];
    for (let i = 0; i < products.length; i++) {
      const row = products[i];
      const { data, error } = await adminClient
        .from('products')
        .insert(row as any)
        .select()
        .single();
      if (error) {
        errors.push({ index: i, error: error.message });
      } else if (data) {
        inserted.push(data as AdminProduct);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        inserted: inserted.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        data: inserted,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
