// lib/zalo/config.ts
// Zalo OA API configuration — đọc từ env vars, kiểm tra configured status.
//
// Yêu cầu env vars (thêm vào .env.local):
//   ZALO_OA_ID           — OA ID (từ Zalo OA dashboard)
//   ZALO_OA_ACCESS_TOKEN  — Access token (hết hạn sau 90 ngày, cần refresh)
//   ZALO_OA_REFRESH_TOKEN — Refresh token
//   ZALO_OA_SECRET_KEY    — Secret key để verify webhook signature (mac)
//
// Tham khảo API: https://developers.zalo.me/docs/api/official-account-api-ns

export function getZaloConfig() {
  return {
    oaId: process.env.ZALO_OA_ID || '',
    accessToken: process.env.ZALO_OA_ACCESS_TOKEN || '',
    refreshToken: process.env.ZALO_OA_REFRESH_TOKEN || '',
    secretKey: process.env.ZALO_OA_SECRET_KEY || '',
    isConfigured: !!(
      process.env.ZALO_OA_ID &&
      process.env.ZALO_OA_ACCESS_TOKEN &&
      process.env.ZALO_OA_SECRET_KEY
    ),
  };
}

/**
 * Lấy base URL của Zalo OA API.
 * Production: https://openapi.zalo.me
 * Sandbox: https://openapi.zalo.me (Zalo không có sandbox riêng, dùng production với OA test)
 */
export const ZALO_API_BASE = 'https://openapi.zalo.me';

/**
 * Endpoint gửi tin nhắn text đến user.
 * POST /v3.0/oa/message
 */
export const ZALO_SEND_MESSAGE_ENDPOINT = '/v3.0/oa/message';

/**
 * Endpoint lấy profile user.
 * POST /v3.0/oa/user
 */
export const ZALO_GET_USER_ENDPOINT = '/v3.0/oa/user';

/**
 * Endpoint refresh access token.
 * POST /v3.0/oa/access_token
 */
export const ZALO_REFRESH_TOKEN_ENDPOINT = '/v3.0/oa/access_token';