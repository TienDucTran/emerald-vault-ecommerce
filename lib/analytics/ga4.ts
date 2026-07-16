/**
 * GA4 Data API client (server-side, service account).
 *
 * Dùng trong API route handlers hoặc Server Components.
 * KHÔNG import trong Client Components.
 *
 * Auth strategy:
 *   - Ưu tiên `GA4_SERVICE_ACCOUNT_JSON` (string JSON, dễ deploy lên Vercel).
 *   - Fallback `GOOGLE_APPLICATION_CREDENTIALS` (path tới file JSON, dễ dev local).
 *
 * Env cần:
 *   - GA4_PROPERTY_ID: dạng số, ví dụ "123456789" (không phải "properties/123456789").
 *     Lấy từ GA4 Admin → Property column.
 *   - GA4_SERVICE_ACCOUNT_JSON: nội dung file JSON service account.
 *     Tạo tại https://console.cloud.google.com → IAM → Service Accounts.
 *     Cần grant quyền "Viewer" (hoặc cao hơn) cho property GA4 tương ứng.
 *
 * Tại sao dùng BetaAnalyticsDataClient: đây là SDK chính thức của Google cho
 * GA4 Data API v1 — chỉ chạy ở Node, không bundle vào client.
 */
import { BetaAnalyticsDataClient } from '@google-analytics/data';

type CredentialSource =
  | { kind: 'json'; credentialsJson: string }
  | { kind: 'file'; filename: string };

let cachedClient: BetaAnalyticsDataClient | null = null;
let cachedCreds: CredentialSource | null = null;

function loadCredentials(): CredentialSource | null {
  if (cachedCreds) return cachedCreds;

  const inline = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim().length > 0) {
    // Normalize: bỏ newline + collapse whitespace. Vercel UI đôi khi chèn
    // newline khi paste JSON, và Node env reader cũng dừng ở newline đầu tiên.
    // Whitespace giữa tokens là OK với JSON.parse; chỉ newline thật mới break.
    const normalized = inline.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
    cachedCreds = { kind: 'json', credentialsJson: normalized };
    return cachedCreds;
  }

  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (filePath && filePath.trim().length > 0) {
    cachedCreds = { kind: 'file', filename: filePath };
    return cachedCreds;
  }

  return null;
}

/**
 * Trả về BetaAnalyticsDataClient đã auth hoặc `null` nếu thiếu env.
 * Caller quyết định fallback (mock data) hay trả 503.
 */
export function getGA4Client(): BetaAnalyticsDataClient | null {
  if (cachedClient) return cachedClient;

  const creds = loadCredentials();
  if (!creds) return null;

  try {
    if (creds.kind === 'json') {
      const parsed = JSON.parse(creds.credentialsJson);
      cachedClient = new BetaAnalyticsDataClient({ credentials: parsed });
    } else {
      cachedClient = new BetaAnalyticsDataClient({ keyFilename: creds.filename });
    }
    return cachedClient;
  } catch (err) {
    console.error('[ga4] failed to init client:', err);
    return null;
  }
}

/**
 * Trả về property ID dạng `properties/{id}` (format GA4 Data API yêu cầu),
 * hoặc `null` nếu chưa configure.
 */
export function getGA4PropertyId(): string | null {
  const raw = process.env.GA4_PROPERTY_ID?.trim();
  if (!raw) return null;
  // GA4 Data API yêu cầu format "properties/{id}". Env user nhập chỉ số (vd "545819109")
  // là phổ biến nhất — auto-prefix nếu thiếu.
  return raw.startsWith('properties/') ? raw : `properties/${raw}`;
}

/** True nếu cả client + property đều sẵn sàng. */
export function isGA4Configured(): boolean {
  return getGA4Client() !== null && getGA4PropertyId() !== null;
}
