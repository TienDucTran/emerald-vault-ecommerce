// app/api/zalo/webhook/route.ts
// Zalo OA Webhook — nhận tin nhắn từ khách hàng qua Zalo Official Account.
//
// Cấu hình webhook URL trong Zalo OA dashboard:
//   https://emerald-vault.vn/api/zalo/webhook
//
// Zalo gửi POST request với JSON body mỗi khi có event:
//   - user_send_text: khách gửi tin nhắn text
//   - follow: khách follow OA
//   - unfollow: khách unfollow OA
//
// Security: Verify signature (X-ZEvent-Signature header) để chặn fake requests.
//
// Response: Luôn trả 200 OK (Zalo yêu cầu, nếu trả lỗi Zalo sẽ retry).

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getZaloConfig } from '@/lib/zalo/config';
import {
  verifyZaloWebhookSignature,
  parseZaloWebhookEvent,
  sendZaloMessage,
  type ZaloWebhookEvent,
} from '@/lib/zalo/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const config = getZaloConfig();

  // Nếu chưa cấu hình → trả 200 để Zalo không retry, log warning
  if (!config.isConfigured) {
    console.warn('[zalo:webhook] Zalo OA chưa cấu hình — bỏ qua event');
    return NextResponse.json({ ok: true, message: 'not configured' });
  }

  try {
    // Đọc raw body để verify signature
    const rawBody = await req.text();
    const signature = req.headers.get('x-zevent-signature') || '';

    // Verify signature (nếu có signature header)
    if (signature) {
      const isValid = await verifyZaloWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('[zalo:webhook] invalid signature');
        // Vẫn trả 200 để Zalo không retry, nhưng không xử lý
        return NextResponse.json({ ok: true, message: 'invalid signature' });
      }
    }

    // Parse body
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[zalo:webhook] invalid JSON body');
      return NextResponse.json({ ok: true, message: 'invalid json' });
    }

    const event = parseZaloWebhookEvent(body);
    if (!event) {
      console.warn('[zalo:webhook] cannot parse event:', JSON.stringify(body).slice(0, 200));
      return NextResponse.json({ ok: true, message: 'unparseable' });
    }

    // Xử lý theo event type
    switch (event.eventType) {
      case 'user_send_text':
      case 'user_send_image':
      case 'user_send_link':
        await handleIncomingMessage(event);
        break;
      case 'follow':
        await handleFollow(event);
        break;
      case 'unfollow':
        console.log(`[zalo:webhook] user unfollowed: ${event.userId}`);
        break;
      default:
        console.log(`[zalo:webhook] unhandled event: ${event.eventType}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[zalo:webhook] exception:', e instanceof Error ? e.message : e);
    // Trả 200 để Zalo không retry liên tục
    return NextResponse.json({ ok: true, error: 'internal' });
  }
}

/**
 * Lưu tin nhắn đến từ khách vào DB.
 * Không auto-reply ở đây — admin sẽ xem và trả lời thủ công qua admin UI.
 * (Auto-reply AI có thể thêm sau, dùng cùng pipeline với chatbot hiện tại.)
 */
async function handleIncomingMessage(event: ZaloWebhookEvent) {
  try {
    const supabase = createAdminClient();

    // Deduplicate: nếu zalo_msg_id đã tồn tại → bỏ qua (Zalo có thể retry)
    if (event.messageId) {
      const { data: existing } = await supabase
        .from('zalo_messages')
        .select('id')
        .eq('zalo_msg_id', event.messageId)
        .maybeSingle();
      if (existing) {
        console.log(`[zalo:webhook] duplicate msg_id=${event.messageId}, skipping`);
        return;
      }
    }

    // INSERT tin nhắn vào DB
    const { error } = await supabase.from('zalo_messages').insert({
      zalo_user_id: event.userId,
      display_name: event.displayName ?? null,
      direction: 'in',
      message_text: event.messageText || '[non-text message]',
      message_type: event.eventType === 'user_send_text' ? 'text' : event.eventType.replace('user_send_', ''),
      zalo_msg_id: event.messageId ?? null,
      status: 'received',
    });

    if (error) {
      console.error('[zalo:webhook] insert error:', error.message);
      return;
    }

    console.log(`[zalo:webhook] saved message from ${event.userId}: ${event.messageText?.slice(0, 50)}`);

    // Auto-reply (tùy chọn): Gửi tin nhắn xác nhận
    // Hiện tại TẮT — admin sẽ reply thủ công.
    // Để bật: set ZALO_OA_AUTO_REPLY=true trong env
    if (process.env.ZALO_OA_AUTO_REPLY === 'true') {
      const autoReply = 'Cảm ơn em đã nhắn tin! Bà Chủ sẽ trả lời em sớm nhé. 🌿';
      const { msgId, error: sendErr } = await sendZaloMessage(event.userId, autoReply);
      if (!sendErr && msgId) {
        await supabase.from('zalo_messages').insert({
          zalo_user_id: event.userId,
          display_name: null,
          direction: 'out',
          message_text: autoReply,
          message_type: 'text',
          zalo_msg_id: msgId,
          status: 'replied',
        });
      }
    }
  } catch (e) {
    console.error('[zalo:webhook] handleIncomingMessage exception:', e instanceof Error ? e.message : e);
  }
}

/**
 * Khi khách follow OA — gửi tin chào mừng.
 */
async function handleFollow(event: ZaloWebhookEvent) {
  try {
    const supabase = createAdminClient();

    // Lưu event follow như 1 message đặc biệt
    await supabase.from('zalo_messages').insert({
      zalo_user_id: event.userId,
      display_name: event.displayName ?? null,
      direction: 'in',
      message_text: '[followed OA]',
      message_type: 'follow',
      status: 'read', // Không cần reply
    });

    // Gửi tin chào mừng
    const welcomeMsg =
      'Chào em! 🌿\nEm đã follow Emerald Vault. Bà Chủ ở đây để tư vấn trang sức si Nhật vintage. Em cần tìm món gì cứ nhắn nhé!';
    const { msgId, error } = await sendZaloMessage(event.userId, welcomeMsg);
    if (!error && msgId) {
      await supabase.from('zalo_messages').insert({
        zalo_user_id: event.userId,
        display_name: null,
        direction: 'out',
        message_text: welcomeMsg,
        message_type: 'text',
        zalo_msg_id: msgId,
        status: 'replied',
      });
    }
  } catch (e) {
    console.error('[zalo:webhook] handleFollow exception:', e instanceof Error ? e.message : e);
  }
}

// GET endpoint — Zalo dùng để verify webhook URL (chỉ cần trả 200 + challenge)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const challenge = url.searchParams.get('hub.challenge') || '';
  return NextResponse.json({ challenge });
}