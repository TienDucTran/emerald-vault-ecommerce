// ChatPanel: container panel chứa messages + input + header (clear/close).
// Stateless về messages; state từ ChatWidget (useChat) truyền xuống.
'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { X, Trash2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { ChatWelcome } from './chat-welcome';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: UIMessage[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  error?: Error | null;
  onSend: (text: string) => void;
  onClear: () => void;
}

export function ChatPanel({ open, onClose, messages, status, error, onSend, onClear }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  return (
    <div
      className={cn(
        'fixed bottom-24 right-6 z-40 flex flex-col overflow-hidden',
        'h-[480px] w-[360px] max-w-[calc(100vw-3rem)]',
        'rounded-2xl border border-gold/30 bg-surface shadow-2xl',
        'lg:bottom-28 lg:right-8',
        'transition-all duration-200 origin-bottom-right',
        open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
      )}
    >
      <div className="flex items-center justify-between border-b border-gold/20 bg-surface-emerald/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20">
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-gold">Bà Chủ Tiệm</h3>
            <p className="text-[10px] text-text-muted">Tư vấn trang sức si Nhật</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Xóa cuộc trò chuyện"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-all hover:bg-gold/10 hover:text-gold"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-all hover:bg-gold/10 hover:text-gold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gradient-to-b from-background/50 to-surface/30 py-2"
      >
        {messages.length === 0 ? (
          <ChatWelcome onSuggest={onSend} />
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin text-gold" />
                <span>Bà Chủ đang soạn...</span>
              </div>
            )}
            {error && (
              <div className="mx-3 my-2 rounded-lg border border-error/30 bg-error/10 p-2 text-xs text-error">
                Đã có lỗi. Vui lòng thử lại hoặc liên hệ admin.
              </div>
            )}
          </div>
        )}
      </div>

      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
