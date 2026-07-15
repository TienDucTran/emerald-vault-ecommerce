'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  formatVND,
  MATERIAL_LABELS,
  CATEGORY_LABELS,
  TIER_LABELS,
} from '@/lib/utils';
import type {
  ProductRow,
  ProductCategory,
  Material,
  QualityTier,
  ProductStatus,
} from '@/lib/supabase/types';

type Product = ProductRow;

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Có sẵn',
  SOLD_OUT: 'Hết hàng',
};

const tierBadge = (tier: QualityTier) => {
  if (tier === 'SSS') return 'bg-gradient-to-r from-gold to-gold-champagne text-background';
  if (tier === 'SS') return 'bg-gold/20 text-gold border border-gold/40';
  return 'bg-surface text-gold/80 border border-gold/20';
};

const statusColors: Record<string, string> = {
  AVAILABLE: 'text-success border-success/30 bg-success/10',
  SOLD_OUT: 'text-error border-error/30 bg-error/10',
};

const glassStyle: React.CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};

function buildPageList(current: number, last: number): Array<number | 'ellipsis'> {
  if (last <= 1) return [1];
  const out: Array<number | 'ellipsis'> = [];
  const windowSize = 1;
  const pages = new Set<number>([1, last, current]);
  for (let i = current - windowSize; i <= current + windowSize; i++) {
    if (i > 1 && i < last) pages.add(i);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('ellipsis');
    out.push(p);
    prev = p;
  }
  return out;
}

