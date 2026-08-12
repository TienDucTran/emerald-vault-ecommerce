'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressCard } from '@/components/account/address-card';
import {
  AddressForm,
  type AddressFormValues,
} from '@/components/account/address-form';
import type { Address } from '@/lib/types/account';

type Status = 'loading' | 'ready' | 'error' | 'empty';

export interface AddressBookProps {
  userId: string;
  /**
   * Khi true, render kèm header (h1 + mô tả + button "Thêm địa chỉ").
   * Mặc định false — header được render bởi page wrapper (tránh duplicate text
   * khi page đã có header riêng).
   */
  showHeader?: boolean;
  /**
   * Khi true, KHÔNG render button "Thêm địa chỉ" ở header — dùng cho
   * AddressPicker trong checkout (vì picker có UI riêng để chọn/thêm).
   */
  hideAddButton?: boolean;
}

export function AddressBook({
  userId,
  showHeader = false,
  hideAddButton = false,
}: AddressBookProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/account/addresses', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: Address[] };
      const list = json.data ?? [];
      setAddresses(list);
      setStatus(list.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      console.error('[AddressBook] fetch error:', err);
      setErrorMsg('Không thể tải sổ địa chỉ. Vui lòng thử lại.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (a: Address) => {
    setEditing(a);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (values: AddressFormValues) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      if (editing) {
        const res = await fetch(`/api/account/addresses/${editing.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(json?.message ?? `HTTP ${res.status}`);
        }
      } else {
        const res = await fetch('/api/account/addresses', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(json?.message ?? `HTTP ${res.status}`);
        }
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Address) => {
    setBusyId(a.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/account/addresses/${a.id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const json = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(json?.message ?? `HTTP ${res.status}`);
      }
      setAddresses((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      console.error('[AddressBook] delete error:', err);
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể xoá địa chỉ.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (a: Address) => {
    setBusyId(a.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/account/addresses/${a.id}/default`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(json?.message ?? `HTTP ${res.status}`);
      }
      setAddresses((prev) =>
        prev.map((x) => ({ ...x, is_default: x.id === a.id }))
      );
    } catch (err) {
      console.error('[AddressBook] set-default error:', err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể đặt địa chỉ mặc định.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {showHeader ? (
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="absolute -left-32 -top-32 pointer-events-none h-96 w-96 rounded-full bg-gold/5 blur-[100px]" />
          <div>
            <h1 className="mb-2 font-heading text-3xl font-bold tracking-[0.05em] text-gold drop-shadow-md md:text-4xl">
              SỔ ĐỊA CHỈ
            </h1>
            <p className="max-w-xl font-sans text-sm text-text-muted">
              Lưu giữ các địa chỉ nhận hàng để trải nghiệm mua sắm những tuyệt tác trang sức thêm phần thuận tiện và riêng tư.
            </p>
          </div>
          {status !== 'loading' && !showForm && !hideAddButton ? (
            <button
              type="button"
              onClick={handleAdd}
              className="group relative overflow-hidden rounded-sm border border-gold/30 bg-surface px-6 py-3 transition-all duration-300 hover:border-gold/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] focus:outline-none"
            >
              <span className="relative z-10 flex items-center gap-2 font-heading text-[10px] tracking-[0.15em] text-gold">
                <Plus className="h-4 w-4" />
                THÊM ĐỊA CHỈ MỚI
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {errorMsg ? (
        <div
          role="alert"
          className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          {errorMsg}
        </div>
      ) : null}

      {showForm ? (
        <AddressForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancelForm}
          isLoading={saving}
        />
      ) : null}

      {status === 'loading' ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-gold/20 bg-surface-emerald p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          <p className="text-sm text-text-muted">Đang tải sổ địa chỉ…</p>
        </div>
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-gold/20 bg-surface-emerald p-12 text-center">
          <p className="text-sm text-text-muted">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-sm border border-gold/30 px-4 py-2 font-heading text-[10px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/5"
          >
            Thử lại
          </button>
        </div>
      ) : status === 'empty' && !showForm ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-gold/20 bg-surface-emerald p-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-gold/30 bg-surface">
            <Inbox className="h-7 w-7 text-gold" />
          </div>
          <h2 className="font-heading text-xl text-gold">
            Bạn chưa có địa chỉ nào.
          </h2>
          <p className="max-w-md text-sm text-text-muted">
            Lưu địa chỉ giao hàng để việc thanh toán nhanh hơn ở những lần mua
            sau.
          </p>
          {!hideAddButton ? (
            <button
              type="button"
              onClick={handleAdd}
              className="group relative overflow-hidden rounded-sm border border-gold/30 bg-surface px-6 py-3 transition-all duration-300 hover:border-gold/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              <span className="relative z-10 flex items-center gap-2 font-heading text-[10px] tracking-[0.15em] text-gold">
                <Plus className="h-4 w-4" />
                THÊM ĐỊA CHỈ MỚI
              </span>
            </button>
          ) : null}
        </div>
      ) : status !== 'empty' ? (
        <div className="flex flex-col gap-6">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              isLoading={busyId === a.id}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
