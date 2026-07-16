'use client';

/**
 * Toolbar phía trên grid: search, sort, stats tổng.
 *
 * - Search: filter filename (client-side, vì API cũng filter search).
 * - Sort: native select (4 options, map sang `MediaSort`).
 * - Stats: tổng số ảnh / tổng dung lượng / số orphan.
 */

import { Search, X } from 'lucide-react';
import { formatBytes } from '@/lib/image/client-resize';
import { cn } from '@/lib/utils';
import type { MediaSort } from './types';

export interface MediaToolbarProps {
  search: string;
  onSearchChange: (s: string) => void;
  sort: MediaSort;
  onSortChange: (s: MediaSort) => void;
  folder: string;
  onFolderChange: (f: string) => void;
  total: number;
  totalSize: number;
  orphanCount: number;
}

const SORT_OPTIONS: Array<{ value: MediaSort; label: string }> = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'created_asc', label: 'Cũ nhất' },
  { value: 'size_desc', label: 'Largest' },
  { value: 'name_asc', label: 'Tên A-Z' },
];

/** Folder dropdown options. `''` = bucket root. */
const FOLDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'products', label: 'Products' },
  { value: 'categories', label: 'Categories' },
  { value: 'collections', label: 'Collections' },
  { value: 'banners', label: 'Banners' },
];

const INPUT_CLASS =
  'bg-[#0D1117] border border-[#4D4635] text-sm rounded-sm px-3 py-2 focus:border-[#F2CA50]/60 outline-none';

export function MediaToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  folder,
  onFolderChange,
  total,
  totalSize,
  orphanCount,
}: MediaToolbarProps) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-3 rounded-sm p-3',
        'border border-[#4D4635] bg-[rgba(18,36,28,0.6)] backdrop-blur'
      )}
    >
      {/* Search */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D0C5AF]/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo tên file…"
          className={cn(INPUT_CLASS, 'w-full pl-10 pr-9')}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-[#D0C5AF]/50 hover:text-[#D0C5AF]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as MediaSort)}
        className={cn(INPUT_CLASS, 'cursor-pointer pr-8')}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Folder filter */}
      <select
        value={folder}
        onChange={(e) => onFolderChange(e.target.value)}
        className={cn(INPUT_CLASS, 'cursor-pointer pr-8')}
        aria-label="Lọc theo folder"
      >
        {FOLDER_OPTIONS.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Stats */}
      <div className="ml-auto text-xs text-[#D0C5AF]/70">
        {total} ảnh · {formatBytes(totalSize)} · {orphanCount} orphan
      </div>
    </div>
  );
}
