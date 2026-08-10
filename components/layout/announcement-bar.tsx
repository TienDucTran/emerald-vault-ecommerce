'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS } from '@/lib/supabase/queries/site-content-defaults';

interface AnnouncementBarProps {
  /** Dynamic messages from API — if missing, falls back to defaults */
  messages?: string[];
}

const DEFAULT_MESSAGES = DEFAULT_SITE_SETTINGS.announcement_messages ?? [];

export function AnnouncementBar({ messages }: AnnouncementBarProps) {
  const msgs = messages && messages.length > 0 ? messages : DEFAULT_MESSAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (msgs.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % msgs.length), 4000);
    return () => clearInterval(t);
  }, [msgs.length]);

  // Guard: if msgs is empty somehow
  if (msgs.length === 0) return null;

  return (
    <div className="relative w-full border-b border-gold/20 bg-gradient-to-r from-surface-emerald via-background to-surface-emerald">
      <div className="container mx-auto flex h-9 items-center justify-center px-4">
        <p
          key={index}
          className="truncate animate-fade-in text-xs font-medium tracking-wider text-gold/90 sm:text-sm"
        >
          ✦ {msgs[index]} ✦
        </p>
      </div>
    </div>
  );
}