'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from '@/lib/toast/toast-store';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Tab = 'knowledge' | 'faqs' | 'upcoming' | 'promotions' | 'leads';

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  priority: number;
  is_published: boolean;
  updated_at?: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string | null;
  display_order: number;
  is_published: boolean;
  view_count: number;
}

interface UpcomingProduct {
  id: string;
  title: string;
  slug: string;
  short_pitch: string | null;
  description: string | null;
  estimated_price: number | null;
  material: string | null;
  category: string | null;
  cover_image_url: string | null;
  expected_launch_date: string | null;
  is_announced: boolean;
  notify_enabled: boolean;
}

interface UpcomingCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  theme: string | null;
  cover_image_url: string | null;
  teaser_note: string | null;
  expected_launch_date: string | null;
  is_announced: boolean;
}

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  discount_type: string;
  discount_value: number | null;
  min_order_value: number | null;
  applicable_categories: string[];
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

interface Lead {
  id: string;
  contact_type: string;
  contact_value: string;
  intent: string | null;
  matched_product_id: string | null;
  created_at: string;
}

const CATEGORIES = [
  'shipping',
  'return',
  'warranty',
  'payment',
  'about',
  'contact',
  'care',
  'size',
  'general',
];

const MATERIALS = ['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG'];
const PRODUCT_CATS = ['NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY'];
const DISCOUNT_TYPES = ['percent', 'fixed', 'shipping', 'gift'];

