'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Library as LibraryIcon,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { toast } from '@/lib/toast/toast-store';
import { cn, formatVND } from '@/lib/utils';

export interface PickerProduct {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  material: string;
  category: string;
  image_url: string;
  price: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD_OUT';
  quality_tier: 'SSS' | 'SS' | 'S';
  collection_id: string | null;
}

export interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeIds?: string[];
  initialSelected?: string[];
  max?: number;
  title?: string;
  onConfirm: (productIds: string[]) => void;
  onCancel?: () => void;
}

const LIMIT = 20;

const glassStrong: React.CSSProperties = {
  background: 'rgba(18, 36, 28, 0.92)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(242, 202, 80, 0.3)',
};

const CATEGORY_LABELS: Record<string, string> = {
  NHAN: 'Nhẫn',
  DAY_CHUYEN: 'Dây chuyền',
  BONG_TAI: 'Bông tai',
  VONG_TAY: 'Lắc tay',
  MAT_DAY: 'Mặt dây',
};

const MATERIAL_LABELS: Record<string, string> = {
  BAC_925: 'Bạc 925',
  MA_VANG_18K: 'Mạ vàng 18K',
  MA_VANG_24K: 'Mạ vàng 24K',
  VANG_18K: 'Vàng 18K',
  KIM_CUONG: 'Kim cương',
};

export function ProductPicker({
  open,
  onOpenChange,
  excludeIds = [],
  initialSelected = [],
  max = 50,
  title = 'Thêm sản phẩm vào bộ sưu tập',
  onConfirm,
  onCancel,
}: ProductPickerProps) {
  const [items, setItems] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(new Set(initialSelected.filter(Boolean)));
      setOffset(0);
    }
  }, [open, initialSelected]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(offset),
        sort: 'newest',
      });
      if (search.trim()) params.set('keyword', search.trim());
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || !json.ok) {
        throw new Error((json && (json.message || json.error)) || `HTTP ${res.status}`);
      }
      setItems((json.data as PickerProduct[]) || []);
      setTotal(json.total ?? 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setOffset(0);
      void fetchProducts();
    }, 300);
    return () => clearTimeout(t);
  }, [search, open]);

  useEffect(() => {
    if (!open) return;
    void fetchProducts();
  }, [offset, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleClose = useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  const togglePick = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          return next;
        }
        if (next.size >= max) {
          toast.warning(`Tối đa ${max} sản phẩm.`);
          return prev;
        }
        next.add(id);
        return next;
      });
    },
    [max]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(selected));
    onOpenChange(false);
  }, [selected, onConfirm, onOpenChange]);

  const visibleItems = useMemo(
    () => items.filter((it) => !excludeIds.includes(it.id)),
    [items, excludeIds]
  );

  if (!open || !mounted) return null;

  const hasNext = items.length === LIMIT;
  const hasPrev = offset > 0;
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-sm overflow-hidden shadow-2xl"
        style={glassStrong}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[rgba(242,202,80,0.15)]">
          <div className="flex items-center gap-2 min-w-0">
            <LibraryIcon className="w-4 h-4 text-gold shrink-0" />
            <h2 className="font-heading text-sm sm:text-base font-semibold text-gold tracking-[0.1em] uppercase truncate">
              {title}
            </h2>
            <span className="text-[10px] text-[#D0C5AF]/50 shrink-0">
              · {selected.size}/{max} đã chọn
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng"
            className="inline-flex items-center justify-center w-8 h-8 rounded-sm text-[#D0C5AF]/70 hover:text-gold transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[rgba(242,202,80,0.1)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D0C5AF]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, slug, mã sản phẩm…"
              className="w-full pl-8 pr-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>
        </div>

        {error && !loading && (
          <div className="mx-5 mt-3 flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 p-3">
            <p className="text-xs text-error/90 flex-1">{error}</p>
            <button
              type="button"
              onClick={() => void fetchProducts()}
              className="rounded-sm border border-error/40 px-3 py-1 text-[10px] font-heading tracking-[0.1em] uppercase text-error/80 hover:bg-error/10"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-sm border border-[#4D4635] bg-[#1F1B13]"
                />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-[#D0C5AF]/50 text-xs">
              <p>Không tìm thấy sản phẩm nào.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visibleItems.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePick(p.id);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-sm border transition-colors text-left',
                        isSelected
                          ? 'border-gold bg-gold/5'
                          : 'border-[#4D4635]/30 hover:border-gold/30 bg-[#1F1B13]'
                      )}
                    >
                      <div className="w-12 h-12 shrink-0 rounded-sm overflow-hidden border border-[#4D4635] bg-[#0D1117]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#EAE1D4] truncate">{p.title}</p>
                        <p className="text-[10px] text-[#D0C5AF]/50 mt-0.5 font-mono">
                          {p.code && <span className="text-gold/70">{p.code}</span>}
                          {p.code ? ' · ' : ''}
                          {CATEGORY_LABELS[p.category] ?? p.category} ·{' '}
                          {MATERIAL_LABELS[p.material] ?? p.material}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-gold tabular-nums">
                          {formatVND(p.price)}
                        </p>
                        {p.status !== 'AVAILABLE' && (
                          <p className="text-[10px] text-text-muted/60 mt-0.5 uppercase">
                            {p.status === 'RESERVED' ? 'Đang đặt' : 'Đã bán'}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="ml-2 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-[#12241C]">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[rgba(242,202,80,0.15)] bg-[rgba(13,17,23,0.4)]">
          <div className="flex items-center gap-2 text-[10px] text-[#D0C5AF]/50">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={!hasPrev || loading}
              className="rounded-sm border border-[#4D4635]/30 px-3 py-1 text-[10px] transition-colors hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹ Trước
            </button>
            <span>
              Trang {currentPage}
              {total > 0 ? ` · ${total} kết quả` : ''}
            </span>
            <button
              type="button"
              onClick={() => setOffset(offset + LIMIT)}
              disabled={!hasNext || loading}
              className="rounded-sm border border-[#4D4635]/30 px-3 py-1 text-[10px] transition-colors hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau ›
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/70 hover:text-[#EAE1D4] transition-colors"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold inline-flex items-center gap-2 transition-colors bg-gold text-[#3C2F00] hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Thêm ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
