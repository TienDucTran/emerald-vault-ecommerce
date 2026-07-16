/**
 * GA4 Data API query wrappers — typed helpers cho admin/analytics page.
 *
 * Mỗi helper trả về số liệu trong 1 range (mặc định 7 ngày gần nhất so với
 * `today` property timezone, để khớp với chart mà GA4 dashboard hiển thị).
 *
 * Khi GA4 chưa configure hoặc query fail, helper trả `null` để caller
 * fallback về mock data. KHÔNG throw để tránh làm vỡ toàn bộ page.
 */
import { getGA4Client, getGA4PropertyId } from './ga4';

const DEFAULT_RANGE_DAYS = 7;

export interface DateRange {
  /** ISO date (yyyy-MM-dd) hoặc 'today' | 'yesterday' | 'NdaysAgo'. */
  startDate: string;
  endDate: string;
}

export function defaultRange(days = DEFAULT_RANGE_DAYS): DateRange {
  return {
    startDate: `${days}daysAgo`,
    endDate: 'today',
  };
}

export function previousRange(days = DEFAULT_RANGE_DAYS): DateRange {
  return {
    startDate: `${days * 2}daysAgo`,
    endDate: `${days + 1}daysAgo`,
  };
}

/** Đọc 1 metric duy nhất, trả về tổng (đã parse từ string GA4 trả về). */
async function runSingleMetric(
  range: DateRange,
  metric: string
): Promise<number | null> {
  const client = getGA4Client();
  const property = getGA4PropertyId();
  if (!client || !property) return null;

  try {
    const [response] = await client.runReport({
      property,
      dateRanges: [range],
      metrics: [{ name: metric }],
    });
    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    if (value === undefined || value === null) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (err) {
    console.error(`[ga4] runSingleMetric(${metric}) failed:`, err);
    return null;
  }
}

export async function getSessions(range: DateRange): Promise<number | null> {
  return runSingleMetric(range, 'sessions');
}

export async function getEventCount(range: DateRange): Promise<number | null> {
  return runSingleMetric(range, 'eventCount');
}

/**
 * Key events = conversions đã mark là "key event" trong GA4 UI.
 * Nếu property chưa đánh dấu event nào, GA4 sẽ trả 0 — KHÔNG phải lỗi.
 */
export async function getKeyEvents(range: DateRange): Promise<number | null> {
  return runSingleMetric(range, 'conversions');
}

export async function getNewUsers(range: DateRange): Promise<number | null> {
  return runSingleMetric(range, 'newUsers');
}

export async function getTotalUsers(range: DateRange): Promise<number | null> {
  return runSingleMetric(range, 'totalUsers');
}

export async function getEngagedSessions(
  range: DateRange
): Promise<number | null> {
  return runSingleMetric(range, 'engagedSessions');
}

export async function getBounceRate(range: DateRange): Promise<number | null> {
  const value = await runSingleMetric(range, 'bounceRate');
  // GA4 trả tỉ lệ 0..1 (0.423 = 42.3%).
  return value === null ? null : value;
}

/**
 * Tính % delta so với period trước.
 * Trả về null nếu thiếu data; nếu prev = 0 → trả null (tránh chia 0).
 */
export function pctDelta(current: number | null, prev: number | null): number | null {
  if (current === null || prev === null) return null;
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

/**
 * Realtime API — số user active trong 30 phút qua.
 * Dùng `runRealtimeReport` (GA4 realtime, chỉ work với property đã enable
 * GA4 reporting — GA4 mặc định bật nên ổn).
 *
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runRealtime
 */
export async function getActiveUsers30m(): Promise<number | null> {
  const client = getGA4Client();
  const property = getGA4PropertyId();
  if (!client || !property) return null;

  try {
    const [response] = await client.runRealtimeReport({
      property,
      metrics: [{ name: 'activeUsers' }],
    });
    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    if (value === undefined || value === null) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (err) {
    console.error('[ga4] getActiveUsers30m failed:', err);
    return null;
  }
}

/**
 * Sessions theo ngày — dùng cho time-series chart trên page.
 * Trả array [{ date: '2026-07-10', sessions: 1 }, ...] đã sort theo date ASC.
 */
export interface DailySession {
  date: string;
  sessions: number;
}

export async function getSessionsByDay(
  range: DateRange
): Promise<DailySession[] | null> {
  const client = getGA4Client();
  const property = getGA4PropertyId();
  if (!client || !property) return null;

  try {
    const [response] = await client.runReport({
      property,
      dateRanges: [range],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    if (!response.rows) return [];
    return response.rows.map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
    }));
  } catch (err) {
    console.error('[ga4] getSessionsByDay failed:', err);
    return null;
  }
}

/**
 * Top pages theo pageViews — dùng cho "Top Performing Products" (best-effort
 * match URL /san-pham/[slug] với products table).
 */
export interface TopPage {
  path: string;
  views: number;
}

export async function getTopPages(
  range: DateRange,
  limit = 10
): Promise<TopPage[] | null> {
  const client = getGA4Client();
  const property = getGA4PropertyId();
  if (!client || !property) return null;

  try {
    const [response] = await client.runReport({
      property,
      dateRanges: [range],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit,
    });
    if (!response.rows) return [];
    return response.rows.map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? '',
      views: Number(row.metricValues?.[0]?.value ?? 0),
    }));
  } catch (err) {
    console.error('[ga4] getTopPages failed:', err);
    return null;
  }
}

/**
 * Sessions theo country — dùng cho card "Người dùng theo quốc gia"
 * (ở page admin hiện có 1 user từ Vietnam theo ảnh GA4).
 */
export interface CountrySession {
  country: string;
  sessions: number;
}

export async function getSessionsByCountry(
  range: DateRange,
  limit = 10
): Promise<CountrySession[] | null> {
  const client = getGA4Client();
  const property = getGA4PropertyId();
  if (!client || !property) return null;

  try {
    const [response] = await client.runReport({
      property,
      dateRanges: [range],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    });
    if (!response.rows) return [];
    return response.rows.map((row) => ({
      country: row.dimensionValues?.[0]?.value ?? '(unknown)',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
    }));
  } catch (err) {
    console.error('[ga4] getSessionsByCountry failed:', err);
    return null;
  }
}
