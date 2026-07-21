// Client hook cho chat sessionId (flows.md §15.7)
'use client';

import { useEffect, useState } from 'react';

const COOKIE_NAME = 'ev_client_id';

/**
 * Hook trả về sessionId cho chat session.
 * - SSR: trả null
 * - Client mount: đọc cookie `ev_client_id` (set bởi /api/chat hoặc useAnonymousId)
 * - Nếu chưa có, generate UUID v4 bằng crypto.randomUUID() và lưu vào cookie
 *   (KHÔNG httpOnly, để client đọc được; cùng giá trị server sẽ dùng)
 */
export function useChatSession(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Read cookie
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    let value = cookie?.split('=')[1];

    // Generate if missing
    if (!value) {
      value = crypto.randomUUID();
      // Set cookie (client-side; 1 năm, lax)
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${oneYear}; SameSite=Lax`;
    }

    setSessionId(value);
  }, []);

  return sessionId;
}
