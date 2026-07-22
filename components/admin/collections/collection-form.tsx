'use client';

/**
 * CollectionForm — shared admin form dùng cho cả New Collection và Edit Collection.
 *
 *   - Create mode: POST   /api/admin/collections
 *   - Edit mode  : PATCH  /api/admin/collections/{id}
 *
 * Fields:
 *   1. Tên + slug (auto-generate từ name, có nút reset + copy)
 *   2. Mô tả ngắn
 *   3. Ảnh bìa (cover_image_url) — Input + Upload + preview + MediaPicker
 *   4. Gallery phụ (hero_gallery) — list URL có thêm/xoá + upload từng ảnh
 *   5. Trạng thái published (Switch) + display_order + launch_at
 *   6. Câu chuyện (story_text) — textarea lớn
 *   7. SEO (meta_title, meta_description)
 *
 * Header (breadcrumb + title + back) đặt bên ngoài (page). Form này chỉ chứa
 * sections + footer actions.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  Copy,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { cn, slugify, formatVND } from '@/lib/utils';
import { toast } from '@/lib/toast/toast-store';
import { resizeImage, formatBytes } from '@/lib/image/client-resize';
import type { CollectionRow } from '@/lib/supabase/types';
import { ProductPicker } from './product-picker';
import type { PickerProduct } from './product-picker';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type CollectionFormMode = 'create' | 'edit';

export interface CollectionFormProps {
  mode: CollectionFormMode;
  initialData?: CollectionRow | null;
  collectionId?: string;
  onSaved?: (c: CollectionRow) => void;
  backHref?: string;
}

type FormData = {
  name: string;
  slug: string;
  description: string;
  cover_image_url: string;
  hero_gallery: string[];
  is_published: boolean;
  display_order: number;
  launch_at: string;
  story_text: string;
  meta_title: string;
  meta_description: string;
};

const emptyData = (): FormData => ({
  name: '',
  slug: '',
  description: '',
  cover_image_url: '',
  hero_gallery: [],
  is_published: false,
  display_order: 0,
  launch_at: '',
  story_text: '',
  meta_title: '',
  meta_description: '',
});

const fromCollection = (c: CollectionRow): FormData => ({
  name: c.name ?? '',
  slug: c.slug ?? '',
  description: c.description ?? '',
  cover_image_url: c.cover_image_url ?? '',
  hero_gallery: Array.isArray(c.hero_gallery) ? c.hero_gallery : [],
  is_published: !!c.is_published,
  display_order: typeof c.display_order === 'number' ? c.display_order : 0,
  launch_at: c.launch_at ? c.launch_at.slice(0, 10) : '',
  story_text: c.story_text ?? '',
  meta_title: c.meta_title ?? '',
  meta_description: c.meta_description ?? '',
});

/* -------------------------------------------------------------------------- */
/*  Design tokens                                                              */
/* -------------------------------------------------------------------------- */

const glassStyle: CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};
const primaryBtn =
  'px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2';
const outlineBtn =
  'px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors inline-flex items-center gap-2';
const ghostBtn =
  'px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/70 hover:text-[#EAE1D4] transition-colors inline-flex items-center gap-2';
const iconGhostBtn =
  'inline-flex items-center justify-center w-8 h-8 rounded-sm text-[#D0C5AF]/70 hover:text-gold transition-colors';
const inputCls =
  'w-full px-4 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-gold/40 transition-colors';
const inputErrorCls =
  'w-full px-4 py-2 bg-[#1F1B13] border border-error/50 rounded-sm text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none focus:border-error/70 transition-colors';
const labelCls =
  'block text-xs font-medium text-[#D0C5AF] uppercase tracking-[0.05em] mb-1.5';
const sectionTitleCls =
  'font-heading text-base font-semibold text-gold tracking-[0.1em] uppercase mb-1';
const h1Cls = 'font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight';
const subtitleCls = 'text-sm text-[#D0C5AF]/60 mt-1';

