// Floating chatbot bubble (mobile + desktop) — góc phải dưới màn hình
// Click để mở panel chat. Hiện tại là stub, sẽ nối vào /api/chat sau
'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export function MobileChatbotBubble() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bubble button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Đóng chat' : 'Mở chat tư vấn'}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 h-14 w-14 rounded-full bg-[#c9a961] text-black shadow-lg shadow-[#c9a961]/30 flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat tư vấn"
          className="fixed bottom-36 right-4 lg:bottom-24 lg:right-6 z-50 w-[min(360px,calc(100vw-2rem))] h-[480px] bg-[#0a0a0a] border border-[#c9a961]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[#c9a961]/20 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#c9a961]/20 flex items-center justify-center text-[#c9a961] font-serif text-sm">B</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#c9a961]">Bà Chủ Tiệm</p>
              <p className="text-[10px] text-[#c9a961]/60 tracking-wider uppercase">Tư vấn viên</p>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto text-sm text-[#c9a961]/80">
            <p className="mb-2">Chào quý khách 👋</p>
            <p>Em là Bà Chủ Tiệm — chuyên gia tư vấn trang sức si Nhật vintage tại Emerald Vault. Quý khách đang tìm món nào ạ?</p>
          </div>
          <div className="p-3 border-t border-[#c9a961]/20">
            <input
              type="text"
              placeholder="Nhập câu hỏi..."
              className="w-full bg-black/40 border border-[#c9a961]/30 rounded-full px-4 py-2 text-sm text-[#c9a961] placeholder:text-[#c9a961]/40 focus:outline-none focus:border-[#c9a961]"
              disabled
            />
            <p className="mt-1.5 text-[10px] text-center text-[#c9a961]/40">Chatbot đang được kết nối (sắp ra mắt)</p>
          </div>
        </div>
      )}
    </>
  );
}
