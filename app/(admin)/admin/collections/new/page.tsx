import { CollectionForm } from '@/components/admin/collections/collection-form';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function NewCollectionPage() {
  return (
    <div className="space-y-6">
      <CollectionForm mode="create" />
    </div>
  );
}
