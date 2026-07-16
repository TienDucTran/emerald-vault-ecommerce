'use client';

/**
 * ProductForm — shared admin form dùng cho cả New Product và Edit Product.
 *
 * - Create mode: POST /api/admin/products
 * - Edit mode:   PATCH /api/admin/products/{productId}  (gửi CHỈ field thay đổi)
 *
 * Sections (theo STITCH_HANDOFF.md §6):
 *   1. THÔNG TIN CƠ BẢN     (title, slug, code, category, material,
 *                             quality_tier, status, is_featured, color, era)
 *   2. GIÁ & KHOẢN GIÁ       (price, original_price, description)
 *   3. HÌNH ẢNH & MEDIA      (image_url, gallery)
 *   4. PHÂN LOẠI             (collection_id, season_tags)
 *   5. (Edit only) VÙNG NGUY HIỂM — Delete modal
 *
 * Header (breadcrumb + H1 + actions) + Footer sticky (actions) bao ngoài.
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
  type KeyboardEvent,
  type Ref,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Library,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  formatVND,
  slugify,
  MATERIAL_LABELS,
  CATEGORY_LABELS,
  TIER_LABELS,
  cn,
} from '@/lib/utils';
import {
  CreateProductSchema,
  UpdateProductSchema,
  type CreateProductInput,
} from '@/lib/admin/products-schema';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast/toast-store';
import { resizeImage, formatBytes } from '@/lib/image/client-resize';
import { MediaPicker } from '@/components/admin/media/media-picker';
import type {
  ProductRow,
  ProductCategory,
  Material,
  QualityTier,
  ProductStatus,
} from '@/lib/supabase/types';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ProductFormMode = 'create' | 'edit';

export interface ProductFormProps {
  mode: ProductFormMode;
  initialData?: ProductRow | null;
  productId?: string;
  onSuccess?: (product: ProductRow) => void;
  backHref?: string;
}

type FormData = {
  title: string;
  slug: string;
  code: string;
  material: Material | '';
  category: ProductCategory | '';
  image_url: string;
  price: number | '';
  quality_tier: QualityTier | '';
  color: string;
  description: string;
  original_price: number | '';
  era: string;
  status: ProductStatus;
  is_featured: boolean;
  season_tags: string[];
  collection_id: string;
  gallery: string[];
};

const emptyData = (): FormData => ({
  title: '',
  slug: '',
  code: '',
  material: '',
  category: '',
  image_url: '',
  price: '',
  quality_tier: '',
  color: '',
  description: '',
  original_price: '',
  era: '',
  status: 'AVAILABLE',
  is_featured: false,
  season_tags: [],
  collection_id: '',
  gallery: [],
});

const fromProduct = (p: ProductRow): FormData => ({
  title: p.title ?? '',
  slug: p.slug ?? '',
  code: p.code ?? '',
  material: p.material,
  category: p.category,
  image_url: p.image_url ?? '',
  price: p.price,
  quality_tier: p.quality_tier,
  color: p.color ?? '',
  description: p.description ?? '',
  original_price: p.original_price ?? '',
  era: p.era ?? '',
  status: p.status,
  is_featured: !!p.is_featured,
  season_tags: Array.isArray(p.season_tags) ? p.season_tags : [],
  collection_id: p.collection_id ?? '',
  gallery: Array.isArray(p.gallery) ? p.gallery : [],
});

/* -------------------------------------------------------------------------- */
/*  Design tokens (từ STITCH_HANDOFF.md §2)                                    */
/* -------------------------------------------------------------------------- */

