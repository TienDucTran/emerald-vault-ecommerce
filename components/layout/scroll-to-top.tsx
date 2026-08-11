'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * ScrollToTop — floating button bên trái, xuất hiện khi scroll xuống.
 * Mount global trong store layout (không hiển thị ở admin).
 * Vị trí left để tránh đụng chatbot bubble bên phải.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (!visible) return null;

  return (
    <button
      className="fixed bottom-24 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 hover:opacity-100 motion-safe:animate-fadeInUp sm:bottom-8 sm:left-8"
      style={{
        background: 'rgba(13, 17, 23, 0.8)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(242, 202, 80, 0.2)',
        boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
        opacity: 0.8,
      }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Cuộn lên đầu trang"
    >
      <ArrowUp className="h-5 w-5 text-gold" />
    </button>
  );
}