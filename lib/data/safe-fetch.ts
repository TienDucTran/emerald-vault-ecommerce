// Wrapper an toàn cho Supabase queries ở Server Components.
// - Khi DB lỗi / mất mạng: trả fallback (mảng rỗng, null, ...) + log server-side.
// - Khi NEXT_PUBLIC_SHOW_DATA_WARNING=true (dev): trả banner cảnh báo qua cookies header.
// Tránh 500 crash trang khi data layer tạm thời không khả dụng.

type Result<T> = { data: T; error: string | null };

export async function safeList<T>(
  fn: () => Promise<T[]>,
  fallback: T[] = []
): Promise<Result<T[]>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[safeList] failed:', msg);
    return { data: fallback, error: msg };
  }
}

export async function safeOne<T>(
  fn: () => Promise<T | null>
): Promise<Result<T | null>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[safeOne] failed:', msg);
    return { data: null, error: msg };
  }
}

export async function safeSearch<T>(
  fn: () => Promise<{ data: T[]; total: number; page: number; pageSize: number }>,
  fallback: { data: T[]; total: number; page: number; pageSize: number } = { data: [], total: 0, page: 1, pageSize: 0 }
): Promise<Result<{ data: T[]; total: number; page: number; pageSize: number }>> {
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[safeSearch] failed:', msg);
    return { data: fallback, error: msg };
  }
}
