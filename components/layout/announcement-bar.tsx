'use client';

import { useEffect, useState } from 'react';

const MESSAGES = [
  'Miễn phí vận chuyển cho đơn từ 2 triệu',
  'Giữ hàng 10 phút — không ai cướp được món đồ bạn thích',
  'Đồ si đã qua tuyển chọn bởi chuyên gia Nhật',
];

export function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full border-b border-gold/20 bg-gradient-to-r from-surface-emerald via-background to-surface-emerald">
      <div className="container mx-auto flex h-9 items-center justify-center px-4">
        <p
          key={index}
          className="animate-fade-in text-xs font-medium tracking-wider text-gold/90 sm:text-sm"
        >
          ✦ {MESSAGES[index]} ✦
        </p>
      </div>
    </div>
  );
}
