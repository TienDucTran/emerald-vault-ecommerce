// ChatMessage: render 1 message (text + product cards từ tool results)
// Dùng trong ChatPanel; hỗ trợ cả user và assistant messages,
// hiển thị pending tool invocations + product cards từ tool results.
'use client';

import { useMemo } from 'react';
import type { UIMessage } from 'ai';
import { Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatProductCard } from './chat-product-card';
import { ChatCollectionCard } from './chat-collection-card';

interface ChatMessageProps {
  message: UIMessage;
}

const TOOL_LABELS: Record<string, string> = {
  searchProducts: 'Bà Chủ đang tìm trong kho...',
  semanticSearch: 'Bà Chủ đang lục tìm...',
  getProductDetail: 'Bà Chủ đang xem chi tiết...',
  getCurrentCollections: 'Bà Chủ đang lật catalog mùa...',
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const toolProducts = useMemo(() => {
    if (!message.parts) return [];
    const products: any[] = [];
    for (const part of message.parts) {
      if (part.type === 'tool-invocation' && (part as any).toolName) {
        const inv = part as any;
        if (inv.state === 'result' && Array.isArray(inv.result)) {
          for (const item of inv.result) {
            if (
              item &&
              item.id &&
              item.slug &&
              item.title &&
              item.price !== undefined &&
              item.price !== null
            ) {
              products.push(item);
            }
          }
        }
      }
    }
    const seen = new Set<string>();
    return products.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [message.parts]);

  const toolCollections = useMemo(() => {
    if (!message.parts) return [];
    const cols: any[] = [];
    for (const part of message.parts) {
      if (part.type === 'tool-invocation' && (part as any).toolName) {
        const inv = part as any;
        if (inv.state === 'result' && Array.isArray(inv.result)) {
          for (const item of inv.result) {
            if (
              item &&
              item.id &&
              item.slug &&
              (item.cover_image_url || item.name)
            ) {
              cols.push(item);
            }
          }
        }
      }
    }
    const seen = new Set<string>();
    return cols.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [message.parts]);

  const text = useMemo(() => {
    if (!message.parts) return '';
    return message.parts
      .filter((p: any) => p.type === 'text' && typeof p.text === 'string')
      .map((p: any) => p.text)
      .join('\n');
  }, [message.parts]);

  const pendingTools = useMemo(() => {
    if (!message.parts) return [];
    return message.parts
      .filter((p: any) => p.type === 'tool-invocation' && p.state !== 'result')
      .map((p: any) => p.toolName);
  }, [message.parts]);

  return (
    <div
      className={cn(
        'flex w-full gap-2 px-3 py-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-surface-emerald text-text-base'
            : 'bg-gold/15 text-gold'
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-2 rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'bg-gold/15 text-text-base rounded-tr-sm'
            : 'bg-surface/80 text-text-base rounded-tl-sm border border-gold/20'
        )}
      >
        {pendingTools.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] italic text-text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            {pendingTools.map((t) => TOOL_LABELS[t] || `Đang dùng ${t}...`).join(' • ')}
          </div>
        )}

        {text && (
          <div className="whitespace-pre-wrap break-words leading-relaxed">{text}</div>
        )}

        {toolProducts.length > 0 && (
          <div className="mt-1 flex flex-col gap-1.5">
            {toolProducts.slice(0, 5).map((p) => (
              <ChatProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {toolCollections.length > 0 && (
          <div className="mt-1 flex flex-col gap-1.5">
            {toolCollections.slice(0, 5).map((c) => (
              <ChatCollectionCard key={c.id} collection={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
