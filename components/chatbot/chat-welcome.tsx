'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ZaloIcon } from '@/components/layout/zalo-icon';

interface ChatWelcomeProps {
  onSuggest: (question: string) => void;
}

const SUGGESTIONS = [
  'Có nhẫn bạc 925 dưới 2 triệu không?',
  'Bộ sưu tập mùa hè 2026 có gì?',
  'Nhẫn mệnh Kim nên chọn chất liệu gì?',
  'Phân biệt tier SSS và SS như thế nào?',
];

export function ChatWelcome({ onSuggest }: ChatWelcomeProps) {
  const [zaloLink, setZaloLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) {
          const zalo = json.data?.contact_zalo;
          if (zalo && zalo.trim()) {
            if (!cancelled) setZaloLink(`https://zalo.me/${zalo.replace(/[\s.-]/g, '')}`);
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
        <Sparkles className="h-6 w-6 text-gold" />
      </div>
      <div>
        <h3 className="font-heading text-base font-semibold text-gold">
          Xin chào, Bà Chủ Tiệm xin hỗ trợ!
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          Hỏi em về trang sức si Nhật, giá cả, hay bộ sưu tập mới nhất nhé.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSuggest(q)}
            className="rounded-lg border border-gold/20 bg-surface/50 px-3 py-2 text-left text-xs text-text-base motion-safe:transition-all hover:border-gold/50 hover:bg-surface-emerald"
          >
            {q}
          </button>
        ))}
      </div>
      {zaloLink && (
        <a
          href={zaloLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gold/30 bg-surface/50 px-3 py-2 text-xs font-medium text-gold/80 motion-safe:transition-all hover:border-gold hover:bg-surface-emerald hover:text-gold"
        >
          <ZaloIcon variant="mono" className="h-4 w-4" />
          Tư vấn trực tiếp qua Zalo
        </a>
      )}
    </div>
  );
}