'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn, MATERIAL_LABELS, CATEGORY_LABELS } from '@/lib/utils';
import type { Product } from '@/lib/types';

export interface SearchAutocompleteProps {
  className?: string;
  placeholder?: string;
  mobile?: boolean;
  onResultClick?: () => void;
}

interface SearchApiResponse {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text: string, query: string): ReactNode {
  if (!query || !text) return text;
  const trimmed = query.trim();
  if (trimmed.length < 1) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(trimmed)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={i} className="bg-gold/30 text-gold rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function SearchAutocomplete({
  className,
  placeholder = 'Tìm kho báu...',
  mobile = false,
  onResultClick,
}: SearchAutocompleteProps) {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [total, setTotal] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced fetch
  useEffect(() => {
    const trimmed = query.trim();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (trimmed.length < 2) {
      setResults([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `/api/products/search?keyword=${encodeURIComponent(trimmed)}&pageSize=6`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setResults([]);
          setTotal(0);
          setIsLoading(false);
          return;
        }
        const json = (await res.json()) as SearchApiResponse;
        if (controller.signal.aborted) return;
        setResults(Array.isArray(json.data) ? json.data : []);
        setTotal(typeof json.total === 'number' ? json.total : 0);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setResults([]);
        setTotal(0);
      } finally {
        if (!abortRef.current || !abortRef.current.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const navigateToProduct = useCallback(
    (slug: string) => {
      setQuery('');
      setIsOpen(false);
      setActiveIndex(-1);
      onResultClick?.();
      router.push(`/san-pham/${slug}`);
    },
    [router, onResultClick]
  );

  const navigateToSearch = useCallback(
    (kw: string) => {
      setQuery('');
      setIsOpen(false);
      setActiveIndex(-1);
      onResultClick?.();
      router.push(`/san-pham?keyword=${encodeURIComponent(kw)}`);
    },
    [router, onResultClick]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!results.length) return;
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        navigateToProduct(results[activeIndex].slug);
      } else if (query.trim()) {
        e.preventDefault();
        navigateToSearch(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const showDropdown =
    isOpen &&
    (isLoading || results.length > 0 || (query.trim().length >= 2 && !isLoading));

  const trimmedQuery = query.trim();

  return (
    <div
      ref={containerRef}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-owns="search-results"
      className={cn('relative', className)}
    >
      <div
        className={cn(
          'flex items-center rounded-xl border border-gold/30 bg-[#1F1B13] px-4 transition-colors focus-within:border-gold',
          mobile ? 'w-full py-3' : 'py-2'
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          className="ml-2 w-full bg-transparent text-sm text-[#EAE1D4] placeholder:text-text-muted focus:outline-none"
        />
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-muted" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setTotal(0);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            aria-label="Xóa tìm kiếm"
            className="shrink-0 text-text-muted transition-colors hover:text-gold"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {total > 0 ? `Có ${total} kết quả` : ''}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-[480px] overflow-y-auto rounded-xl border border-gold/30 bg-[#1F1B13]/95 shadow-2xl shadow-black/50 backdrop-blur-md">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Đang tìm...</span>
            </div>
          )}

          {!isLoading && results.length === 0 && trimmedQuery.length >= 2 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-text-muted">
                Không tìm thấy sản phẩm cho &ldquo;{trimmedQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => navigateToSearch(trimmedQuery)}
                className="mt-3 text-sm font-medium text-gold transition-colors hover:text-gold-champagne"
              >
                Tìm trên trang sản phẩm →
              </button>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul id="search-results" role="listbox" className="py-1">
              {results.map((p, i) => {
                const img = p.image_url || (p.gallery && p.gallery[0]) || '';
                const isActive = i === activeIndex;
                return (
                  <li
                    key={p.id}
                    id={`search-result-${i}`}
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      'relative',
                      isActive && 'bg-gold/15'
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-0 h-full w-0.5 bg-gold"
                      />
                    )}
                    <Link
                      href={`/san-pham/${p.slug}`}
                      onClick={() => navigateToProduct(p.slug)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gold/10"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/30">
                        {img ? (
                          <Image
                            src={img}
                            alt={p.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-medium text-[#EAE1D4]">
                          {highlightMatch(p.title, trimmedQuery)}
                        </div>
                        <div className="text-xs text-text-muted">
                          {MATERIAL_LABELS[p.material] ?? p.material}
                          {' · '}
                          {CATEGORY_LABELS[p.category] ?? p.category}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {!isLoading && results.length > 0 && (
            <div className="border-t border-gold/20">
              {total > 6 && (
                <button
                  type="button"
                  onClick={() => navigateToSearch(trimmedQuery)}
                  className="w-full border-b border-gold/10 px-4 py-3 text-left text-sm text-gold transition-colors hover:bg-gold/10"
                >
                  Xem tất cả {total} kết quả cho &ldquo;{trimmedQuery}&rdquo;
                </button>
              )}
              <button
                type="button"
                onClick={() => navigateToSearch(trimmedQuery)}
                className="w-full px-4 py-3 text-left text-sm text-gold transition-colors hover:bg-gold/10"
              >
                Tìm kiếm nâng cao →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchAutocomplete;
export { SearchAutocomplete };
