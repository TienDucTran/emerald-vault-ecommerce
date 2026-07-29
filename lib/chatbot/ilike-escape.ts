// lib/chatbot/ilike-escape.ts
// Escape SQL LIKE/ILIKE special chars (% _ \) in user input để tránh wildcard injection.
// Áp dụng trước khi wrap trong `%...%` cho PostgREST `.ilike()` / `.or()`.
// Vì PostgREST không escape, ký tự '%' '_' trong input sẽ được treat as wildcard.
export function escapeIlikePattern(input: string): string {
  if (!input) return '';
  // Escape: % → \%, _ → \, \ → \\
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// Wrapper: escape special chars + wrap cho unaccent ILIKE search.
// Cặp với Postgres unaccent() extension (xem supabase/migrations/0027_unaccent_extension.sql).
// Cú pháp PostgREST: `unaccent(title).ilike.%pattern%` — function call trên column.
export function unaccentIlikePattern(input: string): string {
  return `%${escapeIlikePattern(input)}%`;
}

