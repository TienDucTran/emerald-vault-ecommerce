// Client hook cho chat sessionId (flows.md §15.7)
'use client';

import { useState } from 'react';

const COOKIE_NAME = 'ev_client_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]+)')
  );
  return m?.[1] ?? null;
}

function writeCookie(v: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${v}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}

/**
 * Hook trả về sessionId cho chat session.
 * - SSR: trả '' (cookie không tồn tại server-side)
 * - Client: đọc cookie `ev_client_id` synchronously trong useState initializer
 *   → 1st POST đã có sessionId đúng, không bị split session (fix bug cũ).
 * - Nếu cookie thiếu, generate UUID v4 và set lại cookie cùng value với server.
 */
export function useChatSession(): string {
  const [sessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const existing = readCookie();
    if (existing && existing.length > 0) return existing;
    const fresh = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeCookie(fresh);
    return fresh;
  });
  return sessionId;
}