const MAX_GALLERY = 12;
const MAX_HERO_GALLERY = 20;
const slugRegex = /^[a-z0-9-]+$/;

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function CollectionForm({
  mode,
  initialData,
  collectionId,
  onSaved,
  backHref = '/admin/collections',
}: CollectionFormProps) {
  const router = useRouter();

  const [currentInitial, setCurrentInitial] = useState<CollectionRow | null>(
    initialData ?? null
  );
  const [formData, setFormData] = useState<FormData>(() =>
    initialData ? fromCollection(initialData) : emptyData()
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(
    mode === 'edit' && !!initialData?.slug
  );
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadingHeroIndex, setUploadingHeroIndex] = useState<number | null>(null);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [addingProducts, setAddingProducts] = useState(false);
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const setFieldRef = (key: string) => (el: HTMLElement | null): void => {
    fieldRefs.current[key] = el;
  };
  const focusField = (key: string) => {
    const el = fieldRefs.current[key];
    if (el instanceof HTMLElement) el.focus();
  };

  const setField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /* Slug auto-generate từ name (create mode only, nếu chưa edit thủ công) */
  useEffect(() => {
    if (mode !== 'create') return;
    if (slugManuallyEdited) return;
    const n = formData.name.trim();
    if (n.length === 0) {
      if (formData.slug !== '') setField('slug', '');
      return;
    }
    const next = slugify(n);
    if (next !== formData.slug) setField('slug', next);
  }, [formData.name, mode, slugManuallyEdited]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChangeSlug = (e: ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setField('slug', e.target.value);
  };

  const resetAutoSlug = () => {
    setSlugManuallyEdited(false);
    const n = formData.name.trim();
    setField('slug', n.length > 0 ? slugify(n) : '');
    toast.info('Đã bật auto-slug.');
  };

  const copySlug = async () => {
    if (!formData.slug) {
      toast.warning('Slug đang trống.');
      return;
    }
    try {
      await navigator.clipboard.writeText(formData.slug);
      toast.success('Đã copy slug.');
    } catch {
      toast.error('Không copy được.');
    }
  };

  /* -------- Validation -------- */
  const validation = useMemo(() => validateAll(formData), [formData]);
  const isValid = Object.keys(validation).length === 0;
  const shouldShow = (k: string) => touched.has(k) || submitAttempted;
  const inputClassFor = (k: string) =>
    shouldShow(k) && errors[k] ? inputErrorCls : inputCls;
  const ErrorLine = ({ k }: { k: string }) => {
    if (!shouldShow(k)) return <div className="min-h-4 mt-1" />;
    const msg = errors[k];
    if (!msg) return <div className="min-h-4 mt-1" />;
    return <p className="text-xs text-error min-h-4 mt-1">{msg}</p>;
  };

  /* -------- Upload cover -------- */
  const onUploadCover = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('File không phải ảnh.');
      return;
    }
    setIsUploadingCover(true);
    try {
      const originalSize = file.size;
      const blob = await resizeImage(file);
      const newSize = blob.size;

      const fd = new FormData();
      fd.append('file', blob, file.name);
      fd.append('originalName', file.name);
      fd.append('folder', 'collections');
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      }
      setField('cover_image_url', json.publicUrl);
      const pct = originalSize > 0 ? Math.round(((originalSize - newSize) / originalSize) * 100) : 0;
      toast.success(`Upload OK — ${formatBytes(originalSize)} → ${formatBytes(newSize)} (giảm ${pct}%)`);
    } catch (err) {
      toast.error(`Upload thất bại: ${err instanceof Error ? err.message : 'lỗi không xác định'}`);
    } finally {
      setIsUploadingCover(false);
    }
  };

  /* -------- Hero gallery -------- */
  const updateHeroGallery = (next: string[]) => {
    if (next.length > MAX_HERO_GALLERY) {
      toast.warning(`Tối đa ${MAX_HERO_GALLERY} ảnh.`);
      return;
    }
    setField('hero_gallery', next);
  };
  const setHeroRow = (i: number, v: string) => {
    const next = [...formData.hero_gallery];
    next[i] = v;
    updateHeroGallery(next);
  };
  const removeHeroRow = (i: number) => {
    const next = [...formData.hero_gallery];
    next.splice(i, 1);
    updateHeroGallery(next);
  };
  const addHeroRow = () => {
    if (formData.hero_gallery.length >= MAX_HERO_GALLERY) {
      toast.warning(`Tối đa ${MAX_HERO_GALLERY} ảnh.`);
      return;
    }
    updateHeroGallery([...formData.hero_gallery, '']);
  };

  const uploadToHero = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File không phải ảnh.');
      return;
    }
    setUploadingHeroIndex(index);
    try {
      const originalSize = file.size;
      const blob = await resizeImage(file);
      const newSize = blob.size;

      const fd = new FormData();
      fd.append('file', blob, file.name);
      fd.append('originalName', file.name);
      fd.append('folder', 'collections');
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      }
      const next = [...formData.hero_gallery];
      next[index] = json.publicUrl;
      setField('hero_gallery', next);
      const pct = originalSize > 0 ? Math.round(((originalSize - newSize) / originalSize) * 100) : 0;
      toast.success(`Upload OK — ${formatBytes(originalSize)} → ${formatBytes(newSize)} (giảm ${pct}%)`);
    } catch (err) {
      toast.error(`Upload thất bại: ${err instanceof Error ? err.message : 'lỗi không xác định'}`);
    } finally {
      setUploadingHeroIndex(null);
    }
  };

  const onPickHeroFile = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadToHero(index, file);
  };

  /* -------- Build payload -------- */
  const buildCreatePayload = () => {
    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      is_published: formData.is_published,
      display_order: formData.display_order,
    };
    if (formData.description.trim()) payload.description = formData.description.trim();
    if (formData.cover_image_url.trim()) payload.cover_image_url = formData.cover_image_url.trim();
    if (formData.launch_at) payload.launch_at = formData.launch_at;
    if (formData.story_text.trim()) payload.story_text = formData.story_text.trim();
    if (formData.hero_gallery.some((g) => g.trim().length > 0)) {
      payload.hero_gallery = formData.hero_gallery.map((g) => g.trim()).filter(Boolean);
    }
    if (formData.meta_title.trim()) payload.meta_title = formData.meta_title.trim();
    if (formData.meta_description.trim()) payload.meta_description = formData.meta_description.trim();
    return payload;
  };

  const buildChangedPayload = (): Record<string, unknown> => {
    if (!currentInitial) return {};
    const initial = fromCollection(currentInitial);
    const out: Record<string, unknown> = {};
    const keys: (keyof FormData)[] = [
      'name', 'slug', 'description', 'cover_image_url', 'is_published',
      'display_order', 'launch_at', 'story_text', 'hero_gallery',
      'meta_title', 'meta_description',
    ];
    for (const k of keys) {
      const a = formData[k];
      const b = initial[k];
      if (!deepFieldEqual(a, b)) {
        if (k === 'hero_gallery') {
          const cleaned = (a as string[]).map((s) => s.trim()).filter(Boolean);
          out.hero_gallery = cleaned;
        } else {
          out[k] = a;
        }
      }
    }
    // Normalize empty strings to null cho optional fields
    for (const k of ['description', 'cover_image_url', 'launch_at', 'story_text', 'meta_title', 'meta_description'] as const) {
      if (k in out && (out[k] as string) === '') out[k] = null;
    }
    return out;
  };

  /* -------- Submit -------- */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setErrors({});

    if (!isValid) {
      const firstKey = Object.keys(validation)[0];
      if (firstKey) focusField(firstKey);
      toast.error('Vui lòng kiểm tra các trường lỗi.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const payload = buildCreatePayload();
        const res = await fetch('/api/admin/collections', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (res.status === 201 && json?.ok) {
          toast.success('✓ Đã tạo bộ sưu tập.');
          const created = json.data as CollectionRow;
          if (onSaved) {
            onSaved(created);
          } else {
            setTimeout(() => router.push('/admin/collections'), 600);
          }
          return;
        }
        if (res.status === 409 && json?.error === 'SLUG_EXISTS') {
          setErrors({ slug: 'Slug này đã tồn tại — chọn slug khác.' });
          focusField('slug');
          return;
        }
        toast.error(json?.message || 'Tạo bộ sưu tập thất bại.');
      } else {
        const changed = buildChangedPayload();
        if (Object.keys(changed).length === 0) {
          toast.info('Không có thay đổi.');
          return;
        }
        if (!collectionId) {
          toast.error('Thiếu collection id.');
          return;
        }
        const res = await fetch(`/api/admin/collections/${collectionId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(changed),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) {
          toast.success('✓ Đã lưu thay đổi.');
          const updated = json.data as CollectionRow;
          setCurrentInitial(updated);
          setFormData(fromCollection(updated));
          setTouched(new Set());
          setErrors({});
          if (onSaved) onSaved(updated);
          return;
        }
        if (res.status === 409 && json?.error === 'SLUG_EXISTS') {
          setErrors({ slug: 'Slug này đã tồn tại — chọn slug khác.' });
          focusField('slug');
          return;
        }
        toast.error(json?.message || 'Lưu thay đổi thất bại.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const h1Title = mode === 'create' ? 'Tạo bộ sưu tập' : (currentInitial?.name ?? 'Đang tải…');

  /* -------- Products in this collection (edit mode only) -------- */
  useEffect(() => {
    if (mode !== 'edit' || !collectionId) return;
    let cancelled = false;
    const load = async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch(`/api/admin/collections/${collectionId}/products?pageSize=100`);
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && json?.ok) {
          setProducts(json.data ?? []);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, collectionId]);

  const handleAddProducts = async (productIds: string[]) => {
    if (!collectionId || productIds.length === 0) return;
    setAddingProducts(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/products`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productIds }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        toast.success(`Đã thêm ${json.added} sản phẩm vào bộ sưu tập.`);
        const listRes = await fetch(`/api/admin/collections/${collectionId}/products?pageSize=100`);
        const listJson = await listRes.json().catch(() => null);
        if (listRes.ok && listJson?.ok) setProducts(listJson.data ?? []);
      } else {
        toast.error(json?.message || json?.error || 'Thêm thất bại.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAddingProducts(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!collectionId) return;
    if (!confirm('Xoá sản phẩm này khỏi bộ sưu tập?')) return;
    setRemovingProductId(productId);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/products`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productIds: [productId] }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        toast.success('Đã xoá sản phẩm khỏi bộ sưu tập.');
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        toast.error(json?.message || json?.error || 'Xoá thất bại.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRemovingProductId(null);
    }
  };

  return (
    <>
    <form onSubmit={onSubmit} className="space-y-6 animate-fade-in">
      {/* HEADER ----------------------------------------------------- */}
      <div>
        <p className="text-xs text-text-muted/50 font-mono">
          <Link href={backHref} className="hover:text-gold transition-colors">
            Bộ sưu tập
          </Link>{' '}
          /{' '}
          <span className="text-text-muted/80">
            {mode === 'edit' ? (currentInitial?.name ?? 'Đang tải…') : 'Mới'}
          </span>
        </p>

        <div className="flex items-start justify-between flex-wrap gap-3 mt-2">
          <div className="min-w-0 flex-1">
            <h1 className={h1Cls}>{h1Title}</h1>
            <p className={subtitleCls}>
              {mode === 'create'
                ? 'Tạo bộ sưu tập mới cho Emerald Vault.'
                : 'Chỉnh sửa thông tin bộ sưu tập.'}
            </p>
          </div>
          <Link href={backHref} className={ghostBtn}>
            ← Quay lại
          </Link>
        </div>
      </div>

      {/* SECTION 1 — THÔNG TIN CƠ BẢN ----------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>Thông tin cơ bản</h2>

        <div>
          <label htmlFor="f-name" className={labelCls}>
            Tên bộ sưu tập <span className="text-error">*</span>
          </label>
          <input
            id="f-name"
            ref={setFieldRef('name')}
            type="text"
            value={formData.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => setTouched((s) => new Set(s).add('name'))}
            placeholder="Heritage 2026"
            className={cn(inputClassFor('name'), 'py-2.5 text-sm')}
          />
          <ErrorLine k="name" />
        </div>

        <div>
          <label htmlFor="f-slug" className={labelCls}>
            Slug <span className="text-error">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="f-slug"
              ref={setFieldRef('slug')}
              type="text"
              value={formData.slug}
              onChange={onChangeSlug}
              onBlur={() => setTouched((s) => new Set(s).add('slug'))}
              placeholder="heritage-2026"
              className={cn(inputClassFor('slug'), 'font-mono')}
            />
            <button
              type="button"
              onClick={() => {
                const n = formData.name.trim();
                if (n.length === 0) {
                  toast.warning('Nhập tên trước đã.');
                  return;
                }
                setField('slug', slugify(n));
                setSlugManuallyEdited(false);
              }}
              className={iconGhostBtn}
              aria-label="Generate từ tên"
              title="Generate từ tên"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={copySlug}
              className={iconGhostBtn}
              aria-label="Copy slug"
              title="Copy slug"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {formData.slug && (
            <p className="text-[10px] font-mono text-text-muted/50 mt-1">
              /collections/<span className="text-gold/70">{formData.slug}</span>
            </p>
          )}
          {slugManuallyEdited && mode === 'create' && (
            <p className="text-[10px] text-text-muted/50 mt-1">
              Slug đã chỉnh thủ công.{' '}
              <button
                type="button"
                onClick={resetAutoSlug}
                className="text-gold/70 hover:text-gold underline"
              >
                ↻ Reset auto
              </button>
            </p>
          )}
          <ErrorLine k="slug" />
        </div>

        <div>
          <label htmlFor="f-description" className={labelCls}>
            Mô tả ngắn
          </label>
          <textarea
            id="f-description"
            rows={3}
            value={formData.description}
            onChange={(e) => setField('description', e.target.value)}
            onBlur={() => setTouched((s) => new Set(s).add('description'))}
            placeholder="Mô tả ngắn gọn về bộ sưu tập…"
            className={cn(inputClassFor('description'), 'min-h-[80px] py-3 resize-y')}
          />
          <ErrorLine k="description" />
        </div>
      </section>

      {/* SECTION 2 — ẢNH BÌA & GALLERY ---------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>Hình ảnh</h2>

        <div>
          <label htmlFor="f-cover" className={labelCls}>
            Ảnh bìa (cover) <span className="text-error">*</span>
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              id="f-cover"
              ref={setFieldRef('cover_image_url')}
              type="text"
              value={formData.cover_image_url}
              onChange={(e) => setField('cover_image_url', e.target.value)}
              onBlur={() => setTouched((s) => new Set(s).add('cover_image_url'))}
              placeholder="https://… hoặc path trong bucket"
              className={cn(inputClassFor('cover_image_url'), 'flex-1 min-w-0')}
            />
            <label
              htmlFor="f-cover-file"
              className={cn(
                outlineBtn,
                'cursor-pointer',
                isUploadingCover && 'opacity-50 pointer-events-none'
              )}
            >
              {isUploadingCover ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {isUploadingCover ? 'Đang upload…' : 'Upload'}
            </label>
            <input
              id="f-cover-file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUploadCover}
              disabled={isUploadingCover}
            />
          </div>
          <ErrorLine k="cover_image_url" />

          {/* Preview */}
          <div className="p-4 rounded-sm flex flex-col sm:flex-row sm:items-center gap-4 mt-3" style={glassStyle}>
            {formData.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.cover_image_url}
                alt="Cover preview"
                className="w-40 h-24 object-cover rounded-sm border border-[#4D4635] bg-[#1F1B13]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                }}
              />
            ) : (
              <div className="w-40 h-24 rounded-sm border border-[#4D4635] bg-[#1F1B13] flex flex-col items-center justify-center text-text-muted/40">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[10px] mt-1">Chưa có ảnh</span>
              </div>
            )}
            <div className="text-xs text-text-muted/60 break-all">
              <p className="font-mono">{formData.cover_image_url || '—'}</p>
              <p className="text-[10px] mt-1">Ảnh bìa dùng cho storefront & OG image.</p>
            </div>
          </div>
        </div>

        {/* Hero gallery */}
        <div>
          <label className={labelCls}>
            Hero gallery (tối đa {MAX_HERO_GALLERY} ảnh)
          </label>
          <div className="space-y-2">
            {formData.hero_gallery.map((g, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  type="text"
                  value={g}
                  onChange={(e) => setHeroRow(i, e.target.value)}
                  placeholder="https://…/anh-1.jpg"
                  className={cn(inputCls, 'flex-1')}
                />
                {g ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g}
                    alt=""
                    className="w-12 h-12 object-cover rounded-sm border border-[#4D4635] bg-[#1F1B13]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-sm border border-[#4D4635] bg-[#1F1B13] flex items-center justify-center text-text-muted/30">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                )}
                <label
                  htmlFor={`hero-file-${i}`}
                  className={cn(
                    outlineBtn,
                    'cursor-pointer !px-2 !py-1.5',
                    uploadingHeroIndex === i && 'opacity-50 pointer-events-none'
                  )}
                  aria-label={`Upload ảnh hero ${i + 1}`}
                  title="Upload ảnh"
                >
                  {uploadingHeroIndex === i ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                </label>
                <input
                  id={`hero-file-${i}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickHeroFile(i)}
                  disabled={uploadingHeroIndex === i}
                />
                <button
                  type="button"
                  onClick={() => removeHeroRow(i)}
                  className={iconGhostBtn}
                  aria-label="Xoá ảnh"
                  title="Xoá"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={addHeroRow}
              className={outlineBtn}
              disabled={formData.hero_gallery.length >= MAX_HERO_GALLERY}
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm ảnh
            </button>
          </div>
          <p className="text-[10px] text-text-muted/50 mt-2">
            Hero gallery hiển thị trong trang chi tiết bộ sưu tập.
          </p>
        </div>
      </section>

      {/* SECTION 3 — TRẠNG THÁI & THỨ TỰ -------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>Hiển thị & thứ tự</h2>

        <div className="flex items-center gap-3">
          <input
            id="f-published"
            type="checkbox"
            checked={formData.is_published}
            onChange={(e) => setField('is_published', e.target.checked)}
            className="w-4 h-4 accent-gold cursor-pointer"
          />
          <label htmlFor="f-published" className="text-xs text-[#D0C5AF] cursor-pointer">
            Hiển thị trên storefront (published)
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="f-order" className={labelCls}>
              Display order
            </label>
            <input
              id="f-order"
              type="number"
              min={0}
              value={formData.display_order}
              onChange={(e) => {
                const v = e.target.value;
                setField('display_order', v === '' ? 0 : parseInt(v, 10) || 0);
              }}
              onBlur={() => setTouched((s) => new Set(s).add('display_order'))}
              className={cn(inputClassFor('display_order'), 'font-mono')}
            />
            <p className="text-[10px] text-text-muted/50 mt-1">
              Số nhỏ hiển thị trước. Có thể dùng khoảng cách 10, 20, 30… để dễ chèn.
            </p>
            <ErrorLine k="display_order" />
          </div>

          <div>
            <label htmlFor="f-launch" className={labelCls}>
              Ngày ra mắt (launch_at) <span className="text-text-muted/40">— tuỳ chọn</span>
            </label>
            <input
              id="f-launch"
              type="date"
              value={formData.launch_at}
              onChange={(e) => setField('launch_at', e.target.value)}
              onBlur={() => setTouched((s) => new Set(s).add('launch_at'))}
              className={cn(inputClassFor('launch_at'), 'font-mono')}
            />
            <ErrorLine k="launch_at" />
          </div>
        </div>
      </section>

      {/* SECTION 4 — SẢN PHẨM TRONG BỘ SƯU TẬP ------------------ */}
      {mode === 'edit' && (
        <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className={sectionTitleCls}>Sản phẩm ({products.length})</h2>
            <button
              type="button"
              onClick={() => setShowProductPicker(true)}
              className={primaryBtn}
              disabled={addingProducts}
            >
              {addingProducts ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Thêm sản phẩm
            </button>
          </div>

          {loadingProducts ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-sm border border-[#4D4635] bg-[#1F1B13]"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-sm border border-dashed border-[#4D4635] p-6 text-center text-xs text-text-muted/60">
              Chưa có sản phẩm nào trong bộ sưu tập này. Bấm &quot;Thêm sản phẩm&quot; để chọn từ danh sách.
            </div>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-sm border border-[#4D4635]/30 bg-[#1F1B13]"
                >
                  <div className="w-10 h-10 shrink-0 rounded-sm overflow-hidden border border-[#4D4635] bg-[#0D1117]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#EAE1D4] truncate">{p.title}</p>
                    <p className="text-[10px] text-[#D0C5AF]/50 mt-0.5 font-mono">
                      {p.code && <span className="text-gold/70">{p.code}</span>}
                      {p.code ? ' · ' : ''}
                      {formatVND(p.price)}
                    </p>
                  </div>
                  <Link
                    href={`/san-pham/${p.slug}`}
                    target="_blank"
                    className="text-[10px] text-gold/70 hover:text-gold"
                  >
                    Xem
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(p.id)}
                    disabled={removingProductId === p.id}
                    className={cn(iconGhostBtn, 'text-error/70 hover:text-error')}
                    aria-label="Xoá khỏi bộ sưu tập"
                    title="Xoá"
                  >
                    {removingProductId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* SECTION 5 — STORY --------------------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>Câu chuyện</h2>
        <div>
          <label htmlFor="f-story" className={labelCls}>
            Story text <span className="text-text-muted/40">— tuỳ chọn, plain text hoặc markdown</span>
          </label>
          <textarea
            id="f-story"
            rows={8}
            value={formData.story_text}
            onChange={(e) => setField('story_text', e.target.value)}
            onBlur={() => setTouched((s) => new Set(s).add('story_text'))}
            placeholder={"Mỗi món trang sức trong bộ sưu tập này kể một câu chuyện…\n\n- Nguồn gốc\n- Cảm hứng\n- Giai thoại"}
            maxLength={20000}
            className={cn(inputClassFor('story_text'), 'min-h-[180px] py-3 resize-y font-mono')}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-text-muted/50">
              Hỗ trợ markdown cơ bản (xuống dòng, danh sách).
            </p>
            <p className="text-[10px] font-mono text-text-muted/50">
              {formData.story_text.length} / 20000
            </p>
          </div>
          <ErrorLine k="story_text" />
        </div>
      </section>

      {/* SECTION 6 — SEO ----------------------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>SEO</h2>

        <div>
          <label htmlFor="f-meta-title" className={labelCls}>
            Meta title <span className="text-text-muted/40">— tuỳ chọn</span>
          </label>
          <input
            id="f-meta-title"
            type="text"
            value={formData.meta_title}
            onChange={(e) => setField('meta_title', e.target.value)}
            onBlur={() => setTouched((s) => new Set(s).add('meta_title'))}
            placeholder="Để trống sẽ dùng tên bộ sưu tập"
            className={inputClassFor('meta_title')}
          />
          <ErrorLine k="meta_title" />
        </div>

        <div>
          <label htmlFor="f-meta-desc" className={labelCls}>
            Meta description <span className="text-text-muted/40">— tuỳ chọn</span>
          </label>
          <textarea
            id="f-meta-desc"
            rows={3}
            value={formData.meta_description}
            onChange={(e) => setField('meta_description', e.target.value)}
            onBlur={() => setTouched((s) => new Set(s).add('meta_description'))}
            placeholder="Mô tả ngắn cho Google/Twitter card (≤ 160 ký tự)…"
            maxLength={500}
            className={cn(inputClassFor('meta_description'), 'min-h-[80px] py-3 resize-y')}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-text-muted/50">Khuyến nghị 120–160 ký tự.</p>
            <p className="text-[10px] font-mono text-text-muted/50">
              {formData.meta_description.length} / 500
            </p>
          </div>
          <ErrorLine k="meta_description" />
        </div>
      </section>

      {/* FOOTER ACTIONS ------------------------------------------ */}
      <div
        className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 flex items-center justify-end gap-3"
        style={{
          background: 'rgba(18, 36, 28, 0.85)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(241, 229, 172, 0.1)',
        }}
      >
        <Link href={backHref} className={ghostBtn}>
          Huỷ
        </Link>
        <button
          type="submit"
          className={primaryBtn}
          disabled={submitting || !isValid}
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {submitting ? 'Đang lưu…' : mode === 'create' ? 'Tạo bộ sưu tập' : 'Lưu thay đổi'}
        </button>
      </div>

    </form>
    {mode === 'edit' && collectionId && (
      <ProductPicker
        open={showProductPicker}
        onOpenChange={setShowProductPicker}
        excludeIds={products.map((p) => p.id)}
        max={50}
        onConfirm={handleAddProducts}
      />
    )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function validateAll(d: FormData): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.name.trim()) e.name = 'Tên là bắt buộc.';
  else if (d.name.trim().length > 200) e.name = 'Tên tối đa 200 ký tự.';

  if (!d.slug.trim()) e.slug = 'Slug là bắt buộc.';
  else if (!slugRegex.test(d.slug.trim())) e.slug = 'Slug chỉ gồm chữ thường, số và dấu -.';

  if (d.description.length > 2000) e.description = 'Mô tả tối đa 2000 ký tự.';

  if (d.cover_image_url && d.cover_image_url.trim().length > 0) {
    try {
      // Accept full URL or path-like string (server URL validator sẽ check lại lần nữa)
      if (!/^https?:\/\//i.test(d.cover_image_url.trim()) && !d.cover_image_url.trim().startsWith('/')) {
        e.cover_image_url = 'URL không hợp lệ.';
      }
    } catch {
      e.cover_image_url = 'URL không hợp lệ.';
    }
  }

  if (typeof d.display_order !== 'number' || d.display_order < 0) {
    e.display_order = 'Display order phải là số không âm.';
  }

  if (d.story_text.length > 20000) e.story_text = 'Story text tối đa 20000 ký tự.';
  if (d.meta_title.length > 200) e.meta_title = 'Meta title tối đa 200 ký tự.';
  if (d.meta_description.length > 500) e.meta_description = 'Meta description tối đa 500 ký tự.';

  return e;
}

function deepFieldEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return a === b;
}
