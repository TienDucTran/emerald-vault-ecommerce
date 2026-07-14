'use client';

import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { useCartStore } from '@/lib/store/cart';

interface LockButtonProps {
  product: Product;
}

export function LockButton({ product }: LockButtonProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const handleClick = () => {
    addItem(product);
    router.push('/gio-hang');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-3 bg-gold px-6 py-4 font-heading text-lg text-background transition-all hover:bg-gold-champagne hover:shadow-gold-glow"
    >
      <Clock className="h-5 w-5" />
      GIỮ HÀNG 10 PHÚT
    </button>
  );
}
