/**
 * /api/products/brief?ids=uuid1,uuid2,...
 *
 *   Trả về { id, status } cho các product IDs truyền vào.
 *   Dùng để refresh stale status snapshot trong localStorage (recently-viewed, wishlist cache, ...).
 *   Public, không cần auth. Max 24 IDs mỗi request.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IDS = 24;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseIds(req: NextRequest): string[] {
  const all = req.nextUrl.searchParams.getAll('ids');
  const raw = all.length > 1 ? all.join(',') : (all[0] ?? '');
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const ids = parseIds(req);
    if (ids.length === 0) {
      return NextResponse.json({ data: [] });
    }
    if (ids.length > MAX_IDS || !ids.every((id) => UUID_RE.test(id))) {
      return NextResponse.json(
        { error: 'INVALID_IDS', message: `Provide 1-${MAX_IDS} valid UUIDs (comma-separated or repeated ?ids=).` },
        { status: 400 },
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('id, status')
      .in('id', ids);

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: 'INTERNAL', message: (e as Error).message },
      { status: 500 },
    );
  }
}
