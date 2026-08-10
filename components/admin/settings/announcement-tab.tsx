'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from '@/lib/toast/toast-store';

const glassStyle = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};
const inputCls =
  'w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/40';

export function AnnouncementTab() {
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        const map = json.data as Record<string, string>;
        if (map['announcement_messages']) {
          try {
            const parsed = JSON.parse(map['announcement_messages']);
            if (Array.isArray(parsed)) {
              setMessages(parsed.filter((s) => typeof s === 'string'));
            }
          } catch {
            setMessages([]);
          }
        }
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

  const handleAdd = () => {
    setMessages((prev) => [...prev, '']);
  };

  const handleRemove = (idx: number) => {
    setMessages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = (idx: number, value: string) => {
    setMessages((prev) => prev.map((m, i) => (i === idx ? value : m)));
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    setMessages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = messages.map((m) => m.trim()).filter((m) => m.length > 0);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          settings: {
            announcement_messages: JSON.stringify(cleaned),
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.message ?? 'Lưu thất bại.');
        return;
      }
      setMessages(cleaned);
      toast.success('✓ Đã lưu announcement messages.');
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
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
            Announcement Bar Messages
          </h2>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-sm text-[10px] font-heading tracking-[0.1em] uppercase border border-gold/20 text-gold/70 hover:text-gold transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" />
            Thêm message
          </button>
        </div>
        <p className="text-[10px] text-[#D0C5AF]/40">
          Các message sẽ xoay vòng tự động trên announcement bar (mỗi 4 giây).
        </p>

        {messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-[#D0C5AF]/40">
            Chưa có message nào. Bấm "Thêm message" để bắt đầu.
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    className="text-[#D0C5AF]/60 hover:text-gold text-xs leading-none disabled:opacity-30"
                    aria-label="Lên"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === messages.length - 1}
                    className="text-[#D0C5AF]/60 hover:text-gold text-xs leading-none disabled:opacity-30"
                    aria-label="Xuống"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={msg}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  placeholder="Miễn phí vận chuyển cho đơn từ 2 triệu"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-error/60 hover:text-error transition-colors p-1"
                  aria-label="Xoá"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
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