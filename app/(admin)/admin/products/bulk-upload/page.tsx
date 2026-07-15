'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import {
  CreateProductSchema,
  type CreateProductInput,
} from '@/lib/admin/products-schema';
import {
  formatVND,
  MATERIAL_LABELS,
  CATEGORY_LABELS,
  TIER_LABELS,
  cn,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* -------------------------------------------------------------------------- */
/*  Templates                                                                  */
/* -------------------------------------------------------------------------- */

const JSON_TEMPLATE = `[
  {
    "title": "Nhẫn Bạc Opal Hổ Ly",
    "slug": "nhan-bac-opal-ho-ly",
    "material": "BAC_925",
    "category": "NHAN",
    "image_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800",
    "price": 2450000,
    "quality_tier": "SS",
    "code": "EV-0001",
    "color": "Bạc ánh trăng",
    "description": "Nhẫn bạc 925 đính opal tự nhiên, chạm khắc hổ ly.",
    "is_featured": true,
    "status": "AVAILABLE",
    "season_tags": ["HERITAGE_2026", "WINTER"],
    "gallery": [
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800",
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200"
    ]
  },
  {
    "title": "Dây Chuyền Sapphire Đại Dương",
    "slug": "day-chuyen-sapphire-dai-duong",
    "material": "BAC_925",
    "category": "DAY_CHUYEN",
    "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800",
    "price": 3200000,
    "quality_tier": "SSS",
    "code": "EV-0002",
    "color": "Bạc Ý — Sapphire xanh dương",
    "is_featured": true,
    "status": "AVAILABLE"
  }
]`;

const CSV_TEMPLATE = `title,slug,material,category,image_url,price,quality_tier,code,color,description,original_price,era,status,is_featured,season_tags,gallery,collection_id
Nhẫn Bạc Opal Hổ Ly,nhan-bac-opal-ho-ly,BAC_925,NHAN,https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800,2450000,SS,EV-0001,Bạc ánh trăng,"Nhẫn bạc 925 đính opal tự nhiên, chạm khắc hổ ly.",,HERITAGE_2026;WINTER,https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800;https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200,
Dây Chuyền Sapphire Đại Dương,day-chuyen-sapphire-dai-duong,BAC_925,DAY_CHUYEN,https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800,3200000,SSS,EV-0002,Bạc Ý — Sapphire xanh dương,,,,,,,,
`;

const CSV_HEADER = [
  'title',
  'slug',
  'material',
  'category',
  'image_url',
  'price',
  'quality_tier',
  'code',
  'color',
  'description',
  'original_price',
  'era',
  'status',
  'is_featured',
  'season_tags',
  'gallery',
  'collection_id',
] as const;

/* -------------------------------------------------------------------------- */
/*  In-house CSV parser                                                        */
/* -------------------------------------------------------------------------- */

function parseCSV(input: string): string[][] {
  // Strip BOM
  const src = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // swallow; the \n handles line-end
      i++;
      continue;
    }
    cell += ch;
    i++;
  }

  // Trailing cell/row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Drop fully-empty trailing rows
  while (
    rows.length > 0 &&
    rows[rows.length - 1].length === 1 &&
    rows[rows.length - 1][0] === ''
  ) {
    rows.pop();
  }

  return rows;
}

/* -------------------------------------------------------------------------- */
/*  CSV → row objects                                                          */
/* -------------------------------------------------------------------------- */

function buildHeaderMap(headerRow: string[]): {
  map: Record<string, number>;
  missing: string[];
} {
  const map: Record<string, number> = {};
  headerRow.forEach((h, idx) => {
    const key = h.trim().toLowerCase();
    if (key) map[key] = idx;
  });
  const required = new Set(CSV_HEADER);
  const missing: string[] = [];
  required.forEach((c) => {
    if (!(c in map)) missing.push(c);
  });
  return { map, missing };
}