export default function ChatbotAdminPage() {
  const [tab, setTab] = useState<Tab>('knowledge');
  const confirm = useConfirm();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#EAE1D4] tracking-tight">
          Chatbot — Knowledge Base
        </h1>
        <p className="text-sm text-[#D0C5AF]/60 mt-1">
          Quản lý kiến thức, FAQ, sản phẩm sắp ra mắt và khuyến mãi cho Bà Chủ Tiệm
        </p>
      </div>

      <div className="flex gap-1 border-b border-gold/10">
        {(['knowledge', 'faqs', 'upcoming', 'promotions', 'leads'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-heading uppercase tracking-wider transition ${
              tab === t
                ? 'text-gold border-b-2 border-gold'
                : 'text-[#D0C5AF]/50 hover:text-[#D0C5AF]'
            }`}
          >
            {t === 'knowledge' && 'Knowledge'}
            {t === 'faqs' && 'FAQ'}
            {t === 'upcoming' && 'Sắp ra mắt'}
            {t === 'promotions' && 'Khuyến mãi'}
            {t === 'leads' && 'Leads'}
          </button>
        ))}
      </div>

      {tab === 'knowledge' && <KnowledgeTab confirm={confirm} />}
      {tab === 'faqs' && <FaqsTab confirm={confirm} />}
      {tab === 'upcoming' && <UpcomingTab confirm={confirm} />}
      {tab === 'promotions' && <PromotionsTab confirm={confirm} />}
      {tab === 'leads' && <LeadsTab />}
    </div>
  );
}

const panelCls =
  'p-4 sm:p-6 rounded-sm space-y-4 bg-[rgba(18,36,28,0.6)] border border-[rgba(241,229,172,0.1)]';
const inputCls =
  'w-full px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] focus:outline-none focus:border-gold/40';
const labelCls =
  'block text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 mb-1';

/* ============================ Knowledge Tab ============================ */
type ConfirmFn = (options: { title: string; message: string }) => Promise<boolean>;

function KnowledgeTab({ confirm }: { confirm: ConfirmFn }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<KnowledgeItem> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/chatbot/knowledge');
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/chatbot/knowledge', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      toast.success('Đã lưu');
      setEditing(null);
      load();
    } else {
      const j = await res.json();
      toast.error(j.message ?? 'Lỗi');
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Xóa knowledge?', message: 'Hành động này không thể hoàn tác.' })))
      return;
    await fetch(`/api/admin/chatbot/knowledge?id=${id}`, { method: 'DELETE' });
    toast.success('Đã xóa');
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );

  return (
    <div className={panelCls}>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-[#EAE1D4] uppercase tracking-wider">
          Knowledge ({items.length})
        </h2>
        <button
          onClick={() =>
            setEditing({
              category: 'general',
              title: '',
              content: '',
              keywords: [],
              priority: 0,
              is_published: true,
            })
          }
          className="flex items-center gap-1 px-3 py-1.5 bg-gold/20 text-gold rounded text-xs hover:bg-gold/30"
        >
          <Plus className="h-3 w-3" /> Thêm
        </button>
      </div>

      {editing && (
        <div className="space-y-3 p-4 rounded border border-gold/20 bg-[#1F1B13]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select
                className={inputCls}
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority (0-100)</label>
              <input
                type="number"
                className={inputCls}
                value={editing.priority ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, priority: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={editing.title ?? ''}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Content</label>
            <textarea
              className={inputCls + ' min-h-[120px]'}
              value={editing.content ?? ''}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Keywords (phân cách dấu phẩy)</label>
            <input
              className={inputCls}
              value={(editing.keywords ?? []).join(', ')}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  keywords: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="kb-pub"
              checked={editing.is_published ?? true}
              onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
            />
            <label htmlFor="kb-pub" className="text-xs text-[#D0C5AF]">
              Published
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1 px-3 py-1.5 bg-gold text-[#1F1B13] rounded text-xs font-medium"
            >
              <Save className="h-3 w-3" /> Lưu
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#4D4635] text-[#D0C5AF] rounded text-xs"
            >
              <X className="h-3 w-3" /> Hủy
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="p-3 border border-[#4D4635]/50 rounded flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold uppercase">
                  {it.category}
                </span>
                <span className="text-xs text-[#D0C5AF]/40">P{it.priority}</span>
                {!it.is_published && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    DRAFT
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium text-[#EAE1D4] mt-1">{it.title}</h3>
              <p className="text-xs text-[#D0C5AF]/60 line-clamp-2 mt-0.5">{it.content}</p>
              {it.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {it.keywords.slice(0, 6).map((k) => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-[#4D4635]/50 text-[#D0C5AF]/60">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing(it)}
                className="px-2 py-1 text-[10px] text-gold hover:bg-gold/10 rounded"
              >
                Sửa
              </button>
              <button
                onClick={() => remove(it.id)}
                className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-400/10 rounded"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ FAQ Tab ============================ */
function FaqsTab({ confirm }: { confirm: ConfirmFn }) {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<FaqItem> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/chatbot/faqs');
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/chatbot/faqs', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      toast.success('Đã lưu');
      setEditing(null);
      load();
    } else {
      toast.error('Lỗi');
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Xóa FAQ?', message: '?' }))) return;
    await fetch(`/api/admin/chatbot/faqs?id=${id}`, { method: 'DELETE' });
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );

  return (
    <div className={panelCls}>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-[#EAE1D4] uppercase tracking-wider">
          FAQ ({items.length})
        </h2>
        <button
          onClick={() =>
            setEditing({
              question: '',
              answer: '',
              keywords: [],
              display_order: items.length + 1,
              is_published: true,
            })
          }
          className="flex items-center gap-1 px-3 py-1.5 bg-gold/20 text-gold rounded text-xs hover:bg-gold/30"
        >
          <Plus className="h-3 w-3" /> Thêm
        </button>
      </div>

      {editing && (
        <div className="space-y-3 p-4 rounded border border-gold/20 bg-[#1F1B13]">
          <div>
            <label className={labelCls}>Câu hỏi</label>
            <input
              className={inputCls}
              value={editing.question ?? ''}
              onChange={(e) => setEditing({ ...editing, question: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Trả lời</label>
            <textarea
              className={inputCls + ' min-h-[120px]'}
              value={editing.answer ?? ''}
              onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <input
                className={inputCls}
                value={editing.category ?? ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Display order</label>
              <input
                type="number"
                className={inputCls}
                value={editing.display_order ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Keywords</label>
            <input
              className={inputCls}
              value={(editing.keywords ?? []).join(', ')}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  keywords: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="faq-pub"
              checked={editing.is_published ?? true}
              onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
            />
            <label htmlFor="faq-pub" className="text-xs">
              Published
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1 px-3 py-1.5 bg-gold text-[#1F1B13] rounded text-xs"
            >
              <Save className="h-3 w-3" /> Lưu
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#4D4635] rounded text-xs"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="p-3 border border-[#4D4635]/50 rounded">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#EAE1D4]">{it.question}</h3>
                <p className="text-xs text-[#D0C5AF]/60 line-clamp-2 mt-0.5">{it.answer}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#D0C5AF]/40">
                  <span>order: {it.display_order}</span>
                  {it.category && <span>· {it.category}</span>}
                  <span>· views: {it.view_count}</span>
                  {!it.is_published && <span className="text-red-400">DRAFT</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(it)}
                  className="px-2 py-1 text-[10px] text-gold hover:bg-gold/10 rounded"
                >
                  Sửa
                </button>
                <button
                  onClick={() => remove(it.id)}
                  className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-400/10 rounded"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ Upcoming Tab ============================ */
function UpcomingTab({ confirm }: { confirm: ConfirmFn }) {
  const [sub, setSub] = useState<'products' | 'collections'>('products');
  return sub === 'products' ? (
    <UpcomingProductsTab confirm={confirm} onSwitch={() => setSub('collections')} />
  ) : (
    <UpcomingCollectionsTab confirm={confirm} onSwitch={() => setSub('products')} />
  );
}

function UpcomingProductsTab({
  confirm,
  onSwitch,
}: {
  confirm: ConfirmFn;
  onSwitch: () => void;
}) {
  const [items, setItems] = useState<UpcomingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<UpcomingProduct> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/chatbot/upcoming?type=products');
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/chatbot/upcoming?type=products', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      toast.success('Đã lưu');
      setEditing(null);
      load();
    } else {
      const j = await res.json();
      toast.error(j.message ?? 'Lỗi');
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Xóa?', message: '?' }))) return;
    await fetch(`/api/admin/chatbot/upcoming?type=products&id=${id}`, { method: 'DELETE' });
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );

  return (
    <div className={panelCls}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-sm font-bold text-[#EAE1D4] uppercase">
            Sản phẩm sắp ra mắt ({items.length})
          </h2>
          <button onClick={onSwitch} className="text-[10px] text-gold underline">
            Xem BST →
          </button>
        </div>
        <button
          onClick={() =>
            setEditing({
              title: '',
              slug: '',
              short_pitch: '',
              description: '',
              estimated_price: null,
              material: null,
              category: null,
              expected_launch_date: '',
              is_announced: true,
              notify_enabled: true,
            })
          }
          className="flex items-center gap-1 px-3 py-1.5 bg-gold/20 text-gold rounded text-xs"
        >
          <Plus className="h-3 w-3" /> Thêm
        </button>
      </div>

      {editing && (
        <div className="space-y-3 p-4 rounded border border-gold/20 bg-[#1F1B13]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title</label>
              <input
                className={inputCls}
                value={editing.title ?? ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input
                className={inputCls}
                value={editing.slug ?? ''}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Short pitch (1 câu marketing)</label>
            <input
              className={inputCls}
              value={editing.short_pitch ?? ''}
              onChange={(e) => setEditing({ ...editing, short_pitch: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls + ' min-h-[80px]'}
              value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Material</label>
              <select
                className={inputCls}
                value={editing.material ?? ''}
                onChange={(e) => setEditing({ ...editing, material: e.target.value || null })}
              >
                <option value="">—</option>
                {MATERIALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select
                className={inputCls}
                value={editing.category ?? ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value || null })}
              >
                <option value="">—</option>
                {PRODUCT_CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Est. price (VND)</label>
              <input
                type="number"
                className={inputCls}
                value={editing.estimated_price ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    estimated_price: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Expected launch date</label>
            <input
              type="date"
              className={inputCls}
              value={editing.expected_launch_date?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  expected_launch_date: e.target.value || null,
                })
              }
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                checked={editing.is_announced ?? true}
                onChange={(e) => setEditing({ ...editing, is_announced: e.target.checked })}
              />
              Announced (chatbot nói được)
            </label>
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                checked={editing.notify_enabled ?? true}
                onChange={(e) => setEditing({ ...editing, notify_enabled: e.target.checked })}
              />
              Notify enabled
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1 px-3 py-1.5 bg-gold text-[#1F1B13] rounded text-xs"
            >
              <Save className="h-3 w-3" /> Lưu
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-3 py-1.5 bg-[#4D4635] rounded text-xs"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="p-3 border border-[#4D4635]/50 rounded flex justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-[#EAE1D4]">{it.title}</h3>
                {!it.is_announced && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    HIDDEN
                  </span>
                )}
                {it.expected_launch_date && (
                  <span className="text-[10px] text-gold">
                    {it.expected_launch_date.slice(0, 10)}
                  </span>
                )}
              </div>
              {it.short_pitch && (
                <p className="text-xs text-[#D0C5AF]/60 mt-0.5">{it.short_pitch}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#D0C5AF]/40">
                {it.material && <span>{it.material}</span>}
                {it.category && <span>· {it.category}</span>}
                {it.estimated_price && <span>· ~{it.estimated_price.toLocaleString('vi-VN')}đ</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing(it)}
                className="px-2 py-1 text-[10px] text-gold hover:bg-gold/10 rounded"
              >
                Sửa
              </button>
              <button
                onClick={() => remove(it.id)}
                className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-400/10 rounded"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingCollectionsTab({
  confirm,
  onSwitch,
}: {
  confirm: ConfirmFn;
  onSwitch: () => void;
}) {
  const [items, setItems] = useState<UpcomingCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<UpcomingCollection> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/chatbot/upcoming?type=collections');
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/chatbot/upcoming?type=collections', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      toast.success('Đã lưu');
      setEditing(null);
      load();
    } else toast.error('Lỗi');
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Xóa?', message: '?' }))) return;
    await fetch(`/api/admin/chatbot/upcoming?type=collections&id=${id}`, { method: 'DELETE' });
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );

  return (
    <div className={panelCls}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-sm font-bold text-[#EAE1D4] uppercase">
            BST sắp ra mắt ({items.length})
          </h2>
          <button onClick={onSwitch} className="text-[10px] text-gold underline">
            ← Xem sản phẩm
          </button>
        </div>
        <button
          onClick={() =>
            setEditing({
              name: '',
              slug: '',
              description: '',
              theme: '',
              teaser_note: '',
              expected_launch_date: '',
              is_announced: true,
            })
          }
          className="flex items-center gap-1 px-3 py-1.5 bg-gold/20 text-gold rounded text-xs"
        >
          <Plus className="h-3 w-3" /> Thêm
        </button>
      </div>

      {editing && (
        <div className="space-y-3 p-4 rounded border border-gold/20 bg-[#1F1B13]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={inputCls}
                value={editing.name ?? ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input
                className={inputCls}
                value={editing.slug ?? ''}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Theme</label>
            <input
              className={inputCls}
              value={editing.theme ?? ''}
              onChange={(e) => setEditing({ ...editing, theme: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls + ' min-h-[80px]'}
              value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Teaser note</label>
            <textarea
              className={inputCls + ' min-h-[60px]'}
              value={editing.teaser_note ?? ''}
              onChange={(e) => setEditing({ ...editing, teaser_note: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Expected launch date</label>
            <input
              type="date"
              className={inputCls}
              value={editing.expected_launch_date?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setEditing({ ...editing, expected_launch_date: e.target.value || null })
              }
            />
          </div>
          <label className="text-xs flex items-center gap-1">
            <input
              type="checkbox"
              checked={editing.is_announced ?? true}
              onChange={(e) => setEditing({ ...editing, is_announced: e.target.checked })}
            />
            Announced
          </label>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1 px-3 py-1.5 bg-gold text-[#1F1B13] rounded text-xs"
            >
              <Save className="h-3 w-3" /> Lưu
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-3 py-1.5 bg-[#4D4635] rounded text-xs"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="p-3 border border-[#4D4635]/50 rounded flex justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-[#EAE1D4]">{it.name}</h3>
                {it.expected_launch_date && (
                  <span className="text-[10px] text-gold">
                    {it.expected_launch_date.slice(0, 10)}
                  </span>
                )}
                {!it.is_announced && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    HIDDEN
                  </span>
                )}
              </div>
              {it.theme && <p className="text-xs text-gold/80 mt-0.5">{it.theme}</p>}
              {it.teaser_note && (
                <p className="text-xs text-[#D0C5AF]/60 mt-0.5 line-clamp-2">{it.teaser_note}</p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing(it)}
                className="px-2 py-1 text-[10px] text-gold hover:bg-gold/10 rounded"
              >
                Sửa
              </button>
              <button
                onClick={() => remove(it.id)}
                className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-400/10 rounded"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ Promotions Tab ============================ */
function PromotionsTab({ confirm }: { confirm: ConfirmFn }) {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Promotion> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/chatbot/promotions');
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    const method = editing.id ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/chatbot/promotions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      toast.success('Đã lưu');
      setEditing(null);
      load();
    } else toast.error('Lỗi');
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Xóa KM?', message: '?' }))) return;
    await fetch(`/api/admin/chatbot/promotions?id=${id}`, { method: 'DELETE' });
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );

  return (
    <div className={panelCls}>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-[#EAE1D4] uppercase">
          Khuyến mãi ({items.length})
        </h2>
        <button
          onClick={() =>
            setEditing({
              title: '',
              description: '',
              code: '',
              discount_type: 'percent',
              discount_value: 0,
              min_order_value: null,
              applicable_categories: [],
              is_active: true,
            })
          }
          className="flex items-center gap-1 px-3 py-1.5 bg-gold/20 text-gold rounded text-xs"
        >
          <Plus className="h-3 w-3" /> Thêm
        </button>
      </div>

      {editing && (
        <div className="space-y-3 p-4 rounded border border-gold/20 bg-[#1F1B13]">
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={editing.title ?? ''}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls + ' min-h-[60px]'}
              value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select
                className={inputCls}
                value={editing.discount_type}
                onChange={(e) => setEditing({ ...editing, discount_type: e.target.value })}
              >
                {DISCOUNT_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Value</label>
              <input
                type="number"
                className={inputCls}
                value={editing.discount_value ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, discount_value: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Min order</label>
              <input
                type="number"
                className={inputCls}
                value={editing.min_order_value ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    min_order_value: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Code</label>
            <input
              className={inputCls}
              value={editing.code ?? ''}
              onChange={(e) => setEditing({ ...editing, code: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valid from</label>
              <input
                type="date"
                className={inputCls}
                value={editing.valid_from?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, valid_from: e.target.value || null })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Valid until</label>
              <input
                type="date"
                className={inputCls}
                value={editing.valid_until?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, valid_until: e.target.value || null })
                }
              />
            </div>
          </div>
          <label className="text-xs flex items-center gap-1">
            <input
              type="checkbox"
              checked={editing.is_active ?? true}
              onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
            />
            Active
          </label>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1 px-3 py-1.5 bg-gold text-[#1F1B13] rounded text-xs"
            >
              <Save className="h-3 w-3" /> Lưu
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-3 py-1.5 bg-[#4D4635] rounded text-xs"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="p-3 border border-[#4D4635]/50 rounded flex justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-[#EAE1D4]">{it.title}</h3>
                {it.code && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold font-mono">
                    {it.code}
                  </span>
                )}
                {!it.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    OFF
                  </span>
                )}
              </div>
              {it.description && (
                <p className="text-xs text-[#D0C5AF]/60 mt-0.5 line-clamp-2">{it.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#D0C5AF]/40">
                <span>{it.discount_type}</span>
                {it.discount_value !== null && <span>· {it.discount_value}</span>}
                {it.min_order_value && (
                  <span>· đơn từ {it.min_order_value.toLocaleString('vi-VN')}đ</span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing(it)}
                className="px-2 py-1 text-[10px] text-gold hover:bg-gold/10 rounded"
              >
                Sửa
              </button>
              <button
                onClick={() => remove(it.id)}
                className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-400/10 rounded"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ Leads Tab ============================ */
function LeadsTab() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/chatbot/leads');
      const json = await res.json();
      setItems(json.items ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );

  return (
    <div className={panelCls}>
      <h2 className="font-heading text-sm font-bold text-[#EAE1D4] uppercase">
        Leads từ chatbot ({items.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[#D0C5AF]/50 border-b border-[#4D4635]/50">
              <th className="py-2">Loại</th>
              <th className="py-2">Liên lạc</th>
              <th className="py-2">Intent</th>
              <th className="py-2">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b border-[#4D4635]/30">
                <td className="py-2 text-gold">{l.contact_type}</td>
                <td className="py-2 font-mono">{l.contact_value}</td>
                <td className="py-2 text-[#D0C5AF]/70">{l.intent ?? '—'}</td>
                <td className="py-2 text-[#D0C5AF]/50">
                  {new Date(l.created_at).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="text-center py-8 text-[#D0C5AF]/40">Chưa có lead nào.</p>
        )}
      </div>
    </div>
  );
}
