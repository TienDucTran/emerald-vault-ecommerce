/**
 * OrderTimeline — hiển thị timeline dọc cho đơn hàng.
 * Dùng chung cho cả admin order detail + customer order detail.
 */

import { Check, Circle } from 'lucide-react';
import { getTimelineEventMeta, type OrderTimelineRow } from '@/lib/order/timeline';
import { TONE_DOT_BG } from '@/lib/order/status';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export interface OrderTimelineProps {
  events: OrderTimelineRow[];
  /** Title for the section. Default: "TIẾN TRÌNH ĐƠN HÀNG" */
  title?: string;
}

export function OrderTimeline({ events, title = 'TIẾN TRÌNH ĐƠN HÀNG' }: OrderTimelineProps) {
  if (!events || events.length === 0) {
    return null;
  }

  // Sort mới nhất trước (DB đã order by created_at DESC, nhưng safety)
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <section className="border border-gold/10 bg-surface-emerald p-6">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="font-heading text-xs tracking-[0.15em] text-gold-champagne">
          {title}
        </h2>
      </div>
      <ol className="relative space-y-4 pl-6 border-l border-gold/20">
        {sorted.map((evt) => {
          const meta = getTimelineEventMeta(evt.event);
          const Icon = meta.icon;
          return (
            <li key={evt.id} className="relative">
              <span
                className={`absolute -left-[33px] top-0 inline-flex h-5 w-5 items-center justify-center rounded-full border ${TONE_DOT_BG[meta.tone]} border-transparent text-background`}
                aria-hidden
              >
                <Icon className="h-3 w-3" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text-base">
                  {meta.label}
                </span>
                {evt.description && (
                  <span className="text-xs text-text-muted">{evt.description}</span>
                )}
                <span className="text-[10px] text-text-muted/60">
                  {formatDate(evt.created_at)}
                  {evt.actor && evt.actor !== 'admin' && ` · ${evt.actor}`}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}