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

interface FooterData {
  footer_tagline: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
}

export function FooterTab() {
  const [data, setData] = useState<FooterData>({
    footer_tagline: '',
    social_instagram: '',
    social_facebook: '',
    social_tiktok: '',
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
          footer_tagline: map['footer_tagline'] ?? '',
          social_instagram: map['social_instagram'] ?? '',
          social_facebook: map['social_facebook'] ?? '',
          social_tiktok: map['social_tiktok'] ?? '',
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
      toast.success('✓ Đã lưu footer settings.');
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
          Footer Content
        </h2>

        {/* Tagline */}
        <div>
          <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
            Footer Tagline
          </label>
          <textarea
            value={data.footer_tagline}
            onChange={(e) => setData({ ...data, footer_tagline: e.target.value })}
            placeholder="Trang sức si Nhật vintage — tuyển chọn thủ công, đã qua thẩm định chất lượng."
            rows={2}
            className={inputCls}
          />
        </div>

        {/* Social Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Instagram URL
            </label>
            <input
              type="text"
              value={data.social_instagram}
              onChange={(e) => setData({ ...data, social_instagram: e.target.value })}
              placeholder="https://instagram.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Facebook URL
            </label>
            <input
              type="text"
              value={data.social_facebook}
              onChange={(e) => setData({ ...data, social_facebook: e.target.value })}
              placeholder="https://facebook.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              TikTok URL
            </label>
            <input
              type="text"
              value={data.social_tiktok}
              onChange={(e) => setData({ ...data, social_tiktok: e.target.value })}
              placeholder="https://tiktok.com"
              className={inputCls}
            />
          </div>
        </div>
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