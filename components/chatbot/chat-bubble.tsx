'use client';

import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  open: boolean;
  onToggle: () => void;
  unreadCount?: number;
}

export function ChatBubble({ open, onToggle, unreadCount = 0 }: ChatBubbleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Đóng chat' : 'Mở chat tư vấn'}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'flex h-14 w-14 items-center justify-center rounded-full',
        'bg-gradient-to-br from-gold to-gold-champagne',
        'shadow-gold-glow-lg transition-all duration-200',
        'hover:scale-110 hover:shadow-2xl',
        'focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-background',
        'lg:bottom-8 lg:right-8 lg:h-16 lg:w-16'
      )}
    >
      {open ? (
        <X className="h-6 w-6 text-background" />
      ) : (
        <>
          <MessageCircle className="h-6 w-6 text-background" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </>
      )}
    </button>
  );
}