const glassStyle: CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};
const glassStrong: CSSProperties = {
  background: 'rgba(18, 36, 28, 0.75)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(242, 202, 80, 0.3)',
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
const tintError = 'border-error/30 bg-error/5 text-error';
const tintWarning = 'border-gold/30 bg-gold/5 text-gold';
const tintInfo = 'border-gold/30 bg-gold/5 text-gold';

const tierBadgeCls = (tier: 'SSS' | 'SS' | 'S', active: boolean) => {
  const base = 'inline-block px-2 py-0.5 text-[9px] font-bold rounded';
  const color =
    tier === 'SSS'
      ? 'bg-gradient-to-r from-gold to-gold-champagne text-background'
      : tier === 'SS'
      ? 'bg-gold/20 text-gold border border-gold/40'
      : 'bg-surface text-gold/80 border border-gold/20';
  const ring = active ? 'ring-1 ring-gold' : '';
  return `${base} ${color} ${ring}`;
};

const SUGGESTED_TAGS = [
  'HERITAGE_2026',
  'WINTER',
  'SUMMER_2026',
  'VINTAGE_AUTUMN',
  'VALENTINE_2026',
];

const MAX_GALLERY = 20;
const MAX_DESC = 5000;

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function ProductForm({
  mode,
  initialData,
  productId,
  onSuccess,
  backHref = '/admin/products',
}: ProductFormProps) {
  const router = useRouter();
  const confirm = useConfirm();

  // Hold initialData in state for edit mode (so we can update it after PATCH)
  const [currentInitial, setCurrentInitial] = useState<ProductRow | null>(
    initialData ?? null
  );

  const [formData, setFormData] = useState<FormData>(() =>
    initialData ? fromProduct(initialData) : emptyData()
  );

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugExistsWarning, setSlugExistsWarning] = useState(false);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [uploadingGalleryIndex, setUploadingGalleryIndex] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  // Field refs for focus management
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const setFieldRef =
    (key: string) =>
    (el: HTMLElement | null): void => {
      fieldRefs.current[key] = el;
    };
  const focusField = (key: string) => {
    const el = fieldRefs.current[key];
    if (el) el.focus();
  };

  // Collections for select
  const [collections, setCollections] = useState<{ id: string; name: string; slug: string }[] | null>(null);

  /* -------- Collections fetch -------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/collections');
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && json?.ok) {
          setCollections(json.data ?? []);
        } else if (!cancelled) {
          setCollections([]);
        }
      } catch {
        if (!cancelled) setCollections([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------- Revoke local preview URL on unmount / change -------- */
  useEffect(() => {
    return () => {
      if (localImagePreview) URL.revokeObjectURL(localImagePreview);
    };
  }, [localImagePreview]);

  /* -------- Slug uniqueness check (create mode, debounced 500ms) -------- */
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (mode !== 'create') {
      setSlugExistsWarning(false);
      return;
    }
    const slug = formData.slug.trim();
    if (slug.length < 2) {
      setSlugExistsWarning(false);
      return;
    }
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/products?keyword=${encodeURIComponent(slug)}&pageSize=1`
        );
        const json = await res.json().catch(() => null);
        // Coarse: list endpoint matches keyword by ilike on title/slug/code.
        // A 0-result is "definitely free"; a positive is "probably taken".
        const total = (json && (json.total ?? (json.data?.length ?? 0))) || 0;
        setSlugExistsWarning(total > 0);
      } catch {
        setSlugExistsWarning(false);
      }
    }, 500);
    return () => {
      if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    };
  }, [formData.slug, mode]);

  /* -------- Dirty tracking (edit mode) -------- */
  const dirty = useMemo(() => {
    if (mode !== 'edit' || !currentInitial) return false;
    return !deepEqualForm(formData, fromProduct(currentInitial));
  }, [formData, currentInitial, mode]);

  /* -------- Form validity (lightweight) -------- */
  const validation = useMemo(() => {
    return validateAll(formData);
  }, [formData]);
  const isValid = Object.keys(validation).length === 0;

  /* -------- Handlers -------- */
  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onBlurField = useCallback(
    (key: keyof FormData) => {
      setTouched((s) => new Set(s).add(key as string));
      // Slug auto-generate on title blur (create mode only, not yet edited)
      if (mode === 'create' && key === 'title' && !slugManuallyEdited) {
        const t = (formData.title || '').trim();
        if (t.length > 0) {
          setFormData((prev) => ({ ...prev, slug: slugify(t) }));
        }
      }
    },
    [formData.title, mode, slugManuallyEdited]
  );

  const onChangeTitle = (e: ChangeEvent<HTMLInputElement>) => {
    setField('title', e.target.value);
  };

  const onChangeSlug = (e: ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setField('slug', e.target.value);
  };

  const resetAutoSlug = () => {
    setSlugManuallyEdited(false);
    const t = (formData.title || '').trim();
    setField('slug', t.length > 0 ? slugify(t) : '');
  };

  const generateSlugFromTitle = () => {
    const t = (formData.title || '').trim();
    if (t.length === 0) {
      toast.warning('Nhập title trước đã.');
      return;
    }
    setField('slug', slugify(t));
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

  const suggestNextCode = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products?keyword=EV-&pageSize=100');
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return;
      const list: { code: string | null }[] = json.data ?? [];
      let max = 0;
      for (const p of list) {
        if (!p.code) continue;
        const m = /^EV-(\d+)$/.exec(p.code);
        if (m) {
          const n = parseInt(m[1], 10);
          if (Number.isFinite(n) && n > max) max = n;
        }
      }
      const next = `EV-${String(max + 1).padStart(4, '0')}`;
      setField('code', next);
    } catch {
      // silent
    }
  }, [setField]);

  // Resize → upload → set public URL cho ảnh chính.
  const onUploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset để chọn lại cùng file được
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('File không phải ảnh.');
      return;
    }

    setIsUploadingMain(true);
    try {
      const originalSize = file.size;
      const blob = await resizeImage(file);
      const newSize = blob.size;
      const saved = originalSize - newSize;

      const fd = new FormData();
      // Truyền tên gốc (kèm extension gốc) để server slugify thành path sạch. Blob ở đây là webp
      // (do resize), nhưng server không quan tâm extension gốc — nó chỉ lấy name để slugify rồi
      // tự gắn '.webp'. Server fallback sang file.name nếu thiếu originalName.
      fd.append('file', blob, file.name);
      fd.append('originalName', file.name);
      fd.append('folder', 'products');
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      }

      setField('image_url', json.publicUrl);
      if (localImagePreview) URL.revokeObjectURL(localImagePreview);
      setLocalImagePreview(null);
      const pct = originalSize > 0 ? Math.round((saved / originalSize) * 100) : 0;
      toast.success(
        `Upload OK — ${formatBytes(originalSize)} → ${formatBytes(newSize)} (giảm ${pct}%)`
      );
    } catch (err) {
      toast.error(`Upload thất bại: ${err instanceof Error ? err.message : 'lỗi không xác định'}`);
    } finally {
      setIsUploadingMain(false);
    }
  };

  // Resize → upload → set public URL cho 1 item gallery tại index.
  const uploadToGallery = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File không phải ảnh.');
      return;
    }
    setUploadingGalleryIndex(index);
    try {
      const originalSize = file.size;
      const blob = await resizeImage(file);
      const newSize = blob.size;

      const fd = new FormData();
      // Truyền tên gốc (kèm extension gốc) để server slugify thành path sạch. Blob ở đây là webp
      // (do resize), nhưng server không quan tâm extension gốc — nó chỉ lấy name để slugify rồi
      // tự gắn '.webp'. Server fallback sang file.name nếu thiếu originalName.
      fd.append('file', blob, file.name);
      fd.append('originalName', file.name);
      fd.append('folder', 'products');
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      }

      const next = [...formData.gallery];
      next[index] = json.publicUrl;
      setField('gallery', next);
      const pct = originalSize > 0 ? Math.round(((originalSize - newSize) / originalSize) * 100) : 0;
      toast.success(`Upload OK — ${formatBytes(originalSize)} → ${formatBytes(newSize)} (giảm ${pct}%)`);
    } catch (err) {
      toast.error(`Upload thất bại: ${err instanceof Error ? err.message : 'lỗi không xác định'}`);
    } finally {
      setUploadingGalleryIndex(null);
    }
  };

  const onPickGalleryFile = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadToGallery(index, file);
  };

  const clearLocalImage = () => {
    if (localImagePreview) URL.revokeObjectURL(localImagePreview);
    setLocalImagePreview(null);
  };

  /* -------- Season tag helpers -------- */
  const [tagDraft, setTagDraft] = useState('');

  const commitTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (formData.season_tags.includes(t)) {
      setTagDraft('');
      return;
    }
    if (formData.season_tags.length >= 20) {
      toast.warning('Tối đa 20 tag.');
      setTagDraft('');
      return;
    }
    setFormData((prev) => ({ ...prev, season_tags: [...prev.season_tags, t] }));
    setTagDraft('');
  };

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag(tagDraft);
    } else if (e.key === 'Backspace' && tagDraft === '' && formData.season_tags.length > 0) {
      // backspace on empty input removes last chip
      setFormData((prev) => ({
        ...prev,
        season_tags: prev.season_tags.slice(0, -1),
      }));
    }
  };

  const removeTag = (t: string) => {
    setFormData((prev) => ({
      ...prev,
      season_tags: prev.season_tags.filter((x) => x !== t),
    }));
  };

  /* -------- Gallery helpers -------- */
  const updateGallery = (next: string[]) => {
    if (next.length > MAX_GALLERY) {
      toast.warning(`Tối đa ${MAX_GALLERY} ảnh trong gallery.`);
      return;
    }
    setField('gallery', next);
  };
  const setGalleryRow = (i: number, v: string) => {
    const next = [...formData.gallery];
    next[i] = v;
    updateGallery(next);
  };
  const removeGalleryRow = (i: number) => {
    const next = [...formData.gallery];
    next.splice(i, 1);
    updateGallery(next);
  };
  const addGalleryRow = () => {
    if (formData.gallery.length >= MAX_GALLERY) {
      toast.warning(`Tối đa ${MAX_GALLERY} ảnh trong gallery.`);
      return;
    }
    updateGallery([...formData.gallery, '']);
  };

  /* -------- Build payload -------- */
  const buildCreatePayload = (): CreateProductInput | null => {
    const payload: Record<string, unknown> = {
      title: formData.title.trim(),
      slug: formData.slug.trim(),
      material: formData.material,
      category: formData.category,
      image_url: formData.image_url.trim(),
      price: typeof formData.price === 'number' ? formData.price : Number(formData.price),
      quality_tier: formData.quality_tier,
    };
    if (formData.code.trim()) payload.code = formData.code.trim();
    if (formData.color.trim()) payload.color = formData.color.trim();
    if (formData.description.trim()) payload.description = formData.description.trim();
    if (formData.original_price !== '' && formData.original_price !== null) {
      payload.original_price =
        typeof formData.original_price === 'number'
          ? formData.original_price
          : Number(formData.original_price);
    }
    if (formData.era.trim()) payload.era = formData.era.trim();
    payload.status = formData.status;
    payload.is_featured = !!formData.is_featured;
    if (formData.season_tags.length > 0) payload.season_tags = formData.season_tags;
    if (formData.collection_id) payload.collection_id = formData.collection_id;
    if (formData.gallery.some((g) => g.trim().length > 0)) {
      payload.gallery = formData.gallery.map((g) => g.trim()).filter(Boolean);
    }
    return payload as CreateProductInput;
  };

  const buildChangedPayload = (): Record<string, unknown> => {
    if (!currentInitial) return {};
    const initial = fromProduct(currentInitial);
    const out: Record<string, unknown> = {};
    const keys: (keyof FormData)[] = [
      'title', 'slug', 'code', 'material', 'category', 'image_url', 'price',
      'quality_tier', 'color', 'description', 'original_price', 'era', 'status',
      'is_featured', 'season_tags', 'collection_id', 'gallery',
    ];
    for (const k of keys) {
      const a = formData[k];
      const b = initial[k];
      if (!deepFieldEqual(a, b)) {
        if (k === 'original_price') {
          if (a === '' || a === null) out.original_price = null;
          else out.original_price = typeof a === 'number' ? a : Number(a);
        } else if (k === 'price') {
          out.price = typeof a === 'number' ? a : Number(a);
        } else {
          out[k] = a;
        }
      }
    }
    // Normalize empty strings to null for nullable fields
    if ('code' in out && (out.code as string) === '') out.code = null;
    if ('color' in out && (out.color as string) === '') out.color = null;
    if ('era' in out && (out.era as string) === '') out.era = null;
    if ('description' in out && (out.description as string) === '') out.description = null;
    if ('collection_id' in out && (out.collection_id as string) === '') out.collection_id = null;
    return out;
  };

  /* -------- Submit handlers -------- */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setErrors({});

    if (mode === 'create') {
      const payload = buildCreatePayload();
      const result = CreateProductSchema.safeParse(payload);
      if (!result.success) {
        const flat = result.error.flatten();
        const map: Record<string, string> = {};
        for (const [k, msgs] of Object.entries(flat.fieldErrors)) {
          if (msgs && msgs.length > 0) map[k] = msgs[0]!;
        }
        setErrors(map);
        const firstKey = Object.keys(map)[0];
        if (firstKey) focusField(firstKey);
        toast.error('Vui lòng kiểm tra các trường lỗi.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(result.data),
        });
        const json = await res.json().catch(() => null);
        if (res.status === 201 && json?.ok) {
          toast.success('✓ Đã tạo sản phẩm.');
          const created = json.data as ProductRow;
          if (onSuccess) {
            onSuccess(created);
          } else {
            setTimeout(() => router.push('/admin/products'), 1200);
          }
          return;
        }
        if (res.status === 409 && json?.error === 'SLUG_EXISTS') {
          setErrors({ slug: 'Slug này đã tồn tại — chọn slug khác.' });
          focusField('slug');
          return;
        }
        if (res.status === 409 && json?.error === 'CODE_EXISTS') {
          setErrors({ code: 'Mã sản phẩm (code) này đã tồn tại.' });
          focusField('code');
          return;
        }
        toast.error('Tạo sản phẩm thất bại. Thử lại sau.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Network error');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Edit
      const changed = buildChangedPayload();
      if (Object.keys(changed).length === 0) {
        toast.info('Không có thay đổi.');
        return;
      }
      const result = UpdateProductSchema.safeParse(changed);
      if (!result.success) {
        const first = result.error.issues[0];
        toast.error(first ? `${first.path.join('.')}: ${first.message}` : 'Dữ liệu không hợp lệ.');
        return;
      }
      if (!productId) {
        toast.error('Thiếu product id.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(result.data),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) {
          toast.success('✓ Đã lưu thay đổi.');
          const updated = json.data as ProductRow;
          setCurrentInitial(updated);
          setFormData(fromProduct(updated));
          setTouched(new Set());
          setErrors({});
          if (onSuccess) onSuccess(updated);
          return;
        }
        if (res.status === 409 && json?.error === 'SLUG_EXISTS') {
          setErrors({ slug: 'Slug này đã tồn tại — chọn slug khác.' });
          focusField('slug');
          return;
        }
        if (res.status === 409 && json?.error === 'CODE_EXISTS') {
          setErrors({ code: 'Mã sản phẩm (code) này đã tồn tại.' });
          focusField('code');
          return;
        }
        toast.error('Lưu thay đổi thất bại. Thử lại sau.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Network error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  /* -------- Discard changes (edit) -------- */
  const discardChanges = async () => {
    if (!currentInitial) return;
    const ok = await confirm({
      title: 'Hủy mọi thay đổi?',
      description: 'Các thay đổi chưa lưu sẽ bị mất. Hành động này không thể hoàn tác.',
      variant: 'danger',
      confirmText: 'Hủy thay đổi',
    });
    if (!ok) return;
    setFormData(fromProduct(currentInitial));
    setTouched(new Set());
    setErrors({});
    setSlugManuallyEdited(false);
  };

  /* -------- Delete (edit) -------- */
  const onConfirmDelete = async () => {
    if (!productId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error('Xóa thất bại. Thử lại sau.');
        return;
      }
      toast.error('Đã xóa sản phẩm.');
      setDeleteOpen(false);
      router.push('/admin/products');
    } catch {
      toast.error('Xóa thất bại. Thử lại sau.');
    } finally {
      setDeleting(false);
    }
  };

  /* -------- Field error helpers -------- */
  const shouldShow = (k: string) => touched.has(k) || submitAttempted;
  const inputClassFor = (k: string) => (shouldShow(k) && errors[k] ? inputErrorCls : inputCls);

  /* -------- Render error line (min-h-4 to prevent layout shift) -------- */
  const ErrorLine = ({ k }: { k: string }) => {
    if (!shouldShow(k)) return <div className="min-h-4 mt-1" />;
    const msg = errors[k];
    if (!msg) return <div className="min-h-4 mt-1" />;
    return <p className="text-xs text-error min-h-4 mt-1">{msg}</p>;
  };

  /* -------- Date banners (edit only) -------- */
  const isSoldOut = mode === 'edit' && currentInitial?.status === 'SOLD_OUT';
  const isNew =
    mode === 'edit' &&
    currentInitial
      ? Date.now() - new Date(currentInitial.created_at).getTime() < 30 * 24 * 3600 * 1000
      : false;

  /* -------- Submit button enable state -------- */
  const canSubmitCreate = !submitting && isValid;
  const canSubmitEdit = !submitting && dirty && isValid;

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-fade-in">
      {/* HEADER -------------------------------------------------------- */}
      <div>
        <p className="text-xs text-text-muted/50 font-mono">
          <Link href={backHref} className="hover:text-gold transition-colors">
            Products
          </Link>{' '}
          /{' '}
          <span className="text-text-muted/80">
            {mode === 'edit' ? currentInitial?.title ?? 'Đang tải…' : 'New product'}
          </span>
        </p>

        <div className="flex items-start justify-between flex-wrap gap-3 mt-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className={h1Cls}>
                {mode === 'create'
                  ? 'New Product'
                  : currentInitial?.title ?? 'Đang tải…'}
              </h1>
              {mode === 'edit' && dirty && <DirtyChip />}
            </div>
            <p className={subtitleCls}>
              {mode === 'create' ? (
                'Tạo kho báu mới cho bộ sưu tập Emerald Vault.'
              ) : (
                <span className="font-mono text-xs">
                  Slug: <span className="text-gold/80">{currentInitial?.slug ?? '—'}</span> · Code:{' '}
                  <span className="text-gold/80">{currentInitial?.code || '—'}</span> · Cập nhật lần cuối:{' '}
                  <span className="text-gold/80">
                    {currentInitial?.updated_at?.slice(0, 10) || '—'}
                  </span>
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {mode === 'edit' && currentInitial?.slug && (
              <a
                href={`/san-pham/${currentInitial.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={iconGhostBtn}
                aria-label="Mở trên storefront"
                title="Mở trên storefront"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <Link href={backHref} className={ghostBtn}>
              ← Quay lại
            </Link>
          </div>
        </div>
      </div>

      {/* EDIT-ONLY BANNERS ------------------------------------------- */}
      {mode === 'edit' && isSoldOut && (
        <WarningBanner
          variant="warning"
          icon={<AlertCircle className="w-4 h-4" />}
          text="Sản phẩm đang ở trạng thái Hết hàng. Khách hàng sẽ không thấy trên storefront trừ khi bạn đổi sang Có sẵn."
        />
      )}
      {mode === 'edit' && isNew && (
        <WarningBanner
          variant="info"
          icon={<Info className="w-4 h-4" />}
          text="Sản phẩm mới — chưa có đơn hàng nào. Theo dõi tại Dashboard → Orders."
        />
      )}

      {/* SECTION 1 — THÔNG TIN CƠ BẢN ------------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>Thông tin cơ bản</h2>

        {/* title */}
        <div>
          <label htmlFor="f-title" className={labelCls}>
            Tên sản phẩm <span className="text-error">*</span>
          </label>
          <input
            id="f-title"
            ref={setFieldRef('title') as unknown as Ref<HTMLInputElement>}
            type="text"
            value={formData.title}
            onChange={onChangeTitle}
            onBlur={() => onBlurField('title')}
            placeholder="Nhẫn Bạc Opal Hổ Ly"
            className={cn(inputCls, 'py-2.5 text-sm')}
          />
          <ErrorLine k="title" />
        </div>

        {/* slug */}
        <div>
          <label htmlFor="f-slug" className={labelCls}>
            Slug <span className="text-error">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="f-slug"
              ref={setFieldRef('slug') as unknown as Ref<HTMLInputElement>}
              type="text"
              value={formData.slug}
              onChange={onChangeSlug}
              onBlur={() => setTouched((s) => new Set(s).add('slug'))}
              placeholder="nhan-bac-opal-ho-ly"
              className={cn(
                inputClassFor('slug'),
                'font-mono',
                slugExistsWarning ? 'border-gold/50' : ''
              )}
            />
            <button
              type="button"
              onClick={generateSlugFromTitle}
              className={iconGhostBtn}
              aria-label="Generate từ title"
              title="Generate từ title"
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
          {slugExistsWarning && shouldShow('slug') && !errors.slug && (
            <p className={cn('text-xs mt-1 min-h-4', 'text-gold')}>
              Slug này đã tồn tại — chọn slug khác để tránh lỗi.
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

        {/* code */}
        <div>
          <label htmlFor="f-code" className={labelCls}>
            Mã sản phẩm (code)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="f-code"
              ref={setFieldRef('code') as unknown as Ref<HTMLInputElement>}
              type="text"
              value={formData.code}
              onChange={(e) => setField('code', e.target.value)}
              onBlur={() => setTouched((s) => new Set(s).add('code'))}
              placeholder="EV-0001"
              className={cn(inputClassFor('code'), 'font-mono')}
            />
            <button type="button" onClick={suggestNextCode} className={ghostBtn}>
              Auto
            </button>
          </div>
          <ErrorLine k="code" />
        </div>

        {/* category + material */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="f-category" className={labelCls}>
              Danh mục <span className="text-error">*</span>
            </label>
            <select
              id="f-category"
              ref={setFieldRef('category') as unknown as Ref<HTMLSelectElement>}
              value={formData.category}
              onChange={(e) => setField('category', e.target.value as ProductCategory | '')}
              onBlur={() => setTouched((s) => new Set(s).add('category'))}
              className={cn(inputClassFor('category'), 'appearance-none pr-8')}
            >
              <option value="">— Chọn danh mục —</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <ErrorLine k="category" />
          </div>
          <div>
            <label htmlFor="f-material" className={labelCls}>
              Chất liệu <span className="text-error">*</span>
            </label>
            <select
              id="f-material"
              ref={setFieldRef('material') as unknown as Ref<HTMLSelectElement>}
              value={formData.material}
              onChange={(e) => setField('material', e.target.value as Material | '')}
              onBlur={() => setTouched((s) => new Set(s).add('material'))}
              className={cn(inputClassFor('material'), 'appearance-none pr-8')}
            >
              <option value="">— Chọn chất liệu —</option>
              {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <ErrorLine k="material" />
          </div>
        </div>

        {/* quality_tier radio group */}
        <div>
          <label className={labelCls}>
            Phân hạng chất lượng <span className="text-error">*</span>
          </label>
          <RadioTier
            value={formData.quality_tier}
            onChange={(v) => {
              setField('quality_tier', v);
              setTouched((s) => new Set(s).add('quality_tier'));
            }}
          />
          <ErrorLine k="quality_tier" />
        </div>

        {/* status chips */}
        <div>
          <label className={labelCls}>Trạng thái</label>
          <StatusChips
            value={formData.status}
            onChange={(v) => setField('status', v)}
          />
        </div>

        {/* is_featured toggle */}
        <div className="flex items-center gap-3">
          <ToggleSwitch
            checked={formData.is_featured}
            onChange={(v) => setField('is_featured', v)}
            id="f-featured"
          />
          <label htmlFor="f-featured" className="text-xs text-[#D0C5AF] cursor-pointer">
            Nổi bật trên trang chủ
          </label>
        </div>

        {/* color + era */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="f-color" className={labelCls}>
              Màu sắc
            </label>
            <input
              id="f-color"
              type="text"
              value={formData.color}
              onChange={(e) => setField('color', e.target.value)}
              onBlur={() => setTouched((s) => new Set(s).add('color'))}
              placeholder="Bạc ánh trăng"
              className={inputClassFor('color')}
            />
            <ErrorLine k="color" />
          </div>
          <div>
            <label htmlFor="f-era" className={labelCls}>
              Thời đại / era
            </label>
            <input
              id="f-era"
              type="text"
              value={formData.era}
              onChange={(e) => setField('era', e.target.value)}
              onBlur={() => setTouched((s) => new Set(s).add('era'))}
              placeholder="Victorian, 1890s"
              className={inputClassFor('era')}
            />
            <ErrorLine k="era" />
          </div>
        </div>
      </section>

      {/* SECTION 2 — GIÁ -------------------------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>Giá & khoản giá</h2>

        {/* price */}
        <div>
          <label htmlFor="f-price" className={labelCls}>
            Giá bán (VND) <span className="text-error">*</span>
          </label>
          <input
            id="f-price"
            ref={setFieldRef('price') as unknown as Ref<HTMLInputElement>}
            type="number"
            min={0}
            value={formData.price === '' ? '' : formData.price}
            onChange={(e) => {
              const v = e.target.value;
              setField('price', v === '' ? '' : Number(v));
            }}
            onBlur={() => setTouched((s) => new Set(s).add('price'))}
            placeholder="2450000"
            className={inputClassFor('price')}
          />
          <p className="text-xs font-mono text-gold/80 mt-1 min-h-4">
            {typeof formData.price === 'number' && formData.price > 0
              ? `≈ ${formatVND(formData.price)}`
              : '—'}
          </p>
          <ErrorLine k="price" />
        </div>

        {/* original_price */}
        <div>
          <label htmlFor="f-original-price" className={labelCls}>
            Giá gốc (original_price) <span className="text-text-muted/40">— tuỳ chọn</span>
          </label>
          <input
            id="f-original-price"
            type="number"
            min={0}
            value={formData.original_price === '' || formData.original_price === null ? '' : formData.original_price}
            onChange={(e) => {
              const v = e.target.value;
              setField('original_price', v === '' ? '' : Number(v));
            }}
            onBlur={() => setTouched((s) => new Set(s).add('original_price'))}
            placeholder="3200000"
            className={inputClassFor('original_price')}
          />
          <p className="text-[10px] text-text-muted/50 mt-1">
            Để trống nếu không sale.
          </p>
          <p className="text-xs font-mono text-gold/80 mt-1 min-h-4">
            {typeof formData.original_price === 'number' && formData.original_price > 0
              ? `≈ ${formatVND(formData.original_price)}`
              : '—'}
          </p>
          <ErrorLine k="original_price" />
        </div>

        {/* description */}
        <div>
          <label htmlFor="f-description" className={labelCls}>
            Mô tả chi tiết
          </label>
          <textarea
            id="f-description"
            rows={4}
            value={formData.description}
            onChange={(e) => setField('description', e.target.value)}
            onBlur={() => setTouched((s) => new Set(s).add('description'))}
            placeholder="Nhẫn bạc 925 đính opal tự nhiên, chạm khắc hổ ly…"
            maxLength={MAX_DESC}
            className={cn(inputClassFor('description'), 'min-h-[100px] py-3 resize-y')}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-text-muted/50">
              Mô tả giúp khách hiểu câu chuyện và đặc điểm sản phẩm.
            </p>
            <p className="text-[10px] font-mono text-text-muted/50">
              {formData.description.length} / {MAX_DESC}
            </p>
          </div>
          <ErrorLine k="description" />
        </div>
      </section>

      {/* SECTION 3 — HÌNH ẢNH & MEDIA ------------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>Hình ảnh & media</h2>

        {/* image_url with local preview */}
        <div>
          <label htmlFor="f-image" className={labelCls}>
            Ảnh chính <span className="text-error">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              id="f-image"
              ref={setFieldRef('image_url') as unknown as Ref<HTMLInputElement>}
              type="text"
              value={formData.image_url}
              onChange={(e) => setField('image_url', e.target.value)}
              onBlur={() => setTouched((s) => new Set(s).add('image_url'))}
              placeholder="https://… hoặc /images/products/abc.jpg"
              className={cn(inputClassFor('image_url'), 'flex-1 min-w-0 basis-full sm:basis-auto')}
            />
            <LocalImagePreview
              url={localImagePreview}
              onClear={clearLocalImage}
            />
            <div className="flex items-center gap-2 flex-wrap">
            <label
              htmlFor="f-image-file"
              className={cn(
                outlineBtn,
                'cursor-pointer',
                isUploadingMain && 'opacity-50 pointer-events-none'
              )}
            >
              {isUploadingMain ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {isUploadingMain ? 'Đang upload…' : 'Upload'}
            </label>
            <input
              id="f-image-file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUploadImage}
              disabled={isUploadingMain}
            />
            <button
              type="button"
              onClick={() => setCoverPickerOpen(true)}
              className={outlineBtn}
              title="Chọn ảnh đã có trong thư viện"
            >
              <Library className="w-3.5 h-3.5" />
              Từ thư viện
            </button>
            </div>
          </div>
          <ErrorLine k="image_url" />
        </div>

        {/* main preview card */}
        <div className="p-4 rounded-sm flex flex-col sm:flex-row sm:items-center gap-4" style={glassStyle}>
          {formData.image_url || localImagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={localImagePreview || formData.image_url}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-sm border border-[#4D4635] bg-[#1F1B13]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          ) : (
            <div className="w-32 h-32 rounded-sm border border-[#4D4635] bg-[#1F1B13] flex flex-col items-center justify-center text-text-muted/40">
              <ImageIcon className="w-8 h-8" />
              <span className="text-[10px] mt-1">Chưa có ảnh</span>
            </div>
          )}
          <div className="text-xs text-text-muted/60">
            <p className="font-mono">
              {formData.image_url ? formData.image_url : localImagePreview ? '(local preview only)' : '—'}
            </p>
            <p className="text-[10px] mt-1">Ảnh chính dùng cho thumbnail & OG image.</p>
          </div>
        </div>

        {/* gallery */}
        <div>
          <label className={labelCls}>
            Gallery (tối đa {MAX_GALLERY} ảnh)
          </label>
          <div className="space-y-2">
            {formData.gallery.map((g, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  type="text"
                  value={g}
                  onChange={(e) => setGalleryRow(i, e.target.value)}
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
                  htmlFor={`gallery-file-${i}`}
                  className={cn(
                    outlineBtn,
                    'cursor-pointer !px-2 !py-1.5',
                    uploadingGalleryIndex === i && 'opacity-50 pointer-events-none'
                  )}
                  aria-label={`Upload ảnh cho hàng gallery ${i + 1}`}
                >
                  {uploadingGalleryIndex === i ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                </label>
                <input
                  id={`gallery-file-${i}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickGalleryFile(i)}
                  disabled={uploadingGalleryIndex === i}
                />
                <button
                  type="button"
                  onClick={() => removeGalleryRow(i)}
                  className={iconGhostBtn}
                  aria-label="Xoá ảnh"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={addGalleryRow}
              className={outlineBtn}
              disabled={formData.gallery.length >= MAX_GALLERY}
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm ảnh
            </button>
            <button
              type="button"
              onClick={() => setGalleryPickerOpen(true)}
              className={outlineBtn}
              title="Chọn nhiều ảnh đã có trong thư viện"
            >
              <Library className="w-3.5 h-3.5" />
              Chọn từ thư viện
            </button>
          </div>
          <p className="text-[10px] text-text-muted/50 mt-2">
            Ảnh đầu tiên dùng làm thumbnail chính nếu image_url trống.
          </p>
        </div>
      </section>

      {/* SECTION 4 — PHÂN LOẠI -------------------------------------- */}
      <section className="p-6 rounded-sm space-y-4" style={glassStyle}>
        <h2 className={sectionTitleCls}>Phân loại</h2>

        {/* collection_id */}
        <div>
          <label htmlFor="f-collection" className={labelCls}>
            Bộ sưu tập
          </label>
          <select
            id="f-collection"
            value={formData.collection_id}
            onChange={(e) => setField('collection_id', e.target.value)}
            className={cn(inputCls, 'appearance-none pr-8')}
            disabled={collections === null}
          >
            {collections === null ? (
              <option value="" disabled>
                Đang tải…
              </option>
            ) : (
              <option value="">— Không thuộc bộ sưu tập nào —</option>
            )}
            {collections?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* season_tags chip input */}
        <div>
          <label htmlFor="f-tag" className={labelCls}>
            Season tags
          </label>
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-[#1F1B13] border border-[#4D4635] rounded-sm min-h-[40px]">
            {formData.season_tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] bg-gold/10 text-gold border border-gold/30"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="hover:text-error transition-colors"
                  aria-label={`Xoá tag ${t}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              id="f-tag"
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKey}
              onBlur={() => tagDraft && commitTag(tagDraft)}
              placeholder={formData.season_tags.length === 0 ? 'Thêm tag…' : ''}
              className="flex-1 min-w-[100px] bg-transparent text-xs text-[#D0C5AF] placeholder:text-[#D0C5AF]/30 focus:outline-none"
            />
          </div>
          <p className="text-[10px] text-text-muted/50 mt-1">
            Enter hoặc dấu phẩy để thêm. Backspace trên input trống sẽ xoá chip cuối.
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-text-muted/50 mr-1">Gợi ý:</span>
            {SUGGESTED_TAGS.filter((t) => !formData.season_tags.includes(t)).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => commitTag(t)}
                className="px-2 py-0.5 rounded-sm text-[10px] font-mono text-[#D0C5AF]/70 border border-[#4D4635] hover:border-gold/40 hover:text-gold transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 (Edit only) — VÙNG NGUY HIỂM --------------------- */}
      {mode === 'edit' && (
        <section
          className="p-6 rounded-sm border-error/30 bg-error/5 space-y-3"
          style={glassStyle}
        >
          <h2 className="font-heading text-base font-semibold text-error uppercase tracking-[0.1em]">
            Vùng nguy hiểm
          </h2>
          <p className="text-sm text-text-muted/70">
            Xóa sản phẩm là hành động không thể hoàn tác. Sản phẩm sẽ bị gỡ khỏi mọi bộ sưu tập và đơn hàng cũ vẫn giữ nguyên (do dùng snapshot).
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-error/40 text-error hover:bg-error/10 transition-colors"
            >
              Xóa sản phẩm này
            </button>
          </div>
        </section>
      )}

      {/* FOOTER STICKY ---------------------------------------------- */}
      <div
        className="sticky bottom-0 z-10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gold/30"
        style={glassStrong}
      >
        <p className="text-xs text-text-muted/50">Các trường có dấu * là bắt buộc.</p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {mode === 'create' ? (
            <>
              {formData.slug && (
                <a
                  href={`/san-pham/${formData.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ghostBtn}
                >
                  Xem trước
                </a>
              )}
              <Link href={backHref} className={outlineBtn}>
                Hủy
              </Link>
              <button type="submit" className={primaryBtn} disabled={!canSubmitCreate}>
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Tạo sản phẩm
              </button>
            </>
          ) : (
            <>
              {dirty && (
                <button type="button" onClick={discardChanges} className={ghostBtn}>
                  Hủy thay đổi
                </button>
              )}
              <Link href={backHref} className={outlineBtn}>
                Hủy
              </Link>
              <button type="submit" className={primaryBtn} disabled={!canSubmitEdit}>
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Lưu thay đổi
              </button>
            </>
          )}
        </div>
      </div>

      {/* DELETE MODAL (edit only) ----------------------------------- */}
      {deleteOpen && (
        <DeleteModal
          title={formData.title || currentInitial?.title || ''}
          slug={formData.slug || currentInitial?.slug || ''}
          code={formData.code || currentInitial?.code || ''}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={onConfirmDelete}
          loading={deleting}
        />
      )}

      {/* MEDIA PICKER — ảnh chính (single) -------------------------- */}
      <MediaPicker
        open={coverPickerOpen}
        onOpenChange={setCoverPickerOpen}
        mode="single"
        folder="products"
        initialSelected={formData.image_url ? [formData.image_url] : []}
        title="Chọn ảnh chính từ thư viện"
        onConfirm={(urls) => {
          const url = urls[0] ?? '';
          setField('image_url', url);
          if (localImagePreview) URL.revokeObjectURL(localImagePreview);
          setLocalImagePreview(null);
          if (url) toast.success('Đã chọn ảnh chính từ thư viện');
        }}
      />

      {/* MEDIA PICKER — gallery (multi) ----------------------------- */}
      <MediaPicker
        open={galleryPickerOpen}
        onOpenChange={setGalleryPickerOpen}
        mode="multi"
        folder="products"
        initialSelected={formData.gallery.filter(Boolean)}
        max={MAX_GALLERY}
        title="Chọn ảnh cho gallery"
        onConfirm={(urls) => {
          setField('gallery', urls);
          toast.success(`Đã chọn ${urls.length} ảnh cho gallery`);
        }}
      />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

function DirtyChip() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gold/70">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
      Đã có thay đổi chưa lưu
    </span>
  );
}

function WarningBanner({
  variant,
  icon,
  text,
}: {
  variant: 'warning' | 'info';
  icon: ReactNode;
  text: string;
}) {
  const cls = variant === 'warning' ? tintWarning : tintInfo;
  return (
    <div className={cn('px-4 py-3 rounded-sm border text-xs flex items-start gap-2', cls)}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <p className="leading-relaxed">{text}</p>
    </div>
  );
}

function RadioTier({
  value,
  onChange,
}: {
  value: QualityTier | '';
  onChange: (v: QualityTier) => void;
}) {
  const tiers: QualityTier[] = ['SSS', 'SS', 'S'];
  return (
    <div className="flex flex-wrap gap-2">
      {tiers.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              'flex flex-col items-center gap-1.5 px-4 py-3 rounded-sm transition-all',
              active
                ? 'border-2 border-gold bg-gold/10'
                : 'border border-[#4D4635] hover:border-gold/30 bg-[#1F1B13]'
            )}
            style={{ minWidth: 110 }}
          >
            <span className={tierBadgeCls(t, active)}>{t}</span>
            <span className="text-[10px] text-[#D0C5AF] text-center leading-tight">
              {TIER_LABELS[t]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatusChips({
  value,
  onChange,
}: {
  value: ProductStatus;
  onChange: (v: ProductStatus) => void;
}) {
  const items: { v: ProductStatus; label: string }[] = [
    { v: 'AVAILABLE', label: 'Có sẵn' },
    { v: 'SOLD_OUT', label: 'Hết hàng' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = value === it.v;
        return (
          <button
            key={it.v}
            type="button"
            onClick={() => onChange(it.v)}
            className={cn(
              'px-4 py-2 rounded-sm text-xs font-medium border transition-colors',
              active
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-[#4D4635] text-[#D0C5AF]/70 hover:border-gold/30'
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full border transition-colors',
        checked
          ? 'bg-gold/20 border-gold/60'
          : 'bg-surface border-[#4D4635]'
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full transition-transform',
          checked ? 'bg-gold translate-x-[18px]' : 'bg-text-muted/40 translate-x-[2px]'
        )}
      />
    </button>
  );
}

function LocalImagePreview({
  url,
  onClear,
}: {
  url: string | null;
  onClear: () => void;
}) {
  if (!url) return null;
  return (
    <div className="relative w-16 h-16 rounded-sm border border-[#4D4635] bg-[#1F1B13] overflow-hidden shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Local preview" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onClear}
        className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl-sm hover:bg-error transition-colors"
        aria-label="Xoá preview"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function DeleteModal({
  title,
  slug,
  code,
  onCancel,
  onConfirm,
  loading,
}: {
  title: string;
  slug: string;
  code: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-md p-8 rounded-sm space-y-4"
        style={glassStrong}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-error" />
          <h3 className="font-heading text-lg font-semibold text-[#EAE1D4] tracking-tight">
            Xóa sản phẩm này?
          </h3>
          <p className="text-sm text-text-muted">
            Bạn sắp xóa vĩnh viễn <span className="text-gold">&quot;{title}&quot;</span>. Hành động này KHÔNG thể hoàn tác.
          </p>
          <p className="text-xs font-mono text-text-muted/50">
            Slug: {slug || '—'} · Code: {code || '—'}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} disabled={loading} className={ghostBtn}>
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-error text-background hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function deepEqualForm(a: FormData, b: FormData): boolean {
  const keys: (keyof FormData)[] = [
    'title', 'slug', 'code', 'material', 'category', 'image_url', 'price',
    'quality_tier', 'color', 'description', 'original_price', 'era', 'status',
    'is_featured', 'season_tags', 'collection_id', 'gallery',
  ];
  for (const k of keys) if (!deepFieldEqual(a[k], b[k])) return false;
  return true;
}

function deepFieldEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) {
    // treat null/undefined/'' as equal when both are "empty"
    const aEmpty = a === '' || a === null || a === undefined;
    const bEmpty = b === '' || b === null || b === undefined;
    return aEmpty && bEmpty;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepFieldEqual(v, b[i]));
  }
  return false;
}

function validateAll(d: FormData): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!d.title || d.title.trim().length < 2) errs.title = 'Tên sản phẩm là bắt buộc (tối thiểu 2 ký tự).';
  if (!d.slug || d.slug.trim().length < 2) errs.slug = 'Slug là bắt buộc (tối thiểu 2 ký tự).';
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug))
    errs.slug = 'Slug chỉ chứa chữ thường, số và dấu gạch ngang (vd: nhan-bac-opal).';
  if (!d.material) errs.material = 'Vui lòng chọn chất liệu.';
  if (!d.category) errs.category = 'Vui lòng chọn danh mục.';
  if (!d.image_url || d.image_url.trim().length === 0) errs.image_url = 'URL ảnh là bắt buộc.';
  else if (!/^https?:\/\//i.test(d.image_url) && !d.image_url.startsWith('/'))
    errs.image_url = 'URL ảnh không hợp lệ. Dùng https://… hoặc /images/…';
  if (d.price === '' || d.price === null) errs.price = 'Giá bán là bắt buộc.';
  else if (typeof d.price === 'number' && (!Number.isFinite(d.price) || d.price <= 0))
    errs.price = 'Giá phải là số nguyên dương.';
  if (!d.quality_tier) errs.quality_tier = 'Vui lòng chọn phân hạng chất lượng.';
  if (d.description && d.description.length > MAX_DESC) errs.description = `Mô tả tối đa ${MAX_DESC} ký tự.`;
  if (d.gallery.length > MAX_GALLERY) errs.gallery = `Tối đa ${MAX_GALLERY} ảnh trong gallery.`;
  if (d.code && d.code.length > 40) errs.code = 'Code tối đa 40 ký tự.';
  if (d.color && d.color.length > 60) errs.color = 'Color tối đa 60 ký tự.';
  if (d.era && d.era.length > 255) errs.era = 'Era tối đa 255 ký tự.';
  return errs;
}
