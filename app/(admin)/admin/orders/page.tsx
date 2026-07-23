'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatVND } from '@/lib/utils';
import { toast } from '@/lib/toast/toast-store';
import {
  getOrderStatusMeta,
  getOrderStatusPill,
  getPaymentStatusMeta,
  getPaymentMethodLabel,
} from '@/lib/order/status';
import type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '@/lib/supabase/types';

type OrderRow = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  created_at: string;
  items_count: number;
};

type ListResponse = {
  orders: OrderRow[];
  total: number;
  page: number;
  limit: number;
};

const ORDER_STATUSES: OrderStatus[] = [
  'NEW',
  'WAITING_PAYMENT',
  'WAITING_CONFIRM',
  'CONFIRMED',
  'SHIPPING',
  'DONE',
  'CANCELLED',
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  'PENDING',
  'AWAITING_CONFIRM',
  'PAID',
  'FAILED',
  'REFUNDED',
  'REFUND_REQUESTED',
];
const PAYMENT_METHODS: PaymentMethod[] = ['MOMO', 'COD', 'BANK_TRANSFER'];

function formatDate(iso: string): string {
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

export default function OrdersPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [status, paymentStatus]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      if (debouncedQ) params.set('q', debouncedQ);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
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
  }, [page, limit, status, paymentStatus, debouncedQ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    if (debouncedQ) params.set('q', debouncedQ);
    const qs = params.toString();
    const url = `/api/admin/orders/export${qs ? `?${qs}` : ''}`;
    try {
      window.open(url, '_blank');
    } catch {
      window.location.href = url;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Orders
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">
            Quản lý đơn hàng
            {data ? ` — ${data.total} đơn` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors"
            style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)' }}
          >
            Xuất CSV
          </button>
          <button
            onClick={() => {
              fetchList();
              toast.info('Đã làm mới');
            }}
            disabled={loading}
            className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-gold/30 text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
            style={{ background: 'rgba(18, 36, 28, 0.6)', backdropFilter: 'blur(6px)' }}
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-sm flex flex-wrap items-center gap-3"
        style={{
          background: 'rgba(18, 36, 28, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo mã đơn, tên hoặc SĐT..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/40"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus | '')}
          className="px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF]/70 focus:outline-none focus:border-gold/40"
        >
          <option value="">Tất cả thanh toán</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {getPaymentStatusMeta(s).label} ({s})
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setQ('');
            setStatus('');
            setPaymentStatus('');
            setPage(1);
          }}
          className="px-4 py-2 text-[10px] text-gold/60 hover:text-gold font-heading tracking-[0.1em] uppercase transition-colors"
        >
          Xoá lọc
        </button>
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
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-[#4D4635]">
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Mã đơn
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Khách hàng
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  SĐT
                </th>
                <th className="text-right px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Tổng tiền
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Thanh toán
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Trạng thái
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Ngày tạo
                </th>
                <th className="text-right px-6 py-4 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={`sk-${i}`}
                    className="border-b border-[#4D4635]/10"
                  >
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div
                          className="h-3 rounded animate-pulse"
                          style={{ background: 'rgba(77, 70, 53, 0.25)' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data && data.orders.length > 0 ? (
                data.orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-xs text-gold font-heading hover:text-gold/80"
                      >
                        {o.code}
                      </Link>
                      <div className="text-[10px] text-[#D0C5AF]/40 mt-0.5">
                        {o.items_count} sp
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[#D0C5AF]">
                        {o.customer_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[#D0C5AF]/70">
                        {o.customer_phone}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-[#EAE1D4] font-medium whitespace-nowrap">
                        {formatVND(o.total_amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[#D0C5AF]">
                        {getPaymentMethodLabel(o.payment_method)}
                        <span className="text-[#D0C5AF]/40"> · </span>
                        <span className={getPaymentStatusMeta(o.payment_status).textColor}>
                          {getPaymentStatusMeta(o.payment_status).label}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${getOrderStatusPill(o.status)}`}
                      >
                        {getOrderStatusMeta(o.status).label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] text-[#D0C5AF]/50">
                        {formatDate(o.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1.5 rounded border border-gold/30 bg-gold/5 px-4 py-2 text-xs font-heading font-bold tracking-[0.1em] uppercase text-gold transition-colors hover:bg-gold/15 hover:border-gold/60"
                      >
                        Xem chi tiết
                        <span aria-hidden>→</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center text-sm text-[#D0C5AF]/40"
                  >
                    Chưa có đơn hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 border-t border-[#4D4635]/30">
          <span className="text-[10px] text-[#D0C5AF]/40">
            {data
              ? `Trang ${data.page}/${totalPages} · ${data.total} đơn`
              : '—'}
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
    </div>
  );
}
