/**
 * /api/admin/collections/list
 *
 *   GET ?q=&page=&limit=
 *     - List TẤT CẢ collections (admin thấy cả draft), sắp xếp theo
 *       display_order ASC, created_at DESC.
 *     - `q` (optional): tìm theo name ILIKE hoặc slug ILIKE.
 *     - `product_count` đếm từ bảng products (FK collection_id) — 1 query batch
 *       sau khi lấy page.
 *     - Response 200: { collections, total, page, limit }
 *     - Response 4xx: { error, message }
 *
 *   Lưu ý: route này tách riêng vì file route.ts gốc được dùng bởi
 *   ProductForm (select "Bộ sưu tập") với response shape khác
 *   ({ ok, data: [...] }). Tách route tránh breaking change.
 *
 * Auth: requireAdmin.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CollectionRow, ProductRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface AdminCollectionListItem extends CollectionRow {
  product_count: number;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Tham số không hợp lệ' },
        { status: 400 }
      );
    }
    const { q, page, limit } = parsed.data;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const admin = createAdminClient();

    let query = admin
      .from('collections')
      .select('*', { count: 'exact' });

    if (q) {
      const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
    }

    const { data, error, count } = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[admin/collections/list] list error:', error);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Không thể tải danh sách bộ sưu tập' },
        { status: 500 }
      );
    }

    const ids = ((data ?? []) as Array<{ id: string }>).map((c) => c.id);
    const countMap = new Map<string, number>();
    if (ids.length > 0) {
      const { data: prods, error: pErr } = await admin
        .from('products')
        .select('id, collection_id')
        .in('collection_id', ids);
      if (pErr) {
        console.error('[admin/collections/list] products count error:', pErr);
      } else {
        for (const p of (prods ?? []) as Pick<ProductRow, 'id' | 'collection_id'>[]) {
          if (!p.collection_id) continue;
          countMap.set(
            p.collection_id,
            (countMap.get(p.collection_id) ?? 0) + 1
          );
        }
      }
    }

    const collections: AdminCollectionListItem[] = ((data ?? []) as CollectionRow[]).map((c) => ({
      ...c,
      product_count: countMap.get(c.id) ?? 0,
    }));

    return NextResponse.json({
      collections,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    return authErrorResponse(err, 'admin/collections/list');
  }
}
