/**
 * /api/admin/newsletter/export
 *
 *   GET — trả về file CSV (BOM UTF-8) của tất cả subscribers.
 *     - Columns: email, full_name, source, is_active, subscribed_at
 *     - Tên file: newsletter-subscribers-YYYY-MM-DD.csv
 *
 *   Auth: requireAdmin.
 */
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export async function GET() {
  try {
    const { adminClient } = await requireAdmin();
    const { data, error } = await adminClient
      .from('newsletter_subscribers')
      .select('email, full_name, source, is_active, subscribed_at')
      .order('subscribed_at', { ascending: false });

    if (error) {
      console.error('[admin/newsletter/export] failed:', error);
      return new Response(
        JSON.stringify({ ok: false, error: 'EXPORT_FAILED', message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const header = ['email', 'full_name', 'source', 'is_active', 'subscribed_at'];
    const lines: string[] = [];
    lines.push(header.join(','));
    for (const row of data ?? []) {
      lines.push(
        [
          csvEscape(row.email),
          csvEscape(row.full_name ?? ''),
          csvEscape(row.source ?? ''),
          csvEscape(row.is_active ? 'true' : 'false'),
          csvEscape(formatDate(row.subscribed_at)),
        ].join(',')
      );
    }
    // BOM UTF-8 để Excel mở đúng tiếng Việt
    const csv = '\ufeff' + lines.join('\r\n');
    const today = new Date().toISOString().slice(0, 10);
    const filename = `newsletter-subscribers-${today}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return authErrorResponse(err, 'admin/newsletter/export');
  }
}
