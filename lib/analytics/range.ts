/**
 * Shared analytics range helpers.
 *
 * `AnalyticsRange` chấp nhận 2 dạng input:
 *   1. ISO date "yyyy-MM-dd" (vd: "2026-07-10")
 *   2. GA4 relative tokens: "today" | "yesterday" | "NdaysAgo" (vd: "7daysAgo")
 *
 * `expandRange()` resolve về { start: Date; end: Date } với bounds:
 *   - start: 00:00:00.000Z của ngày start
 *   - end:   23:59:59.999Z của ngày end
 *
 * Dùng chung cho cả Supabase orders queries (cần ISO Date) lẫn nơi nào cần
 * Date object. GA4 Data API nhận relative token trực tiếp nên KHÔNG cần
 * expand trước khi gọi GA4 — chỉ cần expand khi query DB.
 */
export interface AnalyticsRange {
  startDate: string;
  endDate: string;
}

export interface ResolvedRange {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const N_DAYS_AGO_RE = /^(\d+)daysAgo$/;

export function expandRange(range: AnalyticsRange): ResolvedRange {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const resolveOne = (s: string, isEnd: boolean): Date => {
    if (ISO_DATE_RE.test(s)) {
      return new Date(
        `${s}T${isEnd ? '23:59:59.999' : '00:00:00.000'}Z`
      );
    }
    if (s === 'today') {
      if (isEnd) {
        return new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate(),
            23,
            59,
            59,
            999
          )
        );
      }
      return today;
    }
    if (s === 'yesterday') {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - 1);
      if (isEnd) {
        d.setUTCHours(23, 59, 59, 999);
      }
      return d;
    }
    const m = s.match(N_DAYS_AGO_RE);
    if (m) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - Number(m[1]));
      if (isEnd) {
        d.setUTCHours(23, 59, 59, 999);
      }
      return d;
    }
    throw new Error(`Invalid range token: ${s}`);
  };

  const start = resolveOne(range.startDate, false);
  const end = resolveOne(range.endDate, true);
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
