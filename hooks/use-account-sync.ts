'use client';

/**
 * @deprecated Wishlist localStorage → server sync is no longer needed.
 * The wishlist is now server-authoritative (user must be logged in to add).
 * This file is kept as a no-op stub to avoid breaking any remaining import.
 * Safe to delete once all imports are removed.
 */

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

export function useAccountSync(): { status: SyncStatus; syncedCount: number } {
  return { status: 'done', syncedCount: 0 };
}

export function resetAccountSyncFlag(): void {
  // no-op
}
