// TODO: replace placeholders with real social links + logo URL when branding assets are finalized
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const LOGO_URL = `${SITE_URL}/logo.png`;

export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Emerald Vault',
    alternateName: 'Emerald Vault — Trang sức si Nhật vintage',
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      'Tuyển chọn trang sức si Nhật vintage đã qua thẩm định. Nhẫn, dây chuyền, bông tai, vòng tay từ những tiệm kim hoàn cổ điển Tokyo & Kyoto.',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        areaServed: 'VN',
        availableLanguage: ['vi', 'en'],
        // TODO: replace with real support email/phone
        email: 'support@emerald-vault.vn',
        telephone: '+84-000-000-000',
      },
    ],
    sameAs: [
      // TODO: populate with real Facebook/Instagram/TikTok/YouTube URLs
      'https://www.facebook.com/emeraldvault',
      'https://www.instagram.com/emeraldvault',
      'https://www.tiktok.com/@emeraldvault',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
