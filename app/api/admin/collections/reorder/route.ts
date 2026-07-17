/**
 * /api/admin/collections/reorder
 *
 *   POST body: { items: [{ id: string, display_order: number }, ...] }
 *     - Batch update display_order cho nhiều collection trong 1 request.
 *     - Validate: mỗi item phải có id (string) và display_order (number int >= 0).
 *     - Response 200: { ok: true, updated: number }
 *
 * Auth: requireAdmin.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        display_order: z.number().int().min(0),
      })
    )
    .min(1)
    .max(500),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        {
          ok: false,
          error: 'BAD_REQUEST',
          message: first ? `${first.path.join('.')}: ${first.message}` : 'Dữ liệu không hợp lệ',
        },
        { status: 400 }
      );
    }
    const { adminClient } = await requireAdmin();
    const items = parsed.data.items;
    let updated = 0;
    for (const it of items) {
      const { error } = await adminClient
        .from('collections')
        .update({ display_order: it.display_order })
        .eq('id', it.id);
      if (error) {
        console.error('[admin/collections/reorder] error id=', it.id, error);
        return NextResponse.json(
          { ok: false, error: 'DB_ERROR', message: `Lỗi khi cập nhật id=${it.id}: ${error.message}` },
          { status: 500 }
        );
      }
      updated += 1;
    }
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    return authErrorResponse(err, 'admin/collections/reorder');
  }
}
