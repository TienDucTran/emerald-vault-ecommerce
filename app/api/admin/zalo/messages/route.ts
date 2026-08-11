// app/api/admin/zalo/messages/route.ts
// GET /api/admin/zalo/messages
//   Returns danh sách tin nhắn Zalo, grouped by user hoặc list tất cả.
//   Query params:
//     ?user_id=xxx  — Lấy lịch sử chat của 1 user cụ thể
//     ?status=received  — Filter theo status (received/replied/read/failed)
//     ?limit=50  — Số lượng tối đa (default 50, max 200)
//   Response 200: { ok: true, data: ZaloMessage[] }
//
// PUT /api/admin/zalo/messages
//   Reply to Zalo user — gửi tin nhắn qua Zalo OA API + lưu vào DB.
//   Body: { userId: string, text: string }
//   Response 200: { ok: true, data: { msgId } }

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';
import { sendZaloMessage } from '@/lib/zalo/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { adminClient } = await requireAdmin();

    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const status = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    let query = adminClient
      .from('zalo_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('zalo_user_id', userId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[admin/zalo/messages GET] error:', error);
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error('[admin/zalo/messages GET] exception:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

const replySchema = z.object({
  userId: z.string().min(1, 'User ID không được rỗng'),
  text: z.string().min(1, 'Nội dung không được rỗng').max(2000, 'Tin nhắn quá dài (tối đa 2000 ký tự)'),
});

export async function PUT(req: Request) {
  try {
    const { adminClient, user } = await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { userId, text } = parsed.data;

    // Gửi tin nhắn qua Zalo OA API
    const { msgId, error: sendError } = await sendZaloMessage(userId, text);
    if (sendError || !msgId) {
      console.error('[admin/zalo/messages PUT] send error:', sendError);
      return NextResponse.json(
        { ok: false, error: 'ZALO_API_ERROR', message: sendError || 'Gửi tin nhắn thất bại' },
        { status: 502 }
      );
    }

    // Lưu tin nhắn đã gửi vào DB
    const { error: insertErr } = await adminClient.from('zalo_messages').insert({
      zalo_user_id: userId,
      display_name: null,
      direction: 'out',
      message_text: text,
      message_type: 'text',
      zalo_msg_id: msgId,
      status: 'replied',
      handled_by: user?.id ?? null,
    });

    if (insertErr) {
      console.error('[admin/zalo/messages PUT] insert error:', insertErr);
      // Vẫn return success vì tin nhắn đã gửi thành công, chỉ DB fail
    }

    // Đánh dấu tất cả tin nhắn 'received' của user này thành 'replied'
    await adminClient
      .from('zalo_messages')
      .update({ status: 'replied' })
      .eq('zalo_user_id', userId)
      .eq('direction', 'in')
      .eq('status', 'received');

    return NextResponse.json({ ok: true, data: { msgId } });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error('[admin/zalo/messages PUT] exception:', e);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH — mark message as read (admin đã xem)
export async function PATCH(req: Request) {
  try {
    const { adminClient } = await requireAdmin();

    const body = await req.json().catch(() => null);
    if (!body || !body.messageId) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', message: 'Thiếu messageId' },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from('zalo_messages')
      .update({ status: 'read' })
      .eq('id', body.messageId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'INTERNAL' },
      { status: 500 }
    );
  }
}