'use client';

import { useEffect, useState } from 'react';

/**
 * Hook đếm ngược từ 1 expiresAt (epoch ms).
 * - Trả về ms còn lại (>0) hoặc 0.
 * - Tick mỗi giây.
 */
export function useCountdown(expiresAt: number | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (!expiresAt) return 0;
  return Math.max(0, expiresAt - now);
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
