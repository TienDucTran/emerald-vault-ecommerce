'use client';

/**
 * /admin/newsletter — list + search + export + delete subscribers.
 *
 * Data flow:
 *   - GET /api/admin/newsletter?q=&active=&page=&limit=
 *   - DELETE /api/admin/newsletter { id }
 *   - GET /api/admin/newsletter/export (file download)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface Subscriber {
  id: string;
  email: string;
  full_name: string | null;
  source: string | null;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

interface ListResponse {
  ok: true;
  subscribers: Subscriber[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_LIMIT = 20;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NewsletterPage() {
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (opts?: { q?: string; active?: 'all' | 'true' | 'false'; page?: number }) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      const queryQ = opts?.q ?? q;
      const queryActive = opts?.active ?? active;
      const queryPage = opts?.page ?? page;
      if (queryQ.trim()) params.set('q', queryQ.trim());
      params.set('active', queryActive);
      params.set('page', String(queryPage));
      params.set('limit', String(PAGE_LIMIT));
      try {
        const res = await fetch(`/api/admin/newsletter?${params.toString()}`, {
          cache: 'no-store',
        });
        const json = (await res.json()) as ListResponse | { ok: false; message?: string };
        if (!res.ok || !('ok' in json) || !json.ok) {
          setError(('message' in json && json.message) || `Lỗi ${res.status}`);
          setData(null);
        } else {
          setData(json as ListResponse);
        }
      } catch (e) {
        setError((e as Error).message ?? 'Lỗi mạng');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [q, active, page]
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, active]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchData({ q, active, page: 1 });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1),
    [data]
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.message ?? `Lỗi ${res.status}`);
        return;
      }
      setConfirmId(null);
      // Refresh — nếu xoá dòng cuối của trang và page > 1, lùi 1 trang
      if (data && data.subscribers.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchData();
      }
    } catch (e) {
      setError((e as Error).message ?? 'Lỗi mạng');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/admin/newsletter/export';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Newsletter
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">
            Quản lý email subscribers · Tổng:{' '}
            <span className="text-gold">{data?.total ?? 0}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.3)] text-gold hover:bg-gold/10 transition-colors"
            style={{ background: 'rgba(18, 36, 28, 0.6)' }}
          >
            📤 Xuất CSV
          </button>
          <button
            type="button"
            onClick={() => fetchData()}
            disabled={loading}
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-gold text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* Top bar — search + filter */}
      <div
        className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-sm"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo email hoặc tên..."
            className="w-full px-3 py-2 rounded-sm text-sm bg-[#1F1B13] border border-[#4D4635] text-[#EAE1D4] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
            Trạng thái:
          </span>
          <select
            value={active}
            onChange={(e) => {
              setPage(1);
              setActive(e.target.value as 'all' | 'true' | 'false');
            }}
            className="px-3 py-2 rounded-sm text-xs font-heading tracking-[0.05em] bg-[#1F1B13] border border-[#4D4635] text-[#D0C5AF] focus:outline-none focus:border-gold/50"
          >
            <option value="all">Tất cả</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="p-4 rounded-sm border border-error/30 text-error text-sm"
          style={{ background: 'rgba(18, 36, 28, 0.6)' }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr
                style={{ background: 'rgba(31, 27, 19, 0.5)' }}
                className="border-b border-[#4D4635]"
              >
                <th className="text-left px-4 sm:px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Email
                </th>
                <th className="text-left px-4 sm:px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Name
                </th>
                <th className="text-left px-4 sm:px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Source
                </th>
                <th className="text-left px-4 sm:px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Status
                </th>
                <th className="text-left px-4 sm:px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Subscribed
                </th>
                <th className="text-right px-4 sm:px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#4D4635]/10">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 sm:px-6 py-4">
                        <div className="h-3 w-full max-w-[120px] rounded bg-[#1F1B13] animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data && data.subscribers.length > 0 ? (
                data.subscribers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-xs text-[#D0C5AF]">{s.email}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-xs text-[#D0C5AF]/80">
                        {s.full_name || '—'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="inline-block px-2 py-0.5 text-[9px] rounded border border-[#4D4635]/40 text-[#D0C5AF]/70 bg-[#1F1B13]">
                        {s.source ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={
                          s.is_active
                            ? 'text-[10px] font-medium text-success'
                            : 'text-[10px] font-medium text-error'
                        }
                      >
                        {s.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="text-[10px] text-[#D0C5AF]/50">
                        {formatDateTime(s.subscribed_at)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmId(s.id)}
                        disabled={deletingId === s.id}
                        className="text-[10px] font-heading tracking-[0.1em] uppercase text-error/80 hover:text-error border border-error/30 hover:border-error px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        {deletingId === s.id ? 'Đang xoá...' : 'Xoá'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 sm:px-6 py-12 text-center text-xs text-[#D0C5AF]/40"
                  >
                    {loading ? 'Đang tải...' : 'Không có subscriber nào.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-[#4D4635]/30">
            <span className="text-[10px] text-[#D0C5AF]/50">
              Trang {page} / {totalPages} · Tổng {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-sm text-[10px] font-heading tracking-[0.1em] uppercase border border-[#4D4635] text-[#D0C5AF]/70 hover:border-gold/40 hover:text-gold disabled:opacity-40 transition-colors"
              >
                ← Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-sm text-[10px] font-heading tracking-[0.1em] uppercase border border-[#4D4635] text-[#D0C5AF]/70 hover:border-gold/40 hover:text-gold disabled:opacity-40 transition-colors"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-sm p-6 space-y-4"
            style={{
              background: 'rgba(18, 36, 28, 0.95)',
              border: '1px solid rgba(242, 202, 80, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-base font-bold text-[#EAE1D4]">
              Xác nhận xoá subscriber
            </h3>
            <p className="text-sm text-[#D0C5AF]/70">
              Hành động này không thể hoàn tác. Subscriber sẽ bị xoá vĩnh viễn khỏi database.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[#4D4635] text-[#D0C5AF]/70 hover:border-gold/40 hover:text-gold"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmId)}
                disabled={deletingId === confirmId}
                className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase bg-error text-white hover:bg-error/90 disabled:opacity-50"
              >
                {deletingId === confirmId ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#D0C5AF]/30">
        Mẹo: Subscriber cũ cũng có thể quản lý tại{' '}
        <Link href="/admin/settings" className="text-gold hover:underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
