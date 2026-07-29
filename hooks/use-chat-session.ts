// Client hook cho chat sessionId (flows.md §15.7).
// Fix S9: per-tab sessionId để tránh conversation cross-contamination giữa các tab.
// Pattern:
//   - sessionId = per-tab UUID (sessionStorage) — UI state riêng cho từng tab.
//   - clientId  = cross-tab UUID (cookie) — server group messages cho cùng visitor.
'use client';

import { useEffect, useState } from 'react';

const TAB_ID_KEY = 'ev_chat_tab_id';
const COOKIE_NAME = 'ev_client_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  // Fallback cho browser cũ không có crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getTabId(): string {
  if (typeof window === 'undefined') return '';
  let tabId: string | null = null;
  try {
    tabId = window.sessionStorage.getItem(TAB_ID_KEY);
  } catch (err) {
    // sessionStorage có thể bị block (private mode, cookie banner) — fallback về in-memory.
    console.warn('[useChatSession] sessionStorage read failed:', err);
  }
  if (!tabId) {
    tabId = generateUUID();
    try {
      window.sessionStorage.setItem(TAB_ID_KEY, tabId);
    } catch (err) {
      console.warn('[useChatSession] sessionStorage write failed:', err);
    }
  }
  return tabId;
}

function readClientIdCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]+)')
  );
  return m?.[1] ?? null;
}

/**
 * Hook trả về sessionId per-tab + clientId cross-tab.
 * - SSR: trả về rỗng (mount mới populate).
 * - Client: sessionId từ sessionStorage (mỗi tab một UUID riêng).
 * - Client: clientId từ cookie `ev_client_id` (share giữa các tab).
 * - `ready=true` khi đã đọc xong cả hai — caller có thể dùng để gate network calls.
 */
export function useChatSession(): {
  sessionId: string | null;
  clientId: string | null;
  ready: boolean;
} {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Per-tab session ID (sessionStorage — không share giữa các tab).
    setSessionId(getTabId());

    // Cross-tab client ID (cookie — share giữa các tab để server group messages).
    setClientId(readClientIdCookie());

    setReady(true);
  }, []);

  return { sessionId, clientId, ready };
}