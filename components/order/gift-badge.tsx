/**
 * GiftBadge — pill badge highlight sản phẩm được tặng (BOGO reward).
 * Dùng trong: order detail (customer + account + admin), checkout summary.
 *
 * Hiển thị "QUÀ TẶNG" + tên rule (nếu có) + giá gạch ngang 0đ.
 */

import { Gift } from 'lucide-react';
import { BOGO_RULE_LABELS } from '@/lib/gamification/rules';

interface GiftBadgeProps {
  /** rule_code của gift (vd: BUY4GET1) — optional, hiển thị label nếu có */
  ruleCode?: string | null;
  /** Size variant: sm cho admin table, md cho customer cards */
  size?: 'sm' | 'md';
  /** className override */
  className?: string;
}

export function GiftBadge({ ruleCode, size = 'md', className = '' }: GiftBadgeProps) {
  const label = ruleCode ? BOGO_RULE_LABELS[ruleCode] ?? null : null;
  const sizing =
    size === 'sm'
      ? 'gap-1 px-1.5 py-0.5 text-[9px]'
      : 'gap-1.5 px-2.5 py-1 text-[10px]';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border border-gold/50 bg-gradient-to-r from-gold/20 to-gold-champagne/10 font-heading uppercase tracking-wider text-gold ${sizing} ${className}`}
    >
      <Gift className={`${iconSize} shrink-0`} />
      <span className="font-bold">Quà tặng</span>
      {label && <span className="hidden sm:inline opacity-70">· {label}</span>}
    </span>
  );
}