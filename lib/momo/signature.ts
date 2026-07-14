// MoMo signature — HMAC-SHA256 theo docs flows.md §7.4
//
// Lưu ý quan trọng về format:
// - Request signature: sort keys a-z, join bằng "&", PREFIX "accessKey=..."
//   (accessKey LUÔN đứng đầu, kể cả khi accessKey không phải key nhỏ nhất theo alphabet).
// - IPN signature: thứ tự cố định (KHÔNG sort), accessKey cũng đứng đầu.

import crypto from 'node:crypto';

function hmacSha256(raw: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

/**
 * Build signature cho request MoMo.
 * @param params Các tham số (KHÔNG bao gồm accessKey, signature)
 * @param accessKey
 * @param secretKey
 */
export function buildRequestSignature(
  params: Record<string, string | number>,
  accessKey: string,
  secretKey: string
): string {
  // 1. Sắp xếp các key còn lại theo alphabet
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  // 2. Prefix accessKey
  const raw = `accessKey=${accessKey}&${sorted}`;
  return hmacSha256(raw, secretKey);
}

/**
 * Verify signature từ MoMo IPN.
 * Thứ tự field cố định (theo docs), accessKey prefix.
 */
export function verifyIpnSignature(
  body: {
    accessKey?: string;
    amount: number | string;
    extraData: string;
    message: string;
    orderId: string;
    orderInfo: string;
    orderType: string;
    partnerCode: string;
    payType: string;
    requestId: string;
    responseTime: number | string;
    resultCode: number | string;
    transId: number | string;
    signature: string;
  },
  accessKey: string,
  secretKey: string
): boolean {
  const raw =
    `accessKey=${accessKey}` +
    `&amount=${body.amount}` +
    `&extraData=${body.extraData}` +
    `&message=${body.message}` +
    `&orderId=${body.orderId}` +
    `&orderInfo=${body.orderInfo}` +
    `&orderType=${body.orderType}` +
    `&partnerCode=${body.partnerCode}` +
    `&payType=${body.payType}` +
    `&requestId=${body.requestId}` +
    `&responseTime=${body.responseTime}` +
    `&resultCode=${body.resultCode}` +
    `&transId=${body.transId}`;

  const expected = hmacSha256(raw, secretKey);
  // constant-time compare
  return (
    expected.length === body.signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(body.signature))
  );
}
