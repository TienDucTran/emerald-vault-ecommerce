'use client';

/**
 * LocationSelect — Combobox dropdown có search cho chọn địa chỉ hành chính VN.
 *
 * - Click hoặc focus → mở dropdown với search input
 * - Gõ text → filter danh sách theo displayName (case-insensitive)
 * - Click item → chọn + đóng dropdown
 * - Click outside / Escape → đóng dropdown
 * - Loading state: spinner
 * - Disabled state: mờ + không click được
 * - Fallback: nếu API lỗi (items rỗng + không loading) → render text input thuần
 *
 * Style: gold/emerald theme, match AddressForm design.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Search, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocationItem } from '@/hooks/use-vietnam-locations';

export interface LocationSelectProps {
  /** Danh sách item để hiển thị */
  items: LocationItem[];
  /** Code của item đã chọn (null = chưa chọn) */
  value: number | null;
  /** Callback khi chọn item (null = clear) */
  onChange: (code: number | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label cho accessibility */
  ariaLabel?: string;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Required (cho form validation) */
  required?: boolean;
  /** ID cho label association */
  id?: string;
}

export function LocationSelect({
  items,
  value,
  onChange,
  placeholder = 'Chọn...',
  ariaLabel,
  loading = false,
  disabled = false,
  required = false,
  id,
}: LocationSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected item
  const selected = items.find((i) => i.code === value) ?? null;

  // Filter items by query (case-insensitive, search both name + displayName)
  const filtered = query
    ? items.filter((item) => {
        const q = query.toLowerCase().replace(/\s/g, '');
        const n = item.name.toLowerCase().replace(/\s/g, '');
        const dn = item.displayName.toLowerCase().replace(/\s/g, '');
        return n.includes(q) || dn.includes(q);
      })
    : items;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search input when open
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if (!open) {
        e.preventDefault();
        setOpen(true);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'ArrowDown' && open && listRef.current) {
      e.preventDefault();
      const first = listRef.current.querySelector('[role="option"]') as HTMLElement | null;
      first?.focus();
    }
  };

  const handleSelect = (item: LocationItem) => {
    onChange(item.code);
    setOpen(false);
    setQuery('');
  };

  // Fallback: no items and not loading → render text input (graceful degradation)
  if (items.length === 0 && !loading) {
    return (
      <input
        id={id}
        type="text"
        value={selected?.name ?? ''}
        onChange={(e) => {
          // Can't match code, so we just let parent handle via name
          // This is a fallback — parent should handle the case
        }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        className={cn(
          'w-full rounded-md border bg-background px-4 py-3 text-base text-text-base',
          'border-gold/30 placeholder:text-text-disabled/50',
          'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/10',
          'transition-colors'
        )}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between rounded-md border bg-background px-4 py-3 text-left text-base',
          'border-gold/30 transition-colors',
          'focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/10',
          disabled && 'cursor-not-allowed opacity-50',
          !selected && 'text-text-disabled/50'
        )}
      >
        <span className={cn('flex-1 truncate', selected && 'text-text-base')}>
          {loading ? (
            <span className="flex items-center gap-2 text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải...
            </span>
          ) : selected ? (
            selected.displayName
          ) : (
            placeholder
          )}
        </span>
        {!loading && (
          <ChevronDown
            className={cn(
              'ml-2 h-4 w-4 shrink-0 text-text-muted transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gold/30 bg-surface shadow-xl"
          style={{ maxHeight: '320px' }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-gold/10 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-transparent text-sm text-text-base placeholder:text-text-muted/50 focus:outline-none"
            />
          </div>

          {/* Items list */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="overflow-y-auto p-1"
            style={{ maxHeight: '260px' }}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-text-muted">
                Không tìm thấy kết quả.
              </li>
            ) : (
              filtered.map((item) => {
                const isSelected = item.code === value;
                return (
                  <li
                    key={item.code}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => handleSelect(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSelect(item);
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors',
                      isSelected
                        ? 'bg-gold/15 text-gold'
                        : 'text-text-base hover:bg-gold/5'
                    )}
                  >
                    <span>{item.displayName}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}