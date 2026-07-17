import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CollectionForm } from '@/components/admin/collections/collection-form';
import type { CollectionRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCollectionPage({ params }: PageProps) {
  const { id } = await params;
  const { adminClient } = await requireAdmin();
  const { data, error } = await adminClient
    .from('collections')
    .select('*')
    .eq('id', id)
    .maybeSingle<CollectionRow>();

  if (error) {
    return (
      <div className="space-y-6">
        <div
          className="p-4 rounded-sm border border-error/30 text-error text-sm"
          style={{ background: 'rgba(18, 36, 28, 0.6)' }}
        >
          Không tải được bộ sưu tập: {error.message}
        </div>
        <Link
          href="/admin/collections"
          className="text-xs text-gold hover:text-gold/80 font-heading tracking-[0.1em] uppercase"
        >
          ← Quay lại
        </Link>
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CollectionForm
        mode="edit"
        initialData={data}
        collectionId={data.id}
      />
    </div>
  );
}
