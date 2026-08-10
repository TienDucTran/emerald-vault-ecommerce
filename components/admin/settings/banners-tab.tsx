'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/lib/toast/toast-store';
import { MediaPicker } from '@/components/admin/media/media-picker';
import type { HomeBannerRow } from '@/lib/supabase/types';
import type { BannerSlotKey } from '@/lib/types';

const glassStyle = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};
const inputCls =
  'w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/40';

const SLOT_LABELS: Record<string, string> = {
  main: 'Main (Bên trái — lớn)',
  top: 'Top (Bên phải trên — rộng)',
  bottom_left: 'Bottom Left (Bên phải dưới trái)',
  bottom_right: 'Bottom Right (Bên phải dưới phải)',
};

const SLOT_OPTIONS: { value: BannerSlotKey; label: string }[] = [
  { value: 'main', label: 'Main' },
  { value: 'top', label: 'Top' },
  { value: 'bottom_left', label: 'Bottom Left' },
  { value: 'bottom_right', label: 'Bottom Right' },
];

interface BannerForm {
  id?: string;
  slot_key: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  display_order: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
}

function emptyForm(slot: string): BannerForm {
  return {
    slot_key: slot,
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    display_order: 0,
    is_active: true,
    valid_from: '',
    valid_until: '',
  };
}

function fromRow(r: HomeBannerRow): BannerForm {
  return {
    id: r.id,
    slot_key: r.slot_key,
    title: r.title,
    subtitle: r.subtitle ?? '',
    image_url: r.image_url,
    link_url: r.link_url,
    display_order: r.display_order,
    is_active: r.is_active,
    valid_from: r.valid_from ?? '',
    valid_until: r.valid_until ?? '',
  };
}

