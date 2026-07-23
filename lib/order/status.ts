// Shared order status helpers — dùng chung cho cả public lookup, customer detail, order list.
//
// Bug history: trước đây mỗi trang tự định nghĩa STATUS_MAP riêng, dễ bị lệch nhau.
// Đặc biệt là WAITING_PAYMENT và WAITING_CONFIRM bị thiếu → khi user ấn "Tôi đã chuyển"
// → DB set WAITING_CONFIRM → UI fallback về NEW ("MỚI") hoặc không render.

import {
  Package,
  CheckCircle2,
  Truck,
  XCircle,
  Wallet,
  Loader2,
  Clock,
  type LucideIcon,
} from 'lucide-react';

export const ORDER_STATUSES = [
  'NEW',
  'WAITING_PAYMENT',
  'WAITING_CONFIRM',
  'CONFIRMED',
  'SHIPPING',
  'DONE',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type StatusTone = 'gold' | 'success' | 'amber' | 'red' | 'blue' | 'muted';

export interface OrderStatusMeta {
  /** Label ngắn (dùng cho badge/pill) — thường IN HOA. */
  label: string;
  /** Label dài (dùng cho header H2 hoặc banner) — Title Case. */
  fullLabel: string;
  /** Tone màu cho badge. */
  tone: StatusTone;
  /** Icon cho list / status card. */
  icon: LucideIcon;
  /** Tailwind text color class cho "Trạng thái" label. */
  textColor: string;
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  NEW: {
    label: 'MỚI TẠO',
    fullLabel: 'Mới tạo',
    tone: 'blue',
    icon: Package,
    textColor: 'text-info',
  },
  WAITING_PAYMENT: {
    label: 'CHỜ THANH TOÁN',
    fullLabel: 'Chờ thanh toán',
    tone: 'gold',
    icon: Wallet,
    textColor: 'text-gold',
  },
  WAITING_CONFIRM: {
    label: 'CHỜ XÁC NHẬN',
    fullLabel: 'Đang chờ admin xác nhận',
    tone: 'amber',
    icon: Loader2,
    textColor: 'text-warning',
  },
  CONFIRMED: {
    label: 'ĐÃ XÁC NHẬN',
    fullLabel: 'Đã xác nhận',
    tone: 'success',
    icon: CheckCircle2,
    textColor: 'text-success',
  },
  SHIPPING: {
    label: 'ĐANG GIAO',
    fullLabel: 'Đang giao',
    tone: 'amber',
    icon: Truck,
    textColor: 'text-warning',
  },
  DONE: {
    label: 'HOÀN TẤT',
    fullLabel: 'Hoàn tất',
    tone: 'success',
    icon: CheckCircle2,
    textColor: 'text-success',
  },
  CANCELLED: {
    label: 'ĐÃ HỦY',
    fullLabel: 'Đã hủy',
    tone: 'red',
    icon: XCircle,
    textColor: 'text-error',
  },
};

/**
 * Tailwind classes cho badge pill — dùng cho OrderCard (customer order list).
 * Tách riêng khỏi TONE_CLASS ở page detail vì page detail dùng border + bg + text
 * với độ đậm khác (gradient gold), còn OrderCard dùng pill nhỏ gọn với màu tint.
 */
export const ORDER_STATUS_PILL: Record<OrderStatus, string> = {
  NEW: 'bg-info/15 text-info border-info/30',
  WAITING_PAYMENT: 'bg-gold/15 text-gold border-gold/30',
  WAITING_CONFIRM: 'bg-warning/15 text-warning border-warning/30',
  CONFIRMED: 'bg-success/15 text-success border-success/30',
  SHIPPING: 'bg-warning/15 text-warning border-warning/30',
  DONE: 'bg-success/15 text-success border-success/30',
  CANCELLED: 'bg-error/15 text-error border-error/30',
};

/**
 * Tailwind classes cho badge với border + bg + text — dùng cho header pill lớn
 * ở page detail (Stitch redesign). Tone 'gold' có gradient ấm hơn, các tone khác
 * giữ phẳng.
 */
export const ORDER_STATUS_TONE_BADGE: Record<StatusTone, string> = {
  gold: 'border-gold/30 bg-gold/10 text-gold',
  success: 'border-success/30 bg-success/10 text-success',
  amber: 'border-warning/30 bg-warning/10 text-warning',
  red: 'border-error/30 bg-error/10 text-error',
  blue: 'border-info/30 bg-info/10 text-info',
  muted: 'border-gold/20 bg-surface text-text-muted',
};

/**
 * Tailwind dot/indicator bg color (1 hình tròn nhỏ) cho từng payment tone.
 * Dùng cho dot cạnh payment status label trong trang detail, hoặc pulse dot
 * trong card. Tone 'blue' cũng được map (cho order status có tone blue như NEW).
 */
export const TONE_DOT_BG: Record<StatusTone, string> = {
  gold: 'bg-gold',
  success: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-error',
  blue: 'bg-info',
  muted: 'bg-text-muted',
};

/**
 * Helper lấy dot bg color từ tone string (bao gồm fallback).
 */
export function toneToDotBg(tone: string | null | undefined): string {
  if (tone && tone in TONE_DOT_BG) {
    return TONE_DOT_BG[tone as StatusTone];
  }
  return TONE_DOT_BG.muted;
}

/**
 * Resolve status từ string bất kỳ (kể cả giá trị lạ từ API) về meta.
 * Fallback về 1 entry "UNKNOWN" tổng quát để UI không crash.
 */
export function getOrderStatusMeta(status: string | null | undefined): OrderStatusMeta {
  if (status && status in ORDER_STATUS_META) {
    return ORDER_STATUS_META[status as OrderStatus];
  }
  return {
    label: status ? status.toUpperCase() : 'KHÔNG XÁC ĐỊNH',
    fullLabel: status ?? 'Không xác định',
    tone: 'muted',
    icon: Clock,
    textColor: 'text-text-muted',
  };
}

export function getOrderStatusPill(status: string | null | undefined): string {
  if (status && status in ORDER_STATUS_PILL) {
    return ORDER_STATUS_PILL[status as OrderStatus];
  }
  return 'border-gold/20 bg-surface text-text-muted';
}

// --- Payment status helpers ---

export const PAYMENT_STATUSES = [
  'PENDING',
  'AWAITING_CONFIRM',
  'PAID',
  'FAILED',
  'REFUNDED',
  'REFUND_REQUESTED',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Chờ thanh toán', tone: 'amber' },
  AWAITING_CONFIRM: { label: 'Chờ xác nhận CK', tone: 'gold' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  FAILED: { label: 'Thanh toán thất bại', tone: 'red' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'muted' },
  REFUND_REQUESTED: { label: 'Yêu cầu hoàn tiền', tone: 'amber' },
};

export function getPaymentStatusMeta(
  status: string | null | undefined
): { label: string; tone: StatusTone; textColor: string } {
  if (status && status in PAYMENT_STATUS_META) {
    const meta = PAYMENT_STATUS_META[status as PaymentStatus];
    const textColor =
      meta.tone === 'success' ? 'text-success' :
      meta.tone === 'red' ? 'text-error' :
      meta.tone === 'amber' ? 'text-warning' :
      'text-text-muted';
    return { ...meta, textColor };
  }
  return { label: status ?? 'Không xác định', tone: 'muted', textColor: 'text-text-muted' };
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  MOMO: 'Ví MoMo',
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK_TRANSFER: 'Chuyển khoản Ngân hàng',
};

export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (method && method in PAYMENT_METHOD_LABEL) {
    return PAYMENT_METHOD_LABEL[method];
  }
  return method ?? 'Không xác định';
}
