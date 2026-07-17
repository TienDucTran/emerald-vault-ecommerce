/**
 * /api/admin/collections/[id]/products
 *
 *   GET    — list products currently in this collection (paginated + keyword search).
 *   POST   — attach products to this collection (sets products.collection_id = :id).
 *   DELETE — detach products from this collection (sets products.collection_id = NULL
 *            only for rows currently in this collection — không động tới collection khác).
 *
 * Auth: requireAdmin.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
});

type RouteCtx = { params: Promise<{ id: string }> };

function sanitizeKeyword(kw: string): string {
  return kw.replace(/[%_,()]/g, '');
}

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const url = new URL(req.url);
    const keywordRaw = url.searchParams.get('keyword')?.trim() ?? '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));

    const supabase = createAdminClient();

    let q = supabase
      .from('products')
      .select(
        'id, slug, code, title, material, category, image_url, price, status, quality_tier',
        { count: 'exact' }
      )
      .eq('collection_id', id);

    if (keywordRaw.length > 0) {
      const kw = sanitizeKeyword(keywordRaw);
      if (kw.length > 0) {
        q = q.ilike('title', `%${kw}%`);
      }
    }

    q = q.order('created_at', { ascending: false });
    const from = (page - 1) * pageSize;
    q = q.range(from, from + pageSize - 1);

    const { data, error, count } = await q;
    if (error) {
      console.error('[admin/collections/:id/products GET] error:', error);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    return authErrorResponse(err, 'admin/collections/:id/products GET');
  }
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_BODY',
          message: first
            ? `${first.path.join('.')}: ${first.message}`
            : 'Dữ liệu không hợp lệ',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    const { productIds } = parsed.data;

    const supabase = createAdminClient();

    const { data: coll, error: collErr } = await supabase
      .from('collections')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (collErr) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: collErr.message },
        { status: 500 }
      );
    }
    if (!coll) {
      return NextResponse.json(
        { ok: false, error: 'COLLECTION_NOT_FOUND', message: 'Không tìm thấy bộ sưu tập' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('products')
      .update({ collection_id: id })
      .in('id', productIds)
      .select('id');

    if (error) {
      console.error('[admin/collections/:id/products POST] error:', error);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 }
      );
    }

    const added = data?.length ?? 0;
    return NextResponse.json({
      ok: true,
      added,
      requested: productIds.length,
    });
  } catch (err) {
    return authErrorResponse(err, 'admin/collections/:id/products POST');
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_BODY',
          message: first
            ? `${first.path.join('.')}: ${first.message}`
            : 'Dữ liệu không hợp lệ',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    const { productIds } = parsed.data;

    const supabase = createAdminClient();

    // Safety: chỉ detach product đang thuộc collection này (không động tới collection khác).
    const { data, error } = await supabase
      .from('products')
      .update({ collection_id: null })
      .eq('collection_id', id)
      .in('id', productIds)
      .select('id');

    if (error) {
      console.error('[admin/collections/:id/products DELETE] error:', error);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 }
      );
    }

    const removed = data?.length ?? 0;
    return NextResponse.json({
      ok: true,
      removed,
      requested: productIds.length,
    });
  } catch (err) {
    return authErrorResponse(err, 'admin/collections/:id/products DELETE');
  }
}
