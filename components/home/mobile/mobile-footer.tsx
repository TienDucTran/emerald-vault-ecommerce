import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Facebook } from 'lucide-react';
import { ZaloIcon } from '@/components/layout/zalo-icon';
import { TikTokIcon } from '@/components/layout/tiktok-icon';
import type { SiteSettings } from '@/lib/types';
import { DEFAULT_SITE_SETTINGS } from '@/lib/supabase/queries/site-content-defaults';

interface MobileFooterProps {
  settings?: SiteSettings;
}

export function MobileFooter({ settings }: MobileFooterProps) {
  const s = settings ?? DEFAULT_SITE_SETTINGS;
  const tagline = s.footer_tagline ?? DEFAULT_SITE_SETTINGS.footer_tagline ?? '';
  const instagram = s.social_instagram ?? DEFAULT_SITE_SETTINGS.social_instagram ?? '#';
  const facebook = s.social_facebook ?? DEFAULT_SITE_SETTINGS.social_facebook ?? '#';
  const tiktok = s.social_tiktok ?? DEFAULT_SITE_SETTINGS.social_tiktok ?? '#';
  const zalo = s.contact_zalo ?? DEFAULT_SITE_SETTINGS.contact_zalo ?? '';
  const phone = s.contact_phone ?? DEFAULT_SITE_SETTINGS.contact_phone ?? '';
  const email = s.contact_email ?? DEFAULT_SITE_SETTINGS.contact_email ?? '';
  const address = s.address ?? DEFAULT_SITE_SETTINGS.address ?? '';

  return (
    <footer
      className="border-t border-gold/10 bg-background pb-32 pt-16 lg:hidden"
    >
      <div className="mx-auto w-full max-w-store px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mb-8 inline-block">
          <Image
            src="/images/logo.png"
            alt="Emerald Vault — Trang sức si Nhật vintage"
            width={220}
            height={56}
            className="h-12 w-auto"
          />
        </Link>

        <div className="flex flex-col gap-10">
          {/* Liên Lạc */}
          <div className="flex flex-col gap-4">
            <h4 className="font-heading text-[11px] tracking-[0.2em] text-gold">LIÊN LẠC</h4>
            <div className="flex flex-col gap-3">
              {phone && (
                <div className="flex items-center gap-3">
                  <PhoneIcon />
                  <p className="font-sans text-[13px] text-parchment/80">{phone}</p>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-3">
                  <MailIcon />
                  <p className="font-sans text-[13px] text-parchment/80">{email}</p>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-3">
                  <LocationIcon />
                  <p className="font-sans text-[13px] text-parchment/80">{address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Kết Nối */}
          <div className="flex flex-col gap-4">
            <h4 className="font-heading text-[11px] tracking-[0.2em] text-gold">KẾT NỐI VỚI CHÚNG TÔI</h4>
            <div className="flex gap-6">
              {instagram && instagram !== '#' && (
                <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                  <Instagram className="h-6 w-6 text-gold" strokeWidth={1.5} />
                </a>
              )}
              {facebook && facebook !== '#' && (
                <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                  <Facebook className="h-6 w-6 text-gold" strokeWidth={1.5} />
                </a>
              )}
              {tiktok && tiktok !== '#' && (
                <a href={tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
                  <TikTokIcon className="h-6 w-6 text-gold" />
                </a>
              )}
              {zalo && (
                <a
                  href={`https://zalo.me/${zalo.replace(/[\s.-]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Zalo"
                >
                  <ZaloIcon variant="mono" className="h-6 w-6 text-gold" />
                </a>
              )}
            </div>
          </div>
        </div>

        {tagline && (
          <div className="mt-8 max-w-[280px]">
            <p className="font-sans text-[11px] leading-[1.625em] text-parchment/50">
              {tagline}
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-gold/10 pt-4 text-xs text-text-disabled">
          <p>© 2026 Emerald Vault. Mọi quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}

function PhoneIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1.5C1 1 1.5 0.5 2 0.5H3.5L4.5 3L3 4C3.5 5.5 5.5 7.5 7 8L8 6.5L10.5 7.5V9C10.5 9.5 10 10 9.5 10C5 10 1 6 1 1.5Z" fill="rgba(208, 197, 175, 0.8)" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="13" height="10" viewBox="0 0 13 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="12" height="9" rx="1" stroke="rgba(208, 197, 175, 0.8)" />
      <path d="M1 1L6.5 5.5L12 1" stroke="rgba(208, 197, 175, 0.8)" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="10" height="13" viewBox="0 0 10 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 0C2.2 0 0 2.2 0 5C0 8.5 5 13 5 13C5 13 10 8.5 10 5C10 2.2 7.8 0 5 0ZM5 6.5C4.2 6.5 3.5 5.8 3.5 5C3.5 4.2 4.2 3.5 5 3.5C5.8 3.5 6.5 4.2 6.5 5C6.5 5.8 5.8 6.5 5 6.5Z" fill="rgba(208, 197, 175, 0.8)" />
    </svg>
  );
}