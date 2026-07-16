// GET    /api/admin/products/:id
//   Response 200: { ok: true, data: AdminProduct }
//   Response 4xx: { ok: false, error }
//
// PATCH  /api/admin/products/:id
//   Body: UpdateProductInput (partial — tất cả field optional)
//   Response 200: { ok: true, data: AdminProduct }
//   Response 4xx: { ok: false, error, details? }
//
// DELETE /api/admin/products/:id
//   Response 200: { ok: true, id }
//   Response 4xx: { ok: false, error }
//
// Lưu ý:
//   - Next.js 15: `params` là Promise, phải await.
//   - Nếu PATCH thay đổi slug/code: check uniqueness loại trừ id hiện tại → 409.
//   - PostgREST error code 23505 (unique_violation) → 409 DUPLICATE_KEY.
//   - DELETE là hard delete — UI phải confirm trước khi gọi.

import { NextResponse } from 'next/server';
import { UpdateProductSchema } from '@/lib/admin/products-schema';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';

// requireAdmin() gọi cookies() → bắt buộc dynamic.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return err?.code === '23505' || /duplicate key|unique constraint/i.test(err?.message ?? '');
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { adminClient } = await requireAdmin();
    const { id } = await params;

    const { data, error } = await adminClient
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'FETCH_FAILED', message: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
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

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { adminClient } = await requireAdmin();
    const { id } = await params;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    }

    const parsed = UpdateProductSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Nếu đổi slug → check uniqueness trừ id hiện tại
    if (input.slug) {
      const { data: hit } = await adminClient
        .from('products')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', id)
        .maybeSingle();
      if (hit) {
        return NextResponse.json({ ok: false, error: 'SLUG_EXISTS' }, { status: 409 });
      }
    }

    // Nếu đổi code → check uniqueness trừ id hiện tại
    if (input.code) {
      const { data: hit } = await adminClient
        .from('products')
        .select('id')
        .eq('code', input.code)
        .neq('id', id)
        .maybeSingle();
      if (hit) {
        return NextResponse.json({ ok: false, error: 'CODE_EXISTS' }, { status: 409 });
      }
    }

    const { data, error } = await adminClient
      .from('products')
      .update(input)
      .eq('id', id)
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
        { ok: false, error: 'UPDATE_FAILED', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
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

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { adminClient } = await requireAdmin();
    const { id } = await params;

    const { error } = await adminClient.from('products').delete().eq('id', id);
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DELETE_FAILED', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id });
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
