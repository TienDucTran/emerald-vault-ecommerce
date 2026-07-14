import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { MOCK_COLLECTIONS } from '@/lib/mock-data';

export default function CollectionsPage() {
  const collections = MOCK_COLLECTIONS.filter((c) => c.is_published);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          ✦ BỘ SƯU TẬP
        </p>
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">
          <span className="text-text-base">Mỗi bộ sưu tập là một </span>
          <span className="text-gradient-gold">câu chuyện</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-text-muted">
          Mỗi mùa chúng tôi ra mắt một bộ sưu tập mới — được tuyển chọn và sắp xếp theo cảm hứng riêng.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/bo-suu-tap/${c.slug}`}
            className="group shine-on-hover relative block aspect-[4/3] overflow-hidden rounded-lg border border-gold/20"
          >
            {c.cover_image_url && (
              <Image
                src={c.cover_image_url}
                alt={c.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6">
              <h2 className="font-heading text-2xl font-bold text-text-base transition-colors group-hover:text-gold">
                {c.name}
              </h2>
              {c.description && (
                <p className="mt-2 line-clamp-2 text-sm text-text-muted">{c.description}</p>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold">
                Khám phá
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
