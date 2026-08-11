'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from '@/lib/toast/toast-store';

const glassStyle = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};
const inputCls =
  'w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/40';

interface FormData {
  site_name: string;
  contact_email: string;
  contact_phone: string;
  contact_zalo: string;
  address: string;
}

export function SiteInfoTab() {
  const [data, setData] = useState<FormData>({
    site_name: '',
    contact_email: '',
    contact_phone: '',
    contact_zalo: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        const map = json.data as Record<string, string>;
        setData({
          site_name: map['site_name'] ?? '',
          contact_email: map['contact_email'] ?? '',
          contact_phone: map['contact_phone'] ?? '',
          contact_zalo: map['contact_zalo'] ?? '',
          address: map['address'] ?? '',
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ settings: data }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.message ?? 'Lưu thất bại.');
        return;
      }
      toast.success('✓ Đã lưu thông tin website.');
    } catch {
      toast.error('Lỗi mạng.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gold/50" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-4 sm:p-6 rounded-sm space-y-5" style={glassStyle}>
        <h2 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
          Site Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Site Name
            </label>
            <input
              type="text"
              value={data.site_name}
              onChange={(e) => setData({ ...data, site_name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Contact Email
            </label>
            <input
              type="email"
              value={data.contact_email}
              onChange={(e) => setData({ ...data, contact_email: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Contact Phone
            </label>
            <input
              type="text"
              value={data.contact_phone}
              onChange={(e) => setData({ ...data, contact_phone: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Address
            </label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => setData({ ...data, address: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Zalo / SĐT Zalo OA
            </label>
            <input
              type="text"
              value={data.contact_zalo}
              onChange={(e) => setData({ ...data, contact_zalo: e.target.value })}
              placeholder="0901234567"
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-[#D0C5AF]/30">
              SĐT Zalo hoặc Zalo OA ID — dùng cho nút "Chat Zalo" và tích hợp OA API.
            </p>
          </div>
        </div>
      </div>

      {/* Shipping (placeholder — future: move to site_settings) */}
      <div className="p-4 sm:p-6 rounded-sm space-y-5" style={glassStyle}>
        <h2 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
          Shipping
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Default Shipping Fee
            </label>
            <input type="text" defaultValue="₫30,000" className={inputCls} disabled />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Free Shipping Threshold
            </label>
            <input type="text" defaultValue="₫500,000" className={inputCls} disabled />
          </div>
        </div>
        <p className="text-[10px] text-[#D0C5AF]/30">Cấu hình vận chuyển sẽ được thêm sau.</p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Đang lưu…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}