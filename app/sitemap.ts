import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  const [productsRes, collectionsRes] = await Promise.all([
    supabase
      .from('products')
      .select('slug, updated_at, created_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('collections')
      .select('slug, created_at')
      .eq('is_published', true)
      .order('display_order', { ascending: true }),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/san-pham`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/bo-suu-tap`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/cau-chuyen`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/lien-he`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/chinh-sach/van-chuyen`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/chinh-sach/doi-tra`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/chinh-sach/bao-mat`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/huong-dan-bao-quan`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/cach-phan-biet-do-si`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const productRoutes: MetadataRoute.Sitemap = ((productsRes.data ?? []) as Array<{ slug: string; updated_at: string; created_at: string }>).map((p) => ({
    url: `${SITE_URL}/san-pham/${p.slug}`,
    lastModified: new Date(p.updated_at ?? p.created_at ?? now),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = ((collectionsRes.data ?? []) as Array<{ slug: string; created_at: string }>).map((c) => ({
    url: `${SITE_URL}/bo-suu-tap/${c.slug}`,
    lastModified: new Date(c.created_at ?? now),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...collectionRoutes, ...productRoutes];
}