function coerceCSVCell(value: string, key: string): unknown {
  const v = value;
  if (key === 'price' || key === 'original_price') {
    if (v === '') return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  if (key === 'is_featured') {
    const t = v.trim().toLowerCase();
    if (t === 'true') return true;
    if (t === 'false') return false;
    return undefined;
  }
  if (key === 'season_tags' || key === 'gallery') {
    if (v === '') return undefined;
    return v
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (key === 'status' && v === '') return undefined;
  return v.trim();
}

function rowToObject(
  row: string[],
  headerMap: Record<string, number>,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of Object.keys(headerMap)) {
    const idx = headerMap[key];
    const raw = idx < row.length ? row[idx] : '';
    const coerced = coerceCSVCell(raw, key);
    if (coerced === undefined) continue;
    obj[key] = coerced;
  }
  return obj;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type ValidRow = {
  index: number;
  row: unknown;
  input: CreateProductInput;
};
type InvalidRow = {
  index: number;
  row: unknown;
  errors: { path: string; message: string }[];
};
type ValidationResult = {
  valid: ValidRow[];
  invalid: InvalidRow[];
  totalRows: number;
};

type Mode = 'json' | 'csv';

type ImportOk = {
  ok: true;
  inserted: number;
  failed: number;
  errors?: { index: number; error: string }[];
  data?: unknown;
};
type ImportErr = {
  ok: false;
  error: string;
  code?: string;
  duplicates?: { slugs?: string[]; codes?: string[] };
  existing?: { slugs?: string[]; codes?: string[] };
};
type ImportResult = ImportOk | ImportErr;

/* -------------------------------------------------------------------------- */
/*  Style tokens                                                               */
/* -------------------------------------------------------------------------- */

const glassStyle: React.CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(241, 229, 172, 0.1)',
};
const glassLight: React.CSSProperties = {
  background: 'rgba(18, 36, 28, 0.6)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(242, 202, 80, 0.2)',
};

const primaryBtn =
  'px-5 py-2 rounded-sm text-xs font-heading tracking-[0.15em] uppercase font-bold bg-gold text-[#3C2F00] hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const outlineBtn =
  'px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase border border-[rgba(242,202,80,0.2)] text-gold/80 hover:text-gold transition-colors';
const ghostBtn =
  'px-4 py-2 rounded-sm text-xs font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/70 hover:text-[#EAE1D4] transition-colors';

const tintError = 'border-error/30 bg-error/5 text-error';
const tintSuccess = 'border-success/30 bg-success/5 text-success';
const tintWarning = 'border-gold/30 bg-gold/5 text-gold';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function flattenIssues(issues: { path: (string | number)[]; message: string }[]) {
  return issues.map((i) => ({
    path: i.path.length > 0 ? i.path.join('.') : '(root)',
    message: i.message,
  }));
}

function getRowTitle(row: unknown): string {
  if (row && typeof row === 'object') {
    const r = row as Record<string, unknown>;
    if (typeof r.title === 'string' && r.title) return r.title;
    if (typeof r.slug === 'string' && r.slug) return r.slug;
  }
  return '—';
}

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const downloadJSONTemplate = () =>
  downloadBlob('products-template.json', 'application/json', JSON_TEMPLATE);
const downloadCSVTemplate = () =>
  downloadBlob('products-template.csv', 'text/csv;charset=utf-8', CSV_TEMPLATE);

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function BulkUploadPage() {
  const [mode, setMode] = useState<Mode>('json');
  const [jsonText, setJsonText] = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [result, setResult] = useState<ValidationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validCount = result?.valid.length ?? 0;
  const invalidCount = result?.invalid.length ?? 0;
  const totalRows = result?.totalRows ?? 0;

  const canValidate = mode === 'json' ? jsonText.trim().length > 0 : csvText.trim().length > 0;

  /* ------------------------- validation pipeline ------------------------- */

  const validate = useCallback(() => {
    setErrorMessage(null);
    setImportResult(null);
    const candidates: { index: number; row: unknown }[] = [];

    if (mode === 'json') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'JSON parse error';
        setResult({
          valid: [],
          invalid: [{ index: 0, row: jsonText, errors: [{ path: '(json)', message: msg }] }],
          totalRows: 1,
        });
        return;
      }
      const arr = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { products?: unknown[] }).products)
          ? (parsed as { products: unknown[] }).products
          : null;
      if (!arr) {
        setResult({
          valid: [],
          invalid: [
            {
              index: 0,
              row: parsed,
              errors: [
                {
                  path: '(root)',
                  message: 'JSON phải là một mảng các object sản phẩm',
                },
              ],
            },
          ],
          totalRows: 1,
        });
        return;
      }
      arr.forEach((r, i) => candidates.push({ index: i, row: r }));
    } else {
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        setResult({ valid: [], invalid: [], totalRows: 0 });
        return;
      }
      const [header, ...dataRows] = rows;
      const { map: headerMap, missing } = buildHeaderMap(header);
      if (missing.length > 0) {
        setResult({
          valid: [],
          invalid: [
            {
              index: 0,
              row: header,
              errors: [
                {
                  path: '(header)',
                  message: `CSV thiếu cột bắt buộc: ${missing.join(', ')}`,
                },
              ],
            },
          ],
          totalRows: dataRows.length,
        });
        return;
      }
      dataRows.forEach((r, i) => {
        const padded = r.length < headerMap ? r : r;
        candidates.push({ index: i, row: rowToObject(padded, headerMap) });
      });
    }

    const valid: ValidRow[] = [];
    const invalid: InvalidRow[] = [];
    candidates.forEach(({ index, row }) => {
      const r = CreateProductSchema.safeParse(row);
      if (r.success) {
        valid.push({ index, row, input: r.data });
      } else {
        invalid.push({ index, row, errors: flattenIssues(r.error.issues) });
      }
    });
    setResult({ valid, invalid, totalRows: candidates.length });
  }, [mode, jsonText, csvText]);

  const clearAll = () => {
    setResult(null);
    setImportResult(null);
    setErrorMessage(null);
    if (mode === 'json') setJsonText('');
    else {
      setCsvText('');
      setCsvFileName(null);
    }
  };

  const loadExample = () => {
    setJsonText(JSON_TEMPLATE);
    setImportResult(null);
  };

  /* ----------------------------- CSV drop zone ----------------------------- */

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setCsvText(text);
      setCsvFileName(file.name);
      setResult(null);
      setImportResult(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && /\.csv$/i.test(f.name)) handleFile(f);
  };

  /* ----------------------------- import action ----------------------------- */

  const submitImport = async () => {
    if (validCount === 0) return;
    setSubmitting(true);
    setErrorMessage(null);
    setImportResult(null);
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: result!.valid.map((v) => v.input),
          atomic: false,
        }),
      });
      const json = (await res.json().catch(() => null)) as ImportResult | null;
      if (!json) {
        setImportResult({ ok: false, error: `Request failed (${res.status})` });
      } else {
        setImportResult(json);
      }
    } catch (e) {
      setImportResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Network error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const removeDbDuplicates = () => {
    if (!result || !importResult || importResult.ok || importResult.code !== 'DB_DUPLICATES') {
      return;
    }
    const existing = importResult.existing ?? {};
    const slugSet = new Set(existing.slugs ?? []);
    const codeSet = new Set(existing.codes ?? []);
    const filtered = result.valid.filter(
      (v) =>
        !(typeof v.input.slug === 'string' && slugSet.has(v.input.slug)) &&
        !(typeof v.input.code === 'string' && codeSet.has(v.input.code)),
    );
    setResult({ ...result, valid: filtered });
    setImportResult(null);
  };

  const resetForNewImport = () => {
    setResult(null);
    setImportResult(null);
    setErrorMessage(null);
    setJsonText('');
    setCsvText('');
    setCsvFileName(null);
  };

  /* ----------------------------- render ----------------------------------- */

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Bulk Import
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">
            Import nhiều sản phẩm cùng lúc qua JSON hoặc CSV — tối đa 500 sản phẩm/lần.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadJSONTemplate}
            className={cn(outlineBtn, 'inline-flex items-center gap-2')}
            style={glassLight}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>📄 JSON Template</span>
          </button>
          <button
            type="button"
            onClick={downloadCSVTemplate}
            className={cn(outlineBtn, 'inline-flex items-center gap-2')}
            style={glassLight}
          >
            <Download className="w-3.5 h-3.5" />
            <span>📊 CSV Template</span>
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex items-center gap-6 border-b border-[rgba(241,229,172,0.1)]">
        {(['json', 'csv'] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'relative pb-3 text-xs font-heading tracking-[0.15em] uppercase transition-colors',
                active ? 'text-gold' : 'text-[#D0C5AF]/50 hover:text-[#D0C5AF]',
              )}
            >
              {m === 'json' ? (
                <span className="inline-flex items-center gap-2">
                  <FileJson className="w-3.5 h-3.5" /> JSON
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                </span>
              )}
              {active && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gold" />
              )}
            </button>
          );
        })}
      </div>

      {/* Input area */}
      <div className="p-6 rounded-sm" style={glassStyle}>
        {mode === 'json' ? (
          <>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setResult(null);
                setImportResult(null);
              }}
              placeholder={JSON_TEMPLATE.slice(0, 240) + '\n…'}
              spellCheck={false}
              className="w-full min-h-[320px] p-4 bg-[#1F1B13] border border-[#4D4635] rounded-sm font-mono text-xs text-[#D0C5AF] placeholder-[#D0C5AF]/30 focus:outline-none focus:border-gold/60 transition-colors resize-y"
            />
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-[#D0C5AF]/60 font-mono">
                {result ? (
                  <span>
                    Tổng: <span className="text-[#EAE1D4]">{totalRows}</span>
                    {' | '}
                    Hợp lệ:{' '}
                    <span className="text-success">{validCount}</span>
                    {' | '}
                    Lỗi: <span className="text-error">{invalidCount}</span>
                  </span>
                ) : (
                  <span>Dán JSON rồi nhấn Validate &amp; Preview.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadExample}
                  className={ghostBtn}
                >
                  Load example
                </button>
                <button type="button" onClick={clearAll} className={outlineBtn} style={glassLight}>
                  Clear
                </button>
                <button
                  type="button"
                  onClick={validate}
                  disabled={!canValidate}
                  className={primaryBtn}
                >
                  Validate &amp; Preview
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {!csvFileName ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  'border-2 border-dashed rounded-sm p-12 flex flex-col items-center justify-center text-center transition-colors',
                  dragOver
                    ? 'border-gold/60 bg-gold/5'
                    : 'border-[#4D4635] hover:border-gold/30',
                )}
                style={{ background: 'rgba(18, 36, 28, 0.3)' }}
              >
                <Upload className="w-8 h-8 text-gold/60 mb-3" />
                <p className="text-sm text-[#D0C5AF]/80 mb-1">
                  Kéo thả file CSV vào đây
                </p>
                <p className="text-xs text-[#D0C5AF]/40 mb-4">hoặc</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={primaryBtn}
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={onFileInput}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-gold/70" />
                  <div>
                    <p className="text-sm text-[#EAE1D4]">{csvFileName}</p>
                    <p className="text-xs text-[#D0C5AF]/50 font-mono">
                      {csvText.split(/\r?\n/).filter(Boolean).length - 1} dòng dữ liệu
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={clearAll} className={outlineBtn} style={glassLight}>
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={validate}
                    disabled={!canValidate}
                    className={primaryBtn}
                  >
                    Validate &amp; Preview
                  </button>
                </div>
              </div>
            )}

            {csvFileName && (
              <div className="mt-4 text-xs text-[#D0C5AF]/60 font-mono">
                {result ? (
                  <span>
                    Tổng: <span className="text-[#EAE1D4]">{totalRows}</span>
                    {' | '}
                    Hợp lệ:{' '}
                    <span className="text-success">{validCount}</span>
                    {' | '}
                    Lỗi: <span className="text-error">{invalidCount}</span>
                  </span>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {/* Ready banner */}
      {result && validCount > 0 && !importResult && (
        <div
          className={cn('px-4 py-3 rounded-sm text-xs flex items-center gap-2 border', tintSuccess)}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            Sản phẩm hợp lệ đã sẵn sàng import ({validCount} sản phẩm).
          </span>
        </div>
      )}

      {/* Import action + result */}
      {result && (validCount > 0 || importResult) && (
        <div className="p-6 rounded-sm space-y-4" style={glassStyle}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-[#D0C5AF]/70">
              Sẽ gửi <span className="text-gold font-medium">{validCount}</span> sản phẩm tới
              <span className="font-mono text-[#D0C5AF]/60"> POST /api/admin/products/bulk</span>
            </div>
            <div className="flex items-center gap-2">
              {importResult?.ok && (
                <button
                  type="button"
                  onClick={resetForNewImport}
                  className={outlineBtn}
                  style={glassLight}
                >
                  Import thêm
                </button>
              )}
              <button
                type="button"
                onClick={submitImport}
                disabled={validCount === 0 || submitting}
                className={primaryBtn}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang import…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Import {validCount} sản phẩm <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div
              className={cn(
                'px-4 py-3 rounded-sm text-xs flex items-center gap-2 border',
                tintError,
              )}
            >
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {importResult && importResult.ok && (
            <div className="space-y-3">
              <div
                className={cn(
                  'px-4 py-3 rounded-sm text-xs flex items-center gap-2 border',
                  tintSuccess,
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  ✓ Đã import <strong>{importResult.inserted}</strong> sản phẩm.
                </span>
              </div>
              {importResult.failed > 0 && (
                <div
                  className={cn(
                    'px-4 py-3 rounded-sm text-xs border',
                    tintError,
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4" />
                    <span>
                      ✗ {importResult.failed} sản phẩm bị lỗi.
                    </span>
                  </div>
                  <ul className="space-y-1 font-mono">
                    {(importResult.errors ?? []).slice(0, 10).map((e, i) => (
                      <li key={i} className="text-error/80">
                        #{e.index}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {importResult && !importResult.ok && (
            <div
              className={cn(
                'px-4 py-3 rounded-sm text-xs border space-y-2',
                importResult.code === 'BATCH_DUPLICATES' ||
                  importResult.code === 'DB_DUPLICATES'
                  ? tintWarning
                  : tintError,
              )}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">
                  {importResult.code === 'BATCH_DUPLICATES'
                    ? 'Batch chứa slug/code trùng nhau'
                    : importResult.code === 'DB_DUPLICATES'
                      ? 'Một số slug/code đã tồn tại trong DB'
                      : importResult.error}
                </span>
              </div>

              {importResult.code === 'BATCH_DUPLICATES' && importResult.duplicates && (
                <ul className="font-mono text-[11px] space-y-0.5">
                  {importResult.duplicates.slugs && importResult.duplicates.slugs.length > 0 && (
                    <li>
                      Slugs: {importResult.duplicates.slugs.join(', ')}
                    </li>
                  )}
                  {importResult.duplicates.codes && importResult.duplicates.codes.length > 0 && (
                    <li>
                      Codes: {importResult.duplicates.codes.join(', ')}
                    </li>
                  )}
                </ul>
              )}

              {importResult.code === 'DB_DUPLICATES' && importResult.existing && (
                <div className="space-y-2">
                  <ul className="font-mono text-[11px] space-y-0.5">
                    {importResult.existing.slugs && importResult.existing.slugs.length > 0 && (
                      <li>
                        Slugs đã tồn tại: {importResult.existing.slugs.join(', ')}
                      </li>
                    )}
                    {importResult.existing.codes && importResult.existing.codes.length > 0 && (
                      <li>
                        Codes đã tồn tại: {importResult.existing.codes.join(', ')}
                      </li>
                    )}
                  </ul>
                  <button
                    type="button"
                    onClick={removeDbDuplicates}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-heading tracking-[0.1em] uppercase border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Remove duplicates &amp; re-validate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preview tables */}
      {result && (
        <div className="space-y-6">
          {/* Valid */}
          <div className="rounded-sm overflow-hidden" style={glassStyle}>
            <div className="px-6 py-4 border-b border-[#4D4635]/30 flex items-center justify-between">
              <h3 className="text-xs font-heading tracking-[0.15em] uppercase text-[#D0C5AF]/80">
                Hợp lệ ({validCount})
              </h3>
            </div>
            {validCount === 0 ? (
              <div className="px-6 py-10 text-center text-xs text-[#D0C5AF]/40">
                Không có dữ liệu để xem. Dán JSON hoặc upload CSV rồi nhấn Validate.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#4D4635]/30">
                        <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 w-12">
                          #
                        </th>
                        <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                          Title
                        </th>
                        <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                          Slug
                        </th>
                        <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                          Category
                        </th>
                        <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                          Material
                        </th>
                        <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                          Tier
                        </th>
                        <th className="text-right px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.valid.slice(0, 50).map((v) => (
                        <tr
                          key={v.index}
                          className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.1)] transition-colors"
                        >
                          <td className="px-6 py-3 font-mono text-xs text-[#D0C5AF]/50">
                            {v.index + 1}
                          </td>
                          <td className="px-6 py-3 text-xs text-[#EAE1D4]">{v.input.title}</td>
                          <td className="px-6 py-3 font-mono text-xs text-[#D0C5AF]/70">
                            {v.input.slug}
                          </td>
                          <td className="px-6 py-3 text-xs text-[#D0C5AF]/80">
                            {CATEGORY_LABELS[v.input.category] ?? v.input.category}
                          </td>
                          <td className="px-6 py-3 text-xs text-[#D0C5AF]/80">
                            {MATERIAL_LABELS[v.input.material] ?? v.input.material}
                          </td>
                          <td className="px-6 py-3 text-xs text-gold/80">
                            {v.input.quality_tier}{' '}
                            <span className="text-[#D0C5AF]/40">
                              — {TIER_LABELS[v.input.quality_tier] ?? ''}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-right text-[#EAE1D4] font-medium">
                            {formatVND(v.input.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validCount > 50 && (
                  <div className="px-6 py-3 text-[11px] text-[#D0C5AF]/50 border-t border-[#4D4635]/20">
                    + {validCount - 50} hơn nữa (đã ẩn khỏi preview).
                  </div>
                )}
              </>
            )}
          </div>

          {/* Invalid */}
          {invalidCount > 0 && (
            <div className="rounded-sm overflow-hidden" style={glassStyle}>
              <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{
                  borderColor: 'rgba(220, 80, 80, 0.3)',
                  background: 'rgba(220, 80, 80, 0.06)',
                }}
              >
                <h3 className="text-xs font-heading tracking-[0.15em] uppercase text-error/90">
                  Lỗi ({invalidCount})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#4D4635]/30">
                      <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50 w-12">
                        #
                      </th>
                      <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                        Row
                      </th>
                      <th className="text-left px-6 py-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                        Lỗi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.invalid.slice(0, 20).map((iv) => {
                      const summary = iv.errors
                        .slice(0, 2)
                        .map((e) => `${e.path}: ${e.message}`)
                        .join('; ');
                      return (
                        <tr
                          key={iv.index}
                          className="border-b border-[#4D4635]/10"
                          style={{ background: 'rgba(220, 80, 80, 0.04)' }}
                        >
                          <td className="px-6 py-3 font-mono text-xs text-[#D0C5AF]/50">
                            {iv.index + 1}
                          </td>
                          <td className="px-6 py-3 text-xs text-[#D0C5AF]/80 max-w-[280px] truncate">
                            {getRowTitle(iv.row)}
                          </td>
                          <td className="px-6 py-3 text-xs text-error/90 font-mono">
                            {summary}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {invalidCount > 20 && (
                <div className="px-6 py-3 text-[11px] text-[#D0C5AF]/50 border-t border-[#4D4635]/20">
                  + {invalidCount - 20} lỗi khác (đã ẩn khỏi preview).
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
