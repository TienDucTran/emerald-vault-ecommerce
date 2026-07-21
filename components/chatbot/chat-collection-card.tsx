'use client';

import Image from 'next/image';
import { Layers } from 'lucide-react';

interface ChatCollectionCardProps {
  collection: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    cover_image_url?: string | null;
  };
}

export function ChatCollectionCard({ collection }: ChatCollectionCardProps) {
  const name = collection.name?.trim() || 'Bộ sưu tập';
  return (
    <a
      href={`/san-pham?collection=${collection.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-2.5 rounded-lg border border-gold/20 bg-surface/60 p-2 transition-all hover:border-gold/50 hover:bg-surface-emerald"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-background">
        {collection.cover_image_url ? (
          <Image
            src={collection.cover_image_url}
            alt={name}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gold/60">
            <Layers className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-1 text-xs font-medium text-text-base group-hover:text-gold">
          {name}
        </h4>
        {collection.description && (
          <p className="mt-0.5 line-clamp-2 text-[10px] text-text-muted">
            {collection.description}
          </p>
        )}
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gold/80">
          <Layers className="h-3 w-3" />
          <span>Bộ sưu tập</span>
        </div>
      </div>
    </a>
  );
}
