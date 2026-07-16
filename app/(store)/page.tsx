import { HeroSection } from '@/components/home/hero-section';
import { TrustStrip } from '@/components/home/trust-strip';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { TierShowcase } from '@/components/home/tier-showcase';
import { LatestArrivals } from '@/components/home/latest-arrivals';
import { StoryTeaser } from '@/components/home/story-teaser';
import { DataWarning } from '@/components/layout/data-warning';
import { getPublishedCollections } from '@/lib/supabase/queries/collections';
import { getNewestProducts } from '@/lib/supabase/queries/products';
import { toCollection, toProduct } from '@/lib/adapters/supabase-to-app';
import { safeList } from '@/lib/data/safe-fetch';

// Trang này gọi createClient() (cookies) → bắt buộc dynamic.
// (xem https://nextjs.org/docs/messages/dynamic-server-error)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [collectionsRes, latestRes] = await Promise.all([
    safeList(() => getPublishedCollections()),
    safeList(() => getNewestProducts(8)),
  ]);

  const appCollections = collectionsRes.data.map(toCollection);
  const latestProducts = latestRes.data.map(toProduct);
  const errorMsg = collectionsRes.error ?? latestRes.error;

  return (
    <>
      <DataWarning message={errorMsg} />
      <HeroSection />
      <TrustStrip />
      <FeaturedCollections collections={appCollections} />
      <TierShowcase />
      <LatestArrivals products={latestProducts} />
      <StoryTeaser />
    </>
  );
}
