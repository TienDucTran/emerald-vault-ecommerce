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
}

export function AddressBook({ userId }: AddressBookProps) {
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
          body: JSON.stringify({ ...values, user_id: userId }),
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">
            SỔ ĐỊA CHỈ
          </h1>
          <p className="text-base text-text-muted">
            Lưu địa chỉ giao hàng để thanh toán nhanh hơn.
          </p>
        </div>
        {status !== 'loading' && !showForm ? (
          <Button type="button" variant="gold" size="md" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Thêm địa chỉ
          </Button>
        ) : null}
      </div>

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
        <div className="flex flex-col items-center gap-3 rounded-md border border-gold/20 bg-surface-emerald p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          <p className="text-sm text-text-muted">Đang tải sổ địa chỉ…</p>
        </div>
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-gold/20 bg-surface-emerald p-12 text-center">
          <p className="text-sm text-text-muted">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Thử lại
          </Button>
        </div>
      ) : status === 'empty' ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-gold/20 bg-surface-emerald p-12 text-center">
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
          <Button type="button" variant="gold" size="md" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Thêm địa chỉ
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
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
      )}

      <div className="flex justify-center pt-4">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </div>
    </div>
  );
}
