'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/store/cart';

export function CartBadge() {
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const activeCount = items.filter((i) => Date.now() < i.expiresAt).length;
  if (activeCount === 0) return null;

  return (
    <span
      key={activeCount}
      className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-gold text-[10px] font-bold text-background motion-safe:animate-pop"
    >
      {activeCount}
    </span>
  );
}
