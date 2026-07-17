'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Loader2, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast/toast-store';
import { Modal } from '@/components/ui/modal';
import type { CollectionRow } from '@/lib/supabase/types';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface AdminCollectionItem extends CollectionRow {
  product_count: number;
}
interface ListResponse {
  collections: AdminCollectionItem[];
  total: number;
  page: number;
  limit: number;
}

const glassStyle: CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};
const inputCls =
  'w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/40';

const LIMIT = 20;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CollectionsPage() {
  const confirm = useConfirm();

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reorder modal
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderItems, setReorderItems] = useState<{ id: string; display_order: number; name: string }[]>([]);
  const [savingReorder, setSavingReorder] = useState(false);

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(LIMIT));
      if (debouncedQ) params.set('q', debouncedQ);

      const res = await fetch(
        `/api/admin/collections/list?${params.toString()}`,
        { cache: 'no-store' }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message ?? `Lỗi ${res.status}`);
        setData(null);
        return;
      }
      setData(json as ListResponse);
    } catch (e) {
      setError((e as Error).message ?? 'Lỗi mạng');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  const onDelete = async (c: AdminCollectionItem) => {
    const ok = await confirm({
      title: 'Xoá bộ sưu tập?',
      description: `Bộ sưu tập "${c.name}" sẽ bị xoá. Các sản phẩm thuộc bộ sưu tập sẽ KHÔNG bị xoá (chỉ set collection_id = null). Hành động này không thể hoàn tác.`,
      variant: 'danger',
      icon: 'danger',
      confirmText: 'Xoá',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/collections/${c.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.message ?? 'Xoá thất bại.');
        return;
      }
      toast.error('Đã xoá bộ sưu tập.');
      fetchList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi mạng');
    }
  };

  const openReorder = () => {
    if (!data) return;
    setReorderItems(
      data.collections.map((c) => ({
        id: c.id,
        display_order: c.display_order,
        name: c.name,
      }))
    );
    setReorderOpen(true);
  };

  const setReorderOrder = (id: string, val: number) => {
    setReorderItems((items) =>
      items.map((it) => (it.id === id ? { ...it, display_order: val } : it))
    );
  };

  const moveReorderRow = (id: string, dir: -1 | 1) => {
    setReorderItems((items) => {
      const idx = items.findIndex((it) => it.id === id);
      if (idx < 0) return items;
      const target = idx + dir;
      if (target < 0 || target >= items.length) return items;
      const next = items.slice();
      const [removed] = next.splice(idx, 1);
      next.splice(target, 0, removed);
      // Re-assign display_order theo vị trí mới với step 10
      return next.map((it, i) => ({ ...it, display_order: (i + 1) * 10 }));
    });
  };

  const saveReorder = async () => {
    setSavingReorder(true);
    try {
      const items = reorderItems.map((it) => ({
        id: it.id,
        display_order: Number(it.display_order) || 0,
      }));
      const res = await fetch('/api/admin/collections/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.message ?? 'Lưu thứ tự thất bại.');
        return;
      }
      toast.success('Đã lưu thứ tự hiển thị.');
      setReorderOpen(false);
      fetchList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi mạng');
    } finally {
      setSavingReorder(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Bộ sưu tập
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">
            Quản lý các bộ sưu tập trang sức
            {data ? ` — ${data.total} bộ` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openReorder}
            disabled={loading || !data || data.collections.length === 0}
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            style={glassStyle}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sắp xếp lại
          </button>
          <Link
            href="/admin/collections/new"
            className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo mới
          </Link>
        </div>
      </div>

      {/* FILTERS */}
      <div className="p-4 rounded-sm flex flex-wrap items-center gap-3" style={glassStyle}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên hoặc slug…"
          className={cn(inputCls, 'flex-1 min-w-[200px]')}
        />
        <button
          onClick={() => {
            setQ('');
            setPage(1);
          }}
          className="px-4 py-2 text-[10px] text-gold/60 hover:text-gold font-heading tracking-[0.1em] uppercase transition-colors"
        >
          Xoá lọc
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div
          className="p-4 rounded-sm border border-error/30 text-error text-sm"
          style={{ background: 'rgba(18, 36, 28, 0.6)' }}
        >
          {error}
        </div>
      )}

      {/* TABLE */}
      <div
        className="rounded-sm overflow-hidden"
        style={glassStyle}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-[#4D4635]">
                <th className="text-left px-4 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Tên
                </th>
                <th className="text-left px-4 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Slug
                </th>
                <th className="text-right px-4 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Sản phẩm
                </th>
                <th className="text-left px-4 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Trạng thái
                </th>
                <th className="text-right px-4 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Order
                </th>
                <th className="text-left px-4 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Ra mắt
                </th>
                <th className="text-left px-4 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Cập nhật
                </th>
                <th className="text-right px-4 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-[#4D4635]/10">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div
                          className="h-3 rounded animate-pulse"
                          style={{ background: 'rgba(77, 70, 53, 0.25)' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data && data.collections.length > 0 ? (
                data.collections.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/collections/${c.id}`}
                        className="text-xs text-[#EAE1D4] hover:text-gold font-medium line-clamp-1"
                      >
                        {c.name}
                      </Link>
                      {c.description && (
                        <p className="text-[10px] text-[#D0C5AF]/40 mt-0.5 line-clamp-1 max-w-[260px]">
                          {c.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[10px] text-gold/80 font-mono">/{c.slug}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-xs text-[#D0C5AF] font-mono">
                        {c.product_count}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {c.is_published ? (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded border text-success border-success/30 bg-success/10">
                          Published
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded border text-[#D0C5AF]/50 border-[#4D4635]/30">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-[10px] text-[#D0C5AF]/60 font-mono">
                        {c.display_order}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[10px] text-[#D0C5AF]/50 font-mono">
                        {formatDate(c.launch_at)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[10px] text-[#D0C5AF]/50">
                        {formatDateTime(c.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          href={`/admin/collections/${c.id}`}
                          className="text-[10px] text-gold hover:text-gold/80 font-heading tracking-[0.1em] uppercase"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => onDelete(c)}
                          className="text-[10px] text-error/70 hover:text-error font-heading tracking-[0.1em] uppercase inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center text-sm text-[#D0C5AF]/40"
                  >
                    {debouncedQ
                      ? 'Không tìm thấy bộ sưu tập nào khớp.'
                      : 'Chưa có bộ sưu tập nào. Bấm "Tạo mới" để bắt đầu.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 border-t border-[#4D4635]/30">
          <span className="text-[10px] text-[#D0C5AF]/40">
            {data ? `Trang ${data.page}/${totalPages} · ${data.total} bộ` : '—'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              className="px-3 py-1 text-[10px] text-[#D0C5AF]/50 border border-[#4D4635]/30 rounded hover:text-gold hover:border-gold/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="px-3 py-1 text-[10px] bg-gold/20 text-gold border border-gold/40 rounded">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
              className="px-3 py-1 text-[10px] text-[#D0C5AF]/50 border border-[#4D4635]/30 rounded hover:text-gold hover:border-gold/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* REORDER MODAL */}
      <Modal
        open={reorderOpen}
        onClose={() => !savingReorder && setReorderOpen(false)}
        title="Sắp xếp lại thứ tự hiển thị"
        description="Dùng nút ↑/↓ để đổi vị trí nhanh, hoặc sửa trực tiếp display_order. Lưu sẽ cập nhật tất cả trong 1 lần."
        size="md"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {reorderItems.map((it, i) => (
            <div
              key={it.id}
              className="flex items-center gap-2 p-2 rounded-sm border border-[#4D4635]/30"
              style={glassStyle}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveReorderRow(it.id, -1)}
                  disabled={i === 0 || savingReorder}
                  className="text-[#D0C5AF]/60 hover:text-gold text-xs leading-none disabled:opacity-30"
                  aria-label="Lên"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveReorderRow(it.id, 1)}
                  disabled={i === reorderItems.length - 1 || savingReorder}
                  className="text-[#D0C5AF]/60 hover:text-gold text-xs leading-none disabled:opacity-30"
                  aria-label="Xuống"
                >
                  ▼
                </button>
              </div>
              <span className="text-xs text-[#D0C5AF] flex-1 min-w-0 truncate">
                {it.name}
              </span>
              <input
                type="number"
                min={0}
                value={it.display_order}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setReorderOrder(it.id, Number.isFinite(v) ? v : 0);
                }}
                disabled={savingReorder}
                className="w-20 px-2 py-1 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs font-mono text-[#D0C5AF] focus:outline-none focus:border-gold/40"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-[#4D4635]/30">
          <button
            type="button"
            onClick={() => setReorderOpen(false)}
            disabled={savingReorder}
            className="px-4 py-2 text-xs text-[#D0C5AF]/70 hover:text-[#EAE1D4] inline-flex items-center gap-2"
          >
            <X className="w-3.5 h-3.5" />
            Huỷ
          </button>
          <button
            type="button"
            onClick={saveReorder}
            disabled={savingReorder}
            className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {savingReorder ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {savingReorder ? 'Đang lưu…' : 'Lưu thứ tự'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Local cn (avoid extra import for single use)                              */
/* -------------------------------------------------------------------------- */
function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