export default function ProductsPage() {
  // Header state
  // List state
  const [data, setData] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [category, setCategory] = useState<'' | ProductCategory>('');
  const [material, setMaterial] = useState<'' | Material>('');
  const [tier, setTier] = useState<'' | QualityTier>('');
  const [status, setStatus] = useState<'' | ProductStatus>('');
  const [isFeatured, setIsFeatured] = useState<'' | 'true' | 'false'>('');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Debounce keyword (300ms) → reset page to 1
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (debouncedKeyword) qs.set('keyword', debouncedKeyword);
      if (category) qs.set('category', category);
      if (material) qs.set('material', material);
      if (tier) qs.set('tier', tier);
      if (status) qs.set('status', status);
      if (isFeatured) qs.set('is_featured', isFeatured);
      qs.set('page', String(page));
      qs.set('pageSize', String(pageSize));

      const res = await fetch('/api/admin/products?' + qs.toString(), {
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || !json.ok) {
        const msg =
          (json && (json.error || json.message)) ||
          `Request failed (${res.status})`;
        setError(msg);
        setData([]);
        setTotal(0);
        return;
      }
      setData(json.data as Product[]);
      setTotal(json.total ?? 0);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData([]);
      setTotal(0);
    } finally {
      if (abortRef.current === ctrl) {
        setLoading(false);
      }
    }
  }, [debouncedKeyword, category, material, tier, status, isFeatured, page, pageSize]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  // Clear selection when the visible page changes
  useEffect(() => {
    setSelected(new Set());
  }, [data, page]);

  const clearFilters = () => {
    setKeyword('');
    setCategory('');
    setMaterial('');
    setTier('');
    setStatus('');
    setIsFeatured('');
    setPage(1);
  };

  const onChangeFilter = <T,>(setter: (v: T) => void, v: T) => {
    setter(v);
    setPage(1);
  };

  const toggleAll = () => {
    if (!data) return;
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((p) => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteOne = async (p: Product) => {
    if (!window.confirm(`Xóa sản phẩm "${p.title}"?`)) return;
    setDeleting((s) => new Set(s).add(p.id));
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        window.alert(json?.error || `Xóa thất bại (${res.status})`);
        return;
      }
      setSelected((s) => {
        const next = new Set(s);
        next.delete(p.id);
        return next;
      });
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Network error');
    } finally {
      setDeleting((s) => {
        const next = new Set(s);
        next.delete(p.id);
        return next;
      });
    }
  };

  const deleteBulk = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(`Xóa ${ids.length} sản phẩm đã chọn?`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/admin/products/${id}`, { method: 'DELETE' }).then((r) => ({ id, r })),
        ),
      );
      const failed = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.r.ok),
      );
      setSelected(new Set());
      if (failed.length > 0) {
        window.alert(`Đã xóa ${ids.length - failed.length}/${ids.length} sản phẩm. Có lỗi xảy ra.`);
      }
      await load();
    } finally {
      setBulkDeleting(false);
    }
  };

  const lastPage = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );
  const pageItems = useMemo(() => buildPageList(page, lastPage), [page, lastPage]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const allOnPageSelected =
    !!data && data.length > 0 && selected.size === data.length;
  const someOnPageSelected =
    !!data && data.length > 0 && selected.size > 0 && selected.size < data.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Products
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">
            Manage your inventory — {loading && !data ? '…' : `${total} products`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/bulk-upload"
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors"
            style={glassStyle}
          >
            📥 Bulk Upload
          </Link>
          <Link
            href="/admin/products/new"
            className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors"
          >
            + Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-sm flex flex-wrap items-center gap-3" style={glassStyle}>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D0C5AF]/40" />
          <input
            type="text"
            placeholder="Search by title or code..."
            value={keyword}
            onChange={(e) => onChangeFilter(setKeyword, e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        <select
          value={category}
          onChange={(e) => onChangeFilter<'' | ProductCategory>(setCategory, e.target.value as '' | ProductCategory)}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={material}
          onChange={(e) => onChangeFilter<'' | Material>(setMaterial, e.target.value as '' | Material)}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        >
          <option value="">All Materials</option>
          {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={tier}
          onChange={(e) => onChangeFilter<'' | QualityTier>(setTier, e.target.value as '' | QualityTier)}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        >
          <option value="">All Tiers</option>
          {(Object.keys(TIER_LABELS) as QualityTier[]).map((k) => (
            <option key={k} value={k}>
              {k} — {TIER_LABELS[k]}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => onChangeFilter<'' | ProductStatus>(setStatus, e.target.value as '' | ProductStatus)}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        >
          <option value="">All Status</option>
          {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((k) => (
            <option key={k} value={k}>
              {STATUS_LABELS[k]}
            </option>
          ))}
        </select>

        <select
          value={isFeatured}
          onChange={(e) => onChangeFilter<'' | 'true' | 'false'>(setIsFeatured, e.target.value as '' | 'true' | 'false')}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        >
          <option value="">All</option>
          <option value="true">Nổi bật</option>
          <option value="false">Không</option>
        </select>

        <button
          type="button"
          onClick={clearFilters}
          className="px-4 py-2 text-[10px] text-gold/60 hover:text-gold font-heading tracking-[0.1em] uppercase transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Bulk-actions banner */}
      {selected.size > 0 && (
        <div
          className="px-4 py-2.5 rounded-sm flex items-center justify-between"
          style={{
            background: 'rgba(242, 202, 80, 0.08)',
            border: '1px solid rgba(242, 202, 80, 0.25)',
          }}
        >
          <span className="text-xs text-[#D0C5AF]">
            Đã chọn <span className="text-gold font-medium">{selected.size}</span> sản phẩm
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/60 hover:text-[#D0C5AF] transition-colors"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              onClick={deleteBulk}
              disabled={bulkDeleting}
              className="px-3 py-1.5 text-[10px] font-heading tracking-[0.1em] uppercase border border-error/40 text-error/80 hover:text-error hover:bg-error/10 rounded-sm transition-colors disabled:opacity-50"
            >
              {bulkDeleting ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang xóa…
                </span>
              ) : (
                'Xóa tất cả'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-sm overflow-hidden" style={glassStyle}>
        {error && (
          <div
            className="px-6 py-3 flex items-center justify-between border-b border-error/30"
            style={{ background: 'rgba(220, 80, 80, 0.08)' }}
          >
            <span className="text-xs text-error/90">{error}</span>
            <button
              type="button"
              onClick={load}
              className="text-[10px] font-heading tracking-[0.1em] uppercase text-error/80 hover:text-error"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#4D4635]">
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={toggleAll}
                    className="rounded border-[#4D4635] bg-[#1F1B13] accent-gold"
                    aria-label="Select all on page"
                  />
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Product</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Category</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Material</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Tier</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Price</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Featured</th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Updated</th>
                <th className="text-right px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data && (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <span className="inline-flex items-center gap-2 text-xs text-[#D0C5AF]/50">
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang tải…
                    </span>
                  </td>
                </tr>
              )}

              {!loading && data && data.length === 0 && !error && (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <span className="text-xs text-[#D0C5AF]/40">
                      Không có sản phẩm nào phù hợp.
                    </span>
                  </td>
                </tr>
              )}

              {data &&
                data.map((product) => {
                  const isSel = selected.has(product.id);
                  const isDel = deleting.has(product.id);
                  return (
                    <tr
                      key={product.id}
                      className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(product.id)}
                          className="rounded border-[#4D4635] bg-[#1F1B13] accent-gold"
                          aria-label={`Select ${product.title}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {/* TODO: row body click → /admin/products/[id] (detail page not yet built) */}
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="flex items-center gap-3"
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt=""
                              className="w-10 h-10 rounded object-cover border border-[#4D4635]/30"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[#1F1B13] border border-[#4D4635]/30 flex items-center justify-center">
                              <span className="text-[10px] text-[#D0C5AF]/30">🖼</span>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-[#D0C5AF] font-medium">{product.title}</p>
                            <p className="text-[10px] text-[#D0C5AF]/40">{product.slug}</p>
                            {product.code && (
                              <p className="text-[10px] text-gold/40">{product.code}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[#D0C5AF]/70">
                          {CATEGORY_LABELS[product.category] ?? product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[#D0C5AF]/70">
                          {MATERIAL_LABELS[product.material] ?? product.material}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${tierBadge(product.quality_tier)}`}
                        >
                          {product.quality_tier}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[#EAE1D4] font-medium">
                          {formatVND(product.price)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${statusColors[product.status] ?? 'text-[#D0C5AF]/50 border-[#4D4635]/30 bg-transparent'}`}
                        >
                          {STATUS_LABELS[product.status] ?? product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs ${product.is_featured ? 'text-gold' : 'text-[#D0C5AF]/30'}`}
                        >
                          {product.is_featured ? '★' : '☆'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-[#D0C5AF]/40">
                          {product.updated_at?.slice(0, 10) ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* TODO: edit page /admin/products/[id]/edit not yet built */}
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="text-[10px] text-gold/60 hover:text-gold transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteOne(product)}
                            disabled={isDel}
                            className="text-[10px] text-error/60 hover:text-error transition-colors disabled:opacity-50"
                          >
                            {isDel ? '…' : 'Del'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#4D4635]/30">
          <span className="text-[10px] text-[#D0C5AF]/40">
            {total === 0
              ? 'Showing 0 of 0 products'
              : `Showing ${from}–${to} of ${total} products`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-[10px] text-[#D0C5AF]/50 border border-[#4D4635]/30 rounded hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            {pageItems.map((it, idx) =>
              it === 'ellipsis' ? (
                <span
                  key={`e-${idx}`}
                  className="px-2 text-[10px] text-[#D0C5AF]/30"
                >
                  …
                </span>
              ) : (
                <button
                  key={it}
                  type="button"
                  onClick={() => setPage(it)}
                  className={`px-3 py-1 text-[10px] rounded transition-colors ${
                    it === page
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'text-[#D0C5AF]/50 border border-[#4D4635]/30 hover:text-gold'
                  }`}
                >
                  {it}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-3 py-1 text-[10px] text-[#D0C5AF]/50 border border-[#4D4635]/30 rounded hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