export function BannersTab() {
  const [banners, setBanners] = useState<BannerForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/home-banners', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        const rows = json.data as HomeBannerRow[];
        // Group by slot — ensure all 4 slots have a form
        const slotMap: Record<string, BannerForm> = {};
        for (const row of rows) {
          slotMap[row.slot_key] = fromRow(row);
        }
        const allSlots: BannerForm[] = SLOT_OPTIONS.map((opt, idx) =>
          slotMap[opt.value] ?? emptyForm(opt.value)
        );
        // Assign display_order if empty
        allSlots.forEach((f, i) => {
          if (!f.display_order) f.display_order = (i + 1) * 10;
        });
        setBanners(allSlots);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const updateBanner = (slot: string, patch: Partial<BannerForm>) => {
    setBanners((prev) => prev.map((b) => (b.slot_key === slot ? { ...b, ...patch } : b)));
  };

  const handleSave = async (banner: BannerForm) => {
    setSavingId(banner.slot_key);
    try {
      const payload = {
        slot_key: banner.slot_key,
        title: banner.title.trim(),
        subtitle: banner.subtitle.trim() || null,
        image_url: banner.image_url,
        link_url: banner.link_url,
        display_order: banner.display_order,
        is_active: banner.is_active,
        valid_from: banner.valid_from || null,
        valid_until: banner.valid_until || null,
      };

      if (banner.id) {
        // Update existing
        const res = await fetch(`/api/admin/home-banners/${banner.id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          toast.error(json?.message ?? 'Lưu thất bại.');
          return;
        }
      } else {
        // Create new
        const res = await fetch('/api/admin/home-banners', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          toast.error(json?.message ?? 'Tạo thất bại.');
          return;
        }
        // Update with created ID
        const created = json.data as HomeBannerRow;
        updateBanner(banner.slot_key, { id: created.id });
      }
      toast.success(`✓ Đã lưu banner "${SLOT_LABELS[banner.slot_key] ?? banner.slot_key}".`);
    } catch {
      toast.error('Lỗi mạng.');
    } finally {
      setSavingId(null);
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
    <div className="space-y-4">
      <p className="text-sm text-[#D0C5AF]/60">
        Quản lý 4 banner trên homepage. Mỗi slot có thể đổi ảnh, title, link. Đổi mỗi tháng không cần deploy.
      </p>

      {banners.map((banner) => (
        <div key={banner.slot_key} className="p-4 sm:p-6 rounded-sm space-y-4" style={glassStyle}>
          {/* Slot header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
                {SLOT_LABELS[banner.slot_key] ?? banner.slot_key}
              </h3>
              {banner.id && (
                <span className="text-[9px] text-[#D0C5AF]/30 font-mono">#{banner.id.slice(0, 8)}</span>
              )}
            </div>
            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={banner.is_active}
                onChange={(e) => updateBanner(banner.slot_key, { is_active: e.target.checked })}
                className="w-3.5 h-3.5 accent-gold"
              />
              <span className="text-[10px] text-[#D0C5AF]/50 font-heading tracking-[0.1em] uppercase">
                Active
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image preview + picker */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
                Banner Image
              </label>
              <div className="flex items-start gap-3">
                {banner.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-32 h-32 object-cover rounded-sm border border-[#4D4635]/30"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-sm border border-dashed border-[#4D4635]/50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-[#D0C5AF]/20" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={banner.image_url}
                    onChange={(e) => updateBanner(banner.slot_key, { image_url: e.target.value })}
                    placeholder="/images/home/... hoặc URL"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setPickerOpenFor(banner.slot_key)}
                    className="px-3 py-1.5 rounded-sm text-[10px] font-heading tracking-[0.1em] uppercase border border-gold/20 text-gold/70 hover:text-gold transition-colors inline-flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3 h-3" />
                    Chọn từ Media Library
                  </button>
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={banner.title}
                onChange={(e) => updateBanner(banner.slot_key, { title: e.target.value })}
                placeholder="Dây Chuyền & Pendants"
                className={inputCls}
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
                Subtitle
              </label>
              <input
                type="text"
                value={banner.subtitle}
                onChange={(e) => updateBanner(banner.slot_key, { subtitle: e.target.value })}
                placeholder="Di sản từ các triều đại cổ"
                className={inputCls}
              />
            </div>

            {/* Link URL */}
            <div>
              <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
                Link URL
              </label>
              <input
                type="text"
                value={banner.link_url}
                onChange={(e) => updateBanner(banner.slot_key, { link_url: e.target.value })}
                placeholder="/san-pham?category=DAY_CHUYEN"
                className={inputCls}
              />
            </div>

            {/* Display order */}
            <div>
              <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
                Display Order
              </label>
              <input
                type="number"
                value={banner.display_order}
                onChange={(e) =>
                  updateBanner(banner.slot_key, {
                    display_order: parseInt(e.target.value, 10) || 0,
                  })
                }
                className={inputCls}
              />
            </div>

            {/* Valid from / until — schedule */}
            <div>
              <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
                Valid From (optional)
              </label>
              <input
                type="datetime-local"
                value={banner.valid_from ? banner.valid_from.slice(0, 16) : ''}
                onChange={(e) =>
                  updateBanner(banner.slot_key, { valid_from: e.target.value || '' })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1.5">
                Valid Until (optional)
              </label>
              <input
                type="datetime-local"
                value={banner.valid_until ? banner.valid_until.slice(0, 16) : ''}
                onChange={(e) =>
                  updateBanner(banner.slot_key, { valid_until: e.target.value || '' })
                }
                className={inputCls}
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleSave(banner)}
              disabled={savingId === banner.slot_key || !banner.title || !banner.image_url || !banner.link_url}
              className="px-5 py-2 rounded-sm text-[10px] font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {savingId === banner.slot_key ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              {savingId === banner.slot_key ? 'Đang lưu…' : 'Lưu banner'}
            </button>
          </div>

          {/* Media Picker for this slot */}
          {pickerOpenFor === banner.slot_key && (
            <MediaPicker
              open={true}
              onOpenChange={(o) => !o && setPickerOpenFor(null)}
              mode="single"
              folder="banners"
              onConfirm={(urls) => {
                if (urls.length > 0) {
                  updateBanner(banner.slot_key, { image_url: urls[0] });
                }
                setPickerOpenFor(null);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}