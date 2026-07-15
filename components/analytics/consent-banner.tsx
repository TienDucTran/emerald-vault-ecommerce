'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'ev_cookie_consent';

type ConsentValue = 'granted' | 'denied';

function persist(value: ConsentValue) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage unavailable — silent
  }
  // gtag is defined in a beforeInteractive <Script> in (store)/layout.tsx
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') {
    gtag('consent', 'update', { analytics_storage: value });
  }
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    if (stored === 'granted' || stored === 'denied') return;
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const accept = () => {
    persist('granted');
    setVisible(false);
  };
  const decline = () => {
    persist('denied');
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Thông báo sử dụng cookie"
      className="motion-safe:animate-fadeInUp fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-gold/40 bg-surface/95 p-4 text-sm text-text-base shadow-2xl backdrop-blur"
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={decline}
        className="absolute right-2 top-2 text-text-muted hover:text-gold"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="mb-3 pr-4 leading-relaxed">
        Chúng tôi sử dụng cookie để phân tích lưu lượng và cải thiện trải nghiệm của bạn.
        Theo Nghị định 13/2023/NĐ-CP, bạn có thể chấp nhận hoặc từ chối.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={accept}
          className="flex-1 rounded-md bg-gradient-gold px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
        >
          Chấp nhận
        </button>
        <button
          type="button"
          onClick={decline}
          className="flex-1 rounded-md border border-gold/40 px-4 py-2 text-xs font-medium text-gold transition hover:bg-gold/10"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}
