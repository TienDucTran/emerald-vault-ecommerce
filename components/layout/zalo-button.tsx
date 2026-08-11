'use client';

import { useEffect, useState } from 'react';
import { ZaloIcon } from './zalo-icon';

/**
 * Floating "Chat Zalo" button — hiển thị cạnh chat bubble.
 * Lấy SĐT Zalo từ /api/settings, mở https://zalo.me/{sdt} khi click.
 * Ẩn nếu không có contact_zalo.
 */
export function ZaloButton() {
  const [zaloPhone, setZaloPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) {
          const zalo = json.data?.contact_zalo;
          if (zalo && zalo.trim()) {
            if (!cancelled) setZaloPhone(zalo.trim());
          }
        }
      } catch {
        // ignore — không hiển thị nút nếu lỗi
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Đang load hoặc không có Zalo → không render
  if (loading || !zaloPhone) return null;

  // Normalize: strip spaces/dashes, ensure leading 0 or +84
  const normalized = zaloPhone.replace(/[\s.-]/g, '');
  const href = `https://zalo.me/${normalized}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat qua Zalo"
      className="fixed bottom-20 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-transparent shadow-lg transition-transform hover:scale-110 sm:left-6 lg:bottom-28"
    >
      {/* Logo Zalo chính thức (squircle xanh built-in) */}
      <ZaloIcon className="h-12 w-12 drop-shadow-sm" />
    </a>
  );
}