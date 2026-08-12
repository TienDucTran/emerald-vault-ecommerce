/**
 * Shipping + Timeline helpers
 * Carrier tracking URL generation + timeline event metadata
 */

import {
  Package,
  CheckCircle2,
  Truck,
  XCircle,
  Wallet,
  Clock,
  Gift,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

// ─── Carrier Tracking URLs ─────────────────────────────────────────────────

export type Carrier = 'GHN' | 'GHTK' | 'VNPost' | 'JT' | 'OTHER';

export const CARRIER_LABELS: Record<string, string> = {
  GHN: 'Giao Hàng Nhanh (GHN)',
  GHTK: 'Giao Hàng Tiết Kiệm (GHTK)',
  VNPost: 'Bưu điện Việt Nam (VNPost)',
  JT: 'J&T Express',
  OTHER: 'Đơn vị khác',
};

/**
 * Auto-generate tracking URL từ carrier + tracking_number.
 * Nếu admin đã nhập tracking_url riêng → ưu tiên dùng cái đó.
 */
export function getTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined,
  trackingUrl?: string | null
): string | null {
  if (trackingUrl) return trackingUrl;
  if (!carrier || !trackingNumber) return null;

  const num = encodeURIComponent(trackingNumber);
  switch (carrier) {
    case 'GHN':
      return `https://ghn.vn/don-hang/${num}`;
    case 'GHTK':
      return `https://ghtk.vn/tra-cuu-don-hang?order_code=${num}`;
    case 'VNPost':
      return 'https://oss.vnpost.vn/tmcp-oss-web/web/tra-cuu-hanh-trinh-dich-vu';
    case 'JT':
      return `https://jtexpress.vn/tra-cuu-don-hang/${num}`;
    default:
      return null;
  }
}

export function getCarrierLabel(carrier: string | null | undefined): string {
  if (carrier && carrier in CARRIER_LABELS) {
    return CARRIER_LABELS[carrier];
  }
  return carrier ?? 'Đơn vị khác';
}

// ─── Timeline Event Metadata ───────────────────────────────────────────────

export const TIMELINE_EVENTS = [
  'ORDER_CREATED',
  'PAYMENT_CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUND_REQUESTED',
  'REFUND_APPROVED',
  'REFUND_COMPLETED',
] as const;

export type TimelineEvent = (typeof TIMELINE_EVENTS)[number];

export interface TimelineEventMeta {
  label: string;
  icon: LucideIcon;
  tone: 'gold' | 'success' | 'amber' | 'red' | 'blue' | 'muted';
}

export const TIMELINE_EVENT_META: Record<string, TimelineEventMeta> = {
  ORDER_CREATED: {
    label: 'Đơn hàng đã tạo',
    icon: Package,
    tone: 'blue',
  },
  PAYMENT_CONFIRMED: {
    label: 'Thanh toán xác nhận',
    icon: Wallet,
    tone: 'gold',
  },
  SHIPPED: {
    label: 'Đang giao hàng',
    icon: Truck,
    tone: 'amber',
  },
  DELIVERED: {
    label: 'Đã giao thành công',
    icon: CheckCircle2,
    tone: 'success',
  },
  CANCELLED: {
    label: 'Đơn hàng bị hủy',
    icon: XCircle,
    tone: 'red',
  },
  REFUND_REQUESTED: {
    label: 'Yêu cầu hoàn tiền',
    icon: RotateCcw,
    tone: 'amber',
  },
  REFUND_APPROVED: {
    label: 'Hoàn tiền đã duyệt',
    icon: Gift,
    tone: 'gold',
  },
  REFUND_COMPLETED: {
    label: 'Đã hoàn tiền',
    icon: CheckCircle2,
    tone: 'muted',
  },
};

export function getTimelineEventMeta(event: string): TimelineEventMeta {
  if (event in TIMELINE_EVENT_META) {
    return TIMELINE_EVENT_META[event];
  }
  return {
    label: event,
    icon: Clock,
    tone: 'muted',
  };
}

// ─── Timeline Row Type ─────────────────────────────────────────────────────

export interface OrderTimelineRow {
  id: string;
  order_id: string;
  event: string;
  description: string | null;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Insert Timeline Helper (server-side, admin client) ────────────────────

/**
 * Insert a timeline event row. Server-only — uses admin client.
 * Idempotent-ish: không có unique constraint, nhưng caller nên check trước
 * nếu muốn tránh duplicate (vd: SHIPPED chỉ log 1 lần).
 */
export async function logTimelineEvent(
  supabase: any,
  orderId: string,
  event: string,
  description?: string,
  actor: string = 'admin',
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('order_timeline').insert({
    order_id: orderId,
    event,
    description: description ?? null,
    actor,
    metadata: metadata ?? null,
  });

  if (error) {
    console.error('[logTimelineEvent] insert error:', error.message);
  }
}