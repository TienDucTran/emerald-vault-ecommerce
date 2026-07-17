/**
 * /api/admin/newsletter
 *
 *   GET  ?q=&active=true|false|all&page=1&limit=20
 *     - q: search email hoặc full_name (ILIKE)
 *     - active: filter is_active (default: all)
 *     - page, limit: pagination
 *     - Response 200: { ok: true, subscribers, total, page, limit }
 *
 *   DELETE body: { id: string }
 *     - Xoá subscriber theo id.
 *     - Response 200: { ok: true }
 *     - Response 404 nếu không tìm thấy.
 *
 *   Auth: requireAdmin.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const getQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  active: z.enum(['true', 'false', 'all']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(req: Request) {
  try {
    const { adminClient } = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const parsed = getQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      active: searchParams.get('active') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { q, active, page, limit } = parsed.data;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = adminClient
      .from('newsletter_subscribers')
      .select('id, email, full_name, source, is_active, subscribed_at, unsubscribed_at', {
        count: 'exact',
      });

    if (active === 'true') query = query.eq('is_active', true);
    if (active === 'false') query = query.eq('is_active', false);

    if (q) {
      const esc = q.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(`email.ilike.%${esc}%,full_name.ilike.%${esc}%`);
    }

    query = query.order('subscribed_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error('[admin/newsletter] GET failed:', error);
      return NextResponse.json(
        { ok: false, error: 'LIST_FAILED', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      subscribers: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    return authErrorResponse(err, 'admin/newsletter');
  }
}

export async function DELETE(req: Request) {
  try {
    const { adminClient } = await requireAdmin();
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', message: 'Body JSON không hợp lệ' },
        { status: 400 }
      );
    }
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { id } = parsed.data;
    const { error, count } = await adminClient
      .from('newsletter_subscribers')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error('[admin/newsletter] DELETE failed:', error);
      return NextResponse.json(
        { ok: false, error: 'DELETE_FAILED', message: error.message },
        { status: 500 }
      );
    }
    if (!count) {
      return NextResponse.json(
        { ok: false, error: 'NOT_FOUND', message: 'Không tìm thấy subscriber' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err, 'admin/newsletter');
  }
}
