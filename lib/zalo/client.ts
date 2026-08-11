// lib/zalo/client.ts
// Zalo OA API client — gửi tin nhắn, lấy profile user, verify webhook signature.
//
// Tài liệu API: https://developers.zalo.me/docs/api/official-account-api-ns
// Sử dụng fetch (Node.js 18+ built-in), không cần axios.

import {
  getZaloConfig,
  ZALO_API_BASE,
  ZALO_SEND_MESSAGE_ENDPOINT,
  ZALO_GET_USER_ENDPOINT,
} from './config';

/**
 * Gửi tin nhắn text đến user qua Zalo OA.
 * @param userId Zalo user ID (số điện thoại hoặc user_id do Zalo assign)
 * @param text Nội dung tin nhắn
 * @returns Zalo message ID nếu thành công, null nếu thất bại
 */
export async function sendZaloMessage(
  userId: string,
  text: string
): Promise<{ msgId: string | null; error: string | null }> {
  const config = getZaloConfig();
  if (!config.isConfigured) {
    return { msgId: null, error: 'Zalo OA chưa cấu hình (thiếu env vars)' };
  }

  try {
    const body = {
      recipient: { user_id: userId },
      message: { text },
    };

    const res = await fetch(`${ZALO_API_BASE}${ZALO_SEND_MESSAGE_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: config.accessToken,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      console.error('[zalo:sendZaloMessage] HTTP error:', res.status, errText);
      return { msgId: null, error: `HTTP ${res.status}: ${errText}` };
    }

    const data = await res.json().catch(() => null);
    // Zalo API response: { error: 0, message: "Success", data: { message_id } }
    if (data?.error !== 0) {
      console.error('[zalo:sendZaloMessage] API error:', data?.message || data);
      return { msgId: null, error: data?.message || 'Zalo API error' };
    }

    return { msgId: data?.data?.message_id ?? null, error: null };
  } catch (e) {
    console.error('[zalo:sendZaloMessage] exception:', e instanceof Error ? e.message : e);
    return { msgId: null, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Lấy profile user (display_name, avatar) từ Zalo user ID.
 * @param userId Zalo user ID
 */
export async function getZaloUserProfile(
  userId: string
): Promise<{ displayName: string | null; avatar: string | null; error: string | null }> {
  const config = getZaloConfig();
  if (!config.isConfigured) {
    return { displayName: null, avatar: null, error: 'Zalo OA chưa cấu hình' };
  }

  try {
    const body = { user_id: userId, fields: ['display_name', 'avatars'] };

    const res = await fetch(`${ZALO_API_BASE}${ZALO_GET_USER_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: config.accessToken,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      console.error('[zalo:getZaloUserProfile] HTTP error:', res.status, errText);
      return { displayName: null, avatar: null, error: `HTTP ${res.status}` };
    }

    const data = await res.json().catch(() => null);
    if (data?.error !== 0) {
      return { displayName: null, avatar: null, error: data?.message || 'Zalo API error' };
    }

    const userData = data?.data?.user_info ?? {};
    return {
      displayName: userData.display_name ?? userData.displayName ?? null,
      avatar: userData.avatars?.[0] ?? null,
      error: null,
    };
  } catch (e) {
    console.error('[zalo:getZaloUserProfile] exception:', e instanceof Error ? e.message : e);
    return { displayName: null, avatar: null, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Verify webhook signature từ Zalo.
 * Zalo gửi header `X-ZEvent-Signature` = HMAC-SHA256 của body với secret key.
 *
 * @param body Raw request body (string)
 * @param signature Header X-ZEvent-Signature
 * @returns true nếu signature hợp lệ
 */
export async function verifyZaloWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const config = getZaloConfig();
  if (!config.secretKey) {
    console.warn('[zalo:verifyWebhookSignature] no secret key configured');
    return false;
  }

  try {
    // Node.js 18+ built-in crypto
    const crypto = await import('crypto');
    const expected = crypto
      .createHmac('sha256', config.secretKey)
      .update(body)
      .digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch (e) {
    console.error('[zalo:verifyWebhookSignature] exception:', e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Parse webhook event từ Zalo OA.
 * Event types: user_send_text, user_send_image, user_send_link, follow, unfollow
 *
 * @param body Parsed JSON body từ webhook
 * @returns Normalized event object
 */
export interface ZaloWebhookEvent {
  eventType: string;
  userId: string;
  displayName?: string;
  messageText?: string;
  messageId?: string;
  raw: unknown;
}

export function parseZaloWebhookEvent(body: any): ZaloWebhookEvent | null {
  if (!body || typeof body !== 'object') return null;

  // Zalo webhook event format:
  // {
  //   "event_name": "user_send_text",
  //   "message": { "text": "...", "msg_id": "..." },
  //   "sender": { "id": "user_id", "display_name": "..." },
  //   "recipient": { "id": "oa_id" }
  // }

  const eventName = body.event_name || body.eventName;
  const senderId = body.sender?.id || body.user_id;
  if (!eventName || !senderId) return null;

  return {
    eventType: eventName,
    userId: String(senderId),
    displayName: body.sender?.display_name,
    messageText: body.message?.text,
    messageId: body.message?.msg_id,
    raw: body,
  };
}