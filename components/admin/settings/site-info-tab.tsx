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
  live_stream_url: string;
  map_embed_url: string;
  map_link_url: string;
}

export function SiteInfoTab() {
  const [data, setData] = useState<FormData>({
    site_name: '',
    contact_email: '',
    contact_phone: '',
    contact_zalo: '',
    address: '',
    live_stream_url: '',
    map_embed_url: '',
    map_link_url: '',
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
          live_stream_url: map['live_stream_url'] ?? '',
          map_embed_url: map['map_embed_url'] ?? '',
          map_link_url: map['map_link_url'] ?? '',
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
              SĐT Zalo hoặc Zalo OA ID — dùng cho nút &ldquo;Chat Zalo&rdquo; và tích hợp OA API.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Live Stream URL
            </label>
            <input
              type="text"
              value={data.live_stream_url}
              onChange={(e) => setData({ ...data, live_stream_url: e.target.value })}
              placeholder="https://www.tiktok.com/@your-channel/live hoặc https://www.facebook.com/..."
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-[#D0C5AF]/30">
              Đường dẫn đến kênh live stream (TikTok Live, Facebook Live, YouTube...). Hiển thị trên trang Liên hệ.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Google Maps Embed URL
            </label>
            <input
              type="text"
              value={data.map_embed_url}
              onChange={(e) => setData({ ...data, map_embed_url: e.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=..."
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-[#D0C5AF]/30">
              Mở Google Maps → tìm showroom → <span className="text-gold/60">Share</span> → <span className="text-gold/60">Embed a map</span> → copy phần <code className="text-gold/60">src=&quot;...&quot;</code> dán vào đây. Nếu để trống, bản đồ sẽ tự query theo địa chỉ (có thể không chính xác).
            </p>
            <MapUrlStatusHint value={data.map_embed_url} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
              Google Maps Share Link (cho nút click)
            </label>
            <input
              type="text"
              value={data.map_link_url}
              onChange={(e) => setData({ ...data, map_link_url: e.target.value })}
              placeholder="https://maps.app.goo.gl/... hoặc https://www.google.com/maps/place/..."
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-[#D0C5AF]/30">
              Mở Google Maps → tìm showroom → <span className="text-gold/60">Share</span> → <span className="text-gold/60">Copy link</span> (link chia sẻ dạng <code className="text-gold/60">maps.app.goo.gl/...</code> hoặc place URL). Dùng cho nút &quot;xem trên bản đồ&quot; mở Maps app đúng vị trí. Embed URL (field trên) <u>không click được</u> — phải dùng link này.
            </p>
            <MapLinkUrlStatusHint value={data.map_link_url} />
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

/**
 * MapUrlStatusHint — kiểm tra real-time URL admin dán vào field Google Maps,
 * báo cho admin biết URL có nhúng iframe được không (tránh dán link chia sẻ/place URL
 * rồi map không hiện).
 */
function MapUrlStatusHint({ value }: { value: string }) {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  // Trích src nếu dán cả <iframe src="...">
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  const url = (iframeMatch ? iframeMatch[1] : raw).trim();

  if (/\/maps\/embed(\?|$|&)/i.test(url) || /output=embed/i.test(url)) {
    return (
      <p className="mt-1 text-[10px] text-emerald-400/80">
        ✓ URL embed hợp lệ — bản đồ sẽ nhúng trực tiếp chính xác vị trí.
      </p>
    );
  }

  if (iframeMatch) {
    return (
      <p className="mt-1 text-[10px] text-emerald-400/80">
        ✓ Đã trích URL từ mã iframe — sẽ nhúng trực tiếp.
      </p>
    );
  }

  if (/maps\.app\.goo\.gl/i.test(url) || /\/maps\/place\//i.test(url) || /\/maps\/search\//i.test(url) || /\/maps\/?\?/i.test(url)) {
    return (
      <p className="mt-1 text-[10px] text-amber-400/80">
        ⚠ Đây là link chia sẻ/place — mở Maps app được nhưng <u>không nhúng iframe</u> được.
        Bản đồ nhúng sẽ fallback theo địa chỉ. Để nhúng đúng vị trí: dùng <span className="text-gold/60">Embed a map</span> → copy <code>src</code>.
      </p>
    );
  }

  return (
    <p className="mt-1 text-[10px] text-amber-400/80">
      ⚠ URL không nhận dạng được là Google Maps embed. Vui lòng kiểm tra lại.
    </p>
  );
}

/**
 * MapLinkUrlStatusHint — kiểm tra link chia sẻ admin dán vào field "Share Link"
 * (dùng cho nút click). Báo có mở Maps app được không.
 */
function MapLinkUrlStatusHint({ value }: { value: string }) {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  const url = raw;

  // Embed URL dán nhầm field link → cảnh báo
  if (/\/maps\/embed(\?|$|&)/i.test(url)) {
    return (
      <p className="mt-1 text-[10px] text-rose-400/80">
        ✗ Đây là embed URL — không click mở Maps app được (sẽ báo &quot;must be used in an iframe&quot;). Dán embed URL vào field phía trên, còn field này dùng link Share → Copy link.
      </p>
    );
  }

  if (/maps\.app\.goo\.gl/i.test(url) || /\/maps\/place\//i.test(url) || /\/maps\/search\//i.test(url)) {
    return (
      <p className="mt-1 text-[10px] text-emerald-400/80">
        ✓ Link chia sẻ hợp lệ — nút click sẽ mở Maps app đúng vị trí.
      </p>
    );
  }

  if (/^https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com)/i.test(url)) {
    return (
      <p className="mt-1 text-[10px] text-emerald-400/80">
        ✓ URL Google Maps hợp lệ — sẽ dùng làm link click.
      </p>
    );
  }

  return (
    <p className="mt-1 text-[10px] text-amber-400/80">
      ⚠ URL không nhận dạng được là link Google Maps. Vui lòng kiểm tra lại.
    </p>
  );
}