/**
 * /api/account/wishlist
 *
 *   GET  — Liệt kê wishlist của customer + join product (các field cơ bản).
 *   POST — Thêm product vào wishlist. Idempotent: nếu đã tồn tại (unique (user_id, product_id))
 *          → trả về row hiện có.
 *
 * Auth: requireCustomer. Mọi read/write qua admin client.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';
import type {
  ProductBasic,
  WishlistItem,
  WishlistItemWithProduct,
} from '@/lib/types/account';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const wishlistInsertSchema = z
  .object({
    product_id: z.string().uuid('product_id không hợp lệ'),
  })
  .strict();

const PRODUCT_BASIC_COLUMNS =
  'id, slug, title, image_url, price, original_price, status, category, material';

export async function GET() {
  try {
    const { user, adminClient } = await requireCustomer();

    const { data, error } = await adminClient
      .from('wishlist_items')
      .select(
        `id, user_id, product_id, created_at, products(${PRODUCT_BASIC_COLUMNS})`
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/account/wishlist] error:', error);
      return NextResponse.json(
        { error: 'FETCH_FAILED', message: 'Không thể lấy wishlist' },
        { status: 500 }
      );
    }

    const items: WishlistItemWithProduct[] = (data ?? []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      product_id: row.product_id,
      created_at: row.created_at,
      product: (row.products as ProductBasic | null) ?? null,
    }));

    return NextResponse.json({ data: items });
  } catch (err) {
    return authErrorResponse(err, 'GET /api/account/wishlist');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, adminClient } = await requireCustomer();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = wishlistInsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { product_id } = parsed.data;

    const { data: existing, error: findErr } = await adminClient
      .from('wishlist_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .maybeSingle<WishlistItem>();

    if (findErr) {
      console.error('[POST /api/account/wishlist] find error:', findErr);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    const { data: created, error: insertErr } = await adminClient
      .from('wishlist_items')
      .insert({ user_id: user.id, product_id })
      .select('*')
      .single<WishlistItem>();

    if (insertErr || !created) {
      if (insertErr?.code === '23505') {
        const { data: reFetch } = await adminClient
          .from('wishlist_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', product_id)
          .single<WishlistItem>();
        if (reFetch) {
          return NextResponse.json({ data: reFetch }, { status: 200 });
        }
      }
      console.error('[POST /api/account/wishlist] insert error:', insertErr);
      return NextResponse.json(
        { error: 'INSERT_FAILED', message: 'Không thể thêm vào wishlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err, 'POST /api/account/wishlist');
  }
}
