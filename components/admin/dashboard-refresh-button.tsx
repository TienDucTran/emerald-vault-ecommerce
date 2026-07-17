'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

/** Client button gọi router.refresh() để re-fetch Server Component data. */
export function RefreshButton({ label = 'Làm mới' }: { label?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [spinning, setSpinning] = useState(false);

  const onClick = () => {
    setSpinning(true);
    startTransition(() => {
      router.refresh();
    });
    // Reset spin sau 1s (router.refresh gần như instant với cache 30s)
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.3)] text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
      style={{ background: 'rgba(18, 36, 28, 0.6)' }}
    >
      <svg
        className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v6h6M20 20v-6h-6M5.5 13a8 8 0 0013.4 4M18.5 11A8 8 0 005.1 7"
        />
      </svg>
      {isPending ? 'Đang tải...' : label}
    </button>
  );
}
