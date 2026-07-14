'use client';

import { useEffect, useState } from 'react';

const COOKIE_NAME = 'ev_client_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 năm

function uuidv4(): string {
  // RFC4122 v4 (crypto.randomUUID có thể không có ở mọi nơi — dùng fallback)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

/**
 * Anonymous client id dùng cho inventory lock (gắn với cookie).
 * - Tạo 1 lần, persist qua cookie (1 năm).
 * - Trả về null ở SSR (chưa đọc được cookie) rồi hydrate lên client.
 */
export function useAnonymousId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    let existing = readCookie();
    if (!existing) {
      existing = uuidv4();
      writeCookie(existing);
    }
    setId(existing);
  }, []);

  return id;
}
