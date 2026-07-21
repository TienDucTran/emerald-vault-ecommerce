'use client';

import { Sparkles } from 'lucide-react';

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
            className="rounded-lg border border-gold/20 bg-surface/50 px-3 py-2 text-left text-xs text-text-base transition-all hover:border-gold/50 hover:bg-surface-emerald"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
