// GET  /api/admin/products
//   Query: ?keyword=&category=&material=&tier=&status=&is_featured=&collection_id=&page=&pageSize=
//   Response 200: { ok: true, data: AdminProduct[], total, page, pageSize }
//   Response 4xx: { ok: false, error, details? }
//
// POST /api/admin/products
//   Body: CreateProductInput (xem lib/admin/products-schema.ts)
//   Response 201: { ok: true, data: AdminProduct }
//   Response 4xx: { ok: false, error, details? }
//
// Lưu ý:
//   - requireAdmin() verify user + role + trả adminClient (service-role, bypass RLS)
//   - Trước insert: check slug/code uniqueness → 409 nếu trùng
//   - PostgREST error code 23505 (unique_violation) → map thành 409 DUPLICATE_KEY

import { NextResponse } from 'next/server';
import {
  CreateProductSchema,
  ProductListQuerySchema,
} from '@/lib/admin/products-schema';
import { listAdminProducts } from '@/lib/supabase/queries/admin-products';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return err?.code === '23505' || /duplicate key|unique constraint/i.test(err?.message ?? '');
}

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const raw: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      raw[k] = v;
    });

    const parsed = ProductListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_QUERY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const result = await listAdminProducts(parsed.data);
      return NextResponse.json({ ok: true, ...result });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: 'LIST_FAILED', message: err?.message ?? 'Unknown error' },
        { status: 500 }
      );
    }
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

export async function POST(req: Request) {
  try {
    const { adminClient } = await requireAdmin();

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    }

    const parsed = CreateProductSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Pre-check slug uniqueness
    const { data: slugHit } = await adminClient
      .from('products')
      .select('id')
      .eq('slug', input.slug)
      .maybeSingle();
    if (slugHit) {
      return NextResponse.json({ ok: false, error: 'SLUG_EXISTS' }, { status: 409 });
    }

    // Pre-check code uniqueness (nếu có)
    if (input.code) {
      const { data: codeHit } = await adminClient
        .from('products')
        .select('id')
        .eq('code', input.code)
        .maybeSingle();
      if (codeHit) {
        return NextResponse.json({ ok: false, error: 'CODE_EXISTS' }, { status: 409 });
      }
    }

    const { data, error } = await adminClient
      .from('products')
      .insert(input as any)
      .select()
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          { ok: false, error: 'DUPLICATE_KEY', message: error.message },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: 'CREATE_FAILED', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
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
