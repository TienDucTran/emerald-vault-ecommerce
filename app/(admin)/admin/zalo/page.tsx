// app/(admin)/admin/zalo/page.tsx
// Admin Zalo Messages — xem tin nhắn Zalo từ khách + reply.
// Cần Zalo OA đã cấu hình (env vars) để reply hoạt động.
// Nếu chưa cấu hình, vẫn xem được messages đã nhận qua webhook.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, RefreshCw, MessageCircle } from 'lucide-react';
import { toast } from '@/lib/toast/toast-store';
import { ZaloIcon } from '@/components/layout/zalo-icon';

const glassStyle = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};
const inputCls =
  'w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/40';

interface ZaloMessage {
  id: string;
  zalo_user_id: string;
  display_name: string | null;
  direction: 'in' | 'out';
  message_text: string;
  message_type: string;
  zalo_msg_id: string | null;
  status: string;
  created_at: string;
}

interface ConversationGroup {
  userId: string;
  displayName: string | null;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: ZaloMessage[];
}

export default function ZaloMessagesPage() {
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/zalo/messages?limit=200', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        const messages = json.data as ZaloMessage[];
        // Group by user
        const groups = new Map<string, ConversationGroup>();
        for (const msg of messages) {
          if (!groups.has(msg.zalo_user_id)) {
            groups.set(msg.zalo_user_id, {
              userId: msg.zalo_user_id,
              displayName: msg.display_name,
              lastMessage: msg.message_text,
              lastTime: msg.created_at,
              unreadCount: 0,
              messages: [],
            });
          }
          const group = groups.get(msg.zalo_user_id)!;
          group.messages.push(msg);
          // Sort messages trong group: cũ → mới
          group.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          // Update last message
          if (new Date(msg.created_at) > new Date(group.lastTime)) {
            group.lastMessage = msg.message_text;
            group.lastTime = msg.created_at;
          }
          if (msg.direction === 'in' && msg.status === 'received') {
            group.unreadCount++;
          }
        }
        // Sort conversations: unread first, then by lastTime desc
        const sorted = Array.from(groups.values()).sort((a, b) => {
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
          return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
        });
        setConversations(sorted);
      }
    } catch {
      toast.error('Lỗi tải tin nhắn Zalo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    // Auto-refresh mỗi 30 giây
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll to bottom khi chọn user hoặc có tin mới
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedUserId, conversations]);

  const handleSendReply = async () => {
    if (!selectedUserId || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/zalo/messages', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, text: replyText.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.message ?? 'Gửi thất bại. Kiểm tra Zalo OA config.');
        return;
      }
      toast.success('✓ Đã gửi tin nhắn Zalo.');
      setReplyText('');
      fetchMessages();
    } catch {
      toast.error('Lỗi mạng.');
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.userId === selectedUserId);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0068FF]/20">
            <ZaloIcon className="h-5 w-5 text-[#0068FF]" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
              Zalo Messages
            </h1>
            <p className="text-[10px] text-[#D0C5AF]/50">
              Quản lý tin nhắn khách hàng qua Zalo OA
            </p>
          </div>
        </div>
        <button
          onClick={fetchMessages}
          disabled={loading}
          className="flex items-center gap-2 rounded-sm border border-[#4D4635] px-4 py-2 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF] hover:border-gold/40 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && conversations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gold/50" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={glassStyle}>
          <MessageCircle className="mb-3 h-8 w-8 text-[#D0C5AF]/30" />
          <p className="text-xs text-[#D0C5AF]/50">
            Chưa có tin nhắn Zalo nào.
            <br />
            Đảm bảo webhook đã được cấu hình trong Zalo OA dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ minHeight: '60vh' }}>
          {/* Conversation list */}
          <div className="lg:col-span-1 rounded-sm overflow-hidden" style={glassStyle}>
            <div className="border-b border-[#4D4635]/50 px-4 py-3">
              <h2 className="text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                Hội thoại ({conversations.length})
              </h2>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedUserId(conv.userId)}
                  className={`flex w-full items-start gap-3 border-b border-[#4D4635]/30 px-4 py-3 text-left transition-colors hover:bg-[#4D4635]/20 ${
                    selectedUserId === conv.userId ? 'bg-[#4D4635]/30' : ''
                  }`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0068FF]/20">
                    <ZaloIcon className="h-4 w-4 text-[#0068FF]" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-medium text-[#D0C5AF]">
                        {conv.displayName || conv.userId.slice(0, 12)}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 flex-shrink-0 rounded-full bg-[#0068FF] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-[#D0C5AF]/40">
                      {conv.lastMessage.slice(0, 40)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat view */}
          <div className="lg:col-span-2 flex flex-col rounded-sm overflow-hidden" style={glassStyle}>
            {selectedConv ? (
              <>
                <div className="border-b border-[#4D4635]/50 px-4 py-3">
                  <h2 className="text-xs font-medium text-[#D0C5AF]">
                    {selectedConv.displayName || selectedConv.userId}
                  </h2>
                  <p className="text-[10px] text-[#D0C5AF]/40">Zalo ID: {selectedConv.userId}</p>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '50vh' }}>
                  {selectedConv.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'in' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                          msg.direction === 'in'
                            ? 'bg-[#4D4635]/40 text-[#D0C5AF]'
                            : 'bg-[#0068FF] text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message_text}</p>
                        <p className={`mt-1 text-[9px] ${msg.direction === 'in' ? 'text-[#D0C5AF]/40' : 'text-white/50'}`}>
                          {new Date(msg.created_at).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                          {msg.status === 'received' && ' · mới'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply box */}
                <div className="border-t border-[#4D4635]/50 p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder="Nhập tin nhắn trả lời..."
                      className={inputCls}
                      disabled={sending}
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="flex-shrink-0 flex items-center gap-1 rounded-sm bg-[#0068FF] px-4 py-2 text-[10px] font-heading tracking-[0.1em] uppercase font-bold text-white hover:bg-[#0068FF]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Gửi
                    </button>
                  </div>
                  <p className="mt-1 text-[9px] text-[#D0C5AF]/30">
                    Enter để gửi · Cần Zalo OA đã cấu hình (ZALO_OA_ACCESS_TOKEN)
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center">
                <div>
                  <MessageCircle className="mx-auto mb-3 h-8 w-8 text-[#D0C5AF]/20" />
                  <p className="text-xs text-[#D0C5AF]/40">
                    Chọn một hội thoại để xem chi tiết
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}