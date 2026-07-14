import { HeroSection } from '@/components/home/hero-section';
import { TrustStrip } from '@/components/home/trust-strip';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { TierShowcase } from '@/components/home/tier-showcase';
import { LatestArrivals } from '@/components/home/latest-arrivals';
import { StoryTeaser } from '@/components/home/story-teaser';
import {
  MOCK_COLLECTIONS,
  getFeaturedProducts,
  getLatestProducts,
} from '@/lib/mock-data';

export default function HomePage() {
  // TODO: replace with Supabase server-side fetch
  const collections = MOCK_COLLECTIONS.filter((c) => c.is_published);
  const featured = MOCK_COLLECTIONS.slice(0, 3);
  const featuredProducts = getFeaturedProducts(4);
  const latest = getLatestProducts(8);

  return (
    <>
      {/* Dùng chung components cho cả desktop + mobile.
          Mỗi component tự responsive qua Tailwind breakpoint (md:/lg:).
          Footer + bottom-nav + chatbot đã có ở app/layout.tsx — không cần render lại ở đây. */}
      <HeroSection />
      <TrustStrip />
      <FeaturedCollections collections={featured} />
      <TierShowcase />
      <LatestArrivals products={latest} />
      <StoryTeaser />
    </>
  );
}
