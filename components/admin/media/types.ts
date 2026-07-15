/**
 * Shared types cho Media Library admin UI.
 *
 * Shape này khớp với response từ `GET /api/admin/media` (xem
 * `app/api/admin/media/route.ts`). Server hiện định nghĩa MediaItem local,
 * dùng type này làm nguồn chân lý cho client; refactor server sang import
 * từ đây trong phase sau.
 */

export interface MediaItem {
  id: string;
  path: string;
  publicUrl: string;
  filename: string;
  size: number;
  contentType: string;
  folder: string;
  createdAt: string;
  usageCount: number;
  usedIn: Array<{ id: string; title: string }>;
}

export type MediaSort =
  | 'created_desc'
  | 'created_asc'
  | 'size_desc'
  | 'name_asc';
