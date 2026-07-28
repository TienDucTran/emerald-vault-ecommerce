// ChatWidget: root component, mount global, orchestrate ChatBubble + ChatPanel.
// Dùng fetch + ReadableStream để bypass useChat API (v1 vs v2 không tương thích).
// Parse đầy đủ AI SDK 2.x UI Message Stream format:
//   - start, start-step, finish-step, finish (control events)
//   - text-delta, text-end (text content)
//   - tool-input-available (tool call started, có input)
//   - tool-output-available (tool call finished, có output = result)
//   - error (stream error)
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatBubble } from './chat-bubble';
import { ChatPanel } from './chat-panel';
import { useChatSession } from '@/hooks/use-chat-session';
import { useJewelryAnalytics } from '@/hooks/use-jewelry-analytics';
import type { UIMessage } from 'ai';

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

function genId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isProductArray(x: unknown): x is any[] {
  return (
    Array.isArray(x) &&
    x.length > 0 &&
    typeof x[0] === 'object' &&
    x[0] !== null &&
    'id' in x[0] &&
    'slug' in x[0]
  );
}

function isCollectionArray(x: unknown): x is any[] {
  return (
    Array.isArray(x) &&
    x.length > 0 &&
    typeof x[0] === 'object' &&
    x[0] !== null &&
    'id' in x[0] &&
    'name' in x[0] &&
    'cover_image_url' in x[0]
  );
}

const CHAT_SEEN_KEY = 'ev_chat_seen';

/** Lấy tất cả product objects từ mọi assistant message trong lịch sử. */
function collectProductsFromHistory(messages: UIMessage[]): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    if (m.role !== 'assistant' || !m.parts) continue;
    for (const part of m.parts as any[]) {
      if (
        part.type === 'tool-invocation' &&
        part.state === 'result' &&
        Array.isArray(part.result)
      ) {
        for (const item of part.result) {
          if (item && item.id && item.slug && item.title && item.price != null) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              out.push(item);
            }
          }
        }
      }
    }
  }
  return out;
}

function normalizeContactType(raw: unknown): 'phone' | 'email' | 'zalo' | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (v === 'phone' || v === 'sdt' || v === 'tel' || v === 'mobile') return 'phone';
  if (v === 'email' || v === 'mail') return 'email';
  if (v === 'zalo') return 'zalo';
  return null;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const sessionId = useChatSession();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analytics = useJewelryAnalytics();

  // Track `chat_opened` khi bubble click flip false→true.
  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (prev) return false;
      if (typeof window !== 'undefined') {
        analytics.trackChatOpened(sessionId);
        try {
          window.localStorage.setItem(CHAT_SEEN_KEY, '1');
        } catch {
          // ignore — storage có thể bị block
        }
      }
      return true;
    });
  }, [analytics, sessionId]);

  // Track `chat_product_clicked` qua event delegation trên document.
  // ChatProductCard render `<a href="/san-pham/{slug}">` — match theo href,
  // tra cứu product trong toàn bộ `messages` state để lấy id + price.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      const match = href.match(/^\/san-pham\/([^/?#]+)/);
      if (!match) return;
      const slug = decodeURIComponent(match[1]);
      const allProducts = collectProductsFromHistory(messages);
      const found = allProducts.find((p) => p.slug === slug);
      if (!found) return;
      const price =
        typeof found.price === 'number'
          ? found.price
          : Number(found.price) || 0;
      analytics.trackChatProductClicked(found.id, slug, price, 'inline_card');
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [analytics, messages]);

  const handleSend = useCallback(
    async (text: string) => {
      // 1) Thêm user message
      const userMsg: UIMessage = {
        id: genId(),
        role: 'user',
        content: text,
        parts: [{ type: 'text', text }],
      } as any;
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setStatus('submitted');
      setError(null);

      // Track `chat_message_sent` ngay sau khi user message được append.
      // `has_product_in_history` check lịch sử TRƯỚC khi gửi (assistant cũ đã có product card).
      const hasProductInHistory = collectProductsFromHistory(messages).length > 0;
      analytics.trackChatMessageSent(sessionId, text, hasProductInHistory);

      // 2) Setup abort + fetch
      const controller = new AbortController();
      abortRef.current = controller;

      // Buffer để build assistant message
      const parts: any[] = [];
      let accumulatedText = '';
      const products = new Map<string, any>();
      const collections = new Map<string, any>();
      // Forward tool input → output để biết `captureLead` được gọi với contact_type nào.
      // Cũng dùng để detect `chat_lead_captured` event.
      const toolMeta = new Map<string, { toolName: string; input: any }>();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages,
            sessionId: sessionId || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.body) throw new Error('No response body');
        setStatus('streaming');

        // 3) Đọc SSE
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        // SSE events are separated by a blank line ("\n\n"). We buffer the
        // partial last-event between reads to handle multi-line `data:` payloads
        // correctly (e.g. JSON pretty-printed error containing newlines).
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const eventBlocks = buffer.split('\n\n');
          buffer = eventBlocks.pop() || '';

          for (const block of eventBlocks) {
            // Each block is one SSE event; collect all `data:` lines and join.
            const dataLines = block
              .split('\n')
              .filter((l) => l.startsWith('data:'));
            if (dataLines.length === 0) continue;
            const payload = dataLines.map((l) => l.slice(5).trim()).join('');
            if (payload === '[DONE]') continue;
            try {
              const evt = JSON.parse(payload);

              switch (evt.type) {
                case 'text-delta':
                  if (typeof evt.delta === 'string') {
                    accumulatedText += evt.delta;
                  }
                  break;

                case 'tool-input-available':
                  // Tool call started. evt = { type, toolCallId, toolName, input }
                  // Push placeholder part để render "đang gọi tool..."
                  parts.push({
                    type: 'tool-invocation',
                    toolInvocationId: evt.toolCallId,
                    toolName: evt.toolName,
                    state: 'call',
                    input: evt.input,
                  });
                  // Nhớ input để map sang output ở case dưới (cần cho captureLead).
                  toolMeta.set(evt.toolCallId, {
                    toolName: evt.toolName,
                    input: evt.input,
                  });
                  break;

                case 'tool-output-available': {
                  // Tool call finished. evt = { type, toolCallId, output }
                  // Update last matching tool-invocation part
                  const toolOut = evt.output;
                  const toolCallId = evt.toolCallId;
                  const idx = parts.findIndex(
                    (p) => p.type === 'tool-invocation' && p.toolInvocationId === toolCallId
                  );
                  if (idx >= 0) {
                    parts[idx] = {
                      ...parts[idx],
                      state: 'result',
                      result: toolOut,
                    };
                  }
                  // Collect products / collections
                  if (isProductArray(toolOut)) {
                    for (const p of toolOut) products.set(p.id, p);
                  } else if (isCollectionArray(toolOut)) {
                    for (const c of toolOut) collections.set(c.id, c);
                  } else if (
                    toolOut &&
                    typeof toolOut === 'object' &&
                    !Array.isArray(toolOut) &&
                    (toolOut as any).id &&
                    (toolOut as any).slug
                  ) {
                    // getProductDetail trả về 1 object đơn
                    const p = toolOut as any;
                    if (p.title && p.price !== undefined && p.price !== null) {
                      products.set(p.id, p);
                    }
                  }
                  // Track `chat_lead_captured` khi captureLead hoàn tất thành công.
                  const meta = toolMeta.get(toolCallId);
                  if (meta && meta.toolName === 'captureLead') {
                    const result = toolOut as any;
                    const success =
                      result &&
                      typeof result === 'object' &&
                      (result.success === true ||
                        result.ok === true ||
                        result.status === 'ok' ||
                        result.captured === true);
                    if (success) {
                      const input = (meta.input || {}) as Record<string, unknown>;
                      const contactType =
                        normalizeContactType(input.contact_type) ||
                        normalizeContactType(input.type) ||
                        normalizeContactType(input.channel) ||
                        'phone';
                      const matchedProductId =
                        input.product_id || input.matched_product_id || input.productId;
                      const hasMatchedProduct = Boolean(
                        matchedProductId && products.has(String(matchedProductId))
                      );
                      analytics.trackChatLeadCaptured(
                        sessionId,
                        contactType,
                        hasMatchedProduct
                      );
                    }
                    toolMeta.delete(toolCallId);
                  }
                  break;
                }

                case 'error':
                  console.error('[ChatWidget] stream error event:', evt);
                  throw new Error(evt.error?.message || evt.errorText || 'Stream error');

                // Control events: ignore
                case 'start':
                case 'start-step':
                case 'finish-step':
                case 'finish':
                case 'text-end':
                case 'text-start':
                case 'tool-input-start':
                case 'tool-input-delta':
                default:
                  break;
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message !== 'Unexpected end of JSON input'
              ) {
                // Rethrow nếu là stream error (từ case 'error')
                if ((parseErr as any).message?.includes('Stream error')) throw parseErr;
              }
            }
          }
        }

        // 4) Finalize: build parts array
        const finalParts: any[] = [];
        if (accumulatedText) {
          finalParts.push({ type: 'text', text: accumulatedText });
        }
        // Tool invocations (đã có ở `parts` với state=result)
        for (const p of parts) {
          if (p.type === 'tool-invocation') finalParts.push(p);
        }

        // Nếu model không sinh text (ví dụ: chỉ gọi tool rồi dừng với finishReason='tool-calls'),
        // tự tạo fallback text dựa trên tool output để UI không bị trống.
        let finalText = accumulatedText;
        const captureCalled = parts.some(
          (p: any) => p.type === 'tool-invocation' && p.toolName === 'captureLead' && p.state === 'result'
        );
        if (!finalText) {
          if (captureCalled) {
            finalText = 'Cảm ơn em, Bà Chủ đã ghi nhận liên lạc. Khi có hàng hoặc cần tư vấn, tiệm sẽ liên hệ em sớm nhất nha.';
          } else if (collections.size > 0) {
            const list = Array.from(collections.values())
              .map((c: any, i: number) => `${i + 1}. ${c.name}${c.description ? ` — ${c.description}` : ''}`)
              .join('\n');
            finalText = `Hiện tiệm có ${collections.size} bộ sưu tập:\n${list}\n\nEm muốn xem chi tiết bộ nào ạ?`;
          } else if (products.size > 0) {
            finalText = `Tiệm tìm thấy ${products.size} sản phẩm phù hợp. Em xem bên dưới nhé.`;
          } else if (parts.some((p: any) => p.type === 'tool-invocation')) {
            finalText = 'Hiện tiệm chưa có món này ạ. Em có thể để lại SĐT để tiệm thông báo khi có hàng không?';
          } else {
            finalText = 'Bà Chủ chưa rõ ý em lắm, em nói rõ hơn được không ạ?';
          }
        }
        if (!finalParts.some((p: any) => p.type === 'text')) {
          finalParts.unshift({ type: 'text', text: finalText });
        }

        const finalAssistant: UIMessage = {
          id: genId(),
          role: 'assistant',
          content: finalText,
          parts: finalParts,
        } as any;

        setMessages((prev) => [...prev, finalAssistant]);
        setStatus('ready');
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setStatus('ready');
          return;
        }
        console.error('[ChatWidget] error:', err);
        setError(err);
        setStatus('error');
        // Vẫn thêm 1 message báo lỗi để user biết
        const errorMsg: UIMessage = {
          id: genId(),
          role: 'assistant',
          content: `⚠️ Xin lỗi, Bà Chủ đang bận. ${err.message || 'Vui lòng thử lại.'}`,
          parts: [{ type: 'text', text: `⚠️ Xin lỗi, Bà Chủ đang bận. ${err.message || 'Vui lòng thử lại.'}` }],
        } as any;
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        abortRef.current = null;
      }
    },
    [messages, sessionId, analytics]
  );

  const handleClear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setStatus('ready');
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (status === 'streaming' || status === 'submitted') {
      abortRef.current?.abort();
      setStatus('ready');
    }
  }, [status]);

  return (
    <>
      <ChatPanel
        open={open}
        onClose={handleClose}
        messages={messages}
        status={status}
        error={error}
        onSend={handleSend}
        onClear={handleClear}
      />
      <ChatBubble open={open} onToggle={handleToggle} />
    </>
  );
}
