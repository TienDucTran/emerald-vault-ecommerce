export function MobileFooter() {
  return (
    <footer
      className="px-6 pb-32 pt-16 lg:hidden"
      style={{
        backgroundColor: '#0D1117',
        borderTop: '1px solid rgba(242, 202, 80, 0.05)',
      }}
    >
      <h3 className="mb-8 font-heading text-[24px] tracking-tight text-gold">EMERALD VAULT</h3>

      <div className="flex flex-col gap-10">
        {/* Liên Lạc */}
        <div className="flex flex-col gap-4">
          <h4 className="font-heading text-[11px] tracking-[0.2em] text-gold">LIÊN LẠC</h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <PhoneIcon />
              <p className="font-sans text-[13px] text-parchment/80">+84 24 1234 5678</p>
            </div>
            <div className="flex items-center gap-3">
              <MailIcon />
              <p className="font-sans text-[13px] text-parchment/80">concierge@emeraldvault.com</p>
            </div>
            <div className="flex items-center gap-3">
              <LocationIcon />
              <p className="font-sans text-[13px] text-parchment/80">88 Ginza District, Tokyo, Japan</p>
            </div>
          </div>
        </div>

        {/* Kết Nối */}
        <div className="flex flex-col gap-4">
          <h4 className="font-heading text-[11px] tracking-[0.2em] text-gold">KẾT NỐI VỚI CHÚNG TÔI</h4>
          <div className="flex gap-8">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <SocialIcon name="instagram" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              <SocialIcon name="facebook" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
              <SocialIcon name="youtube" />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
              <SocialIcon name="tiktok" />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 max-w-[280px]">
        <p className="font-sans text-[11px] leading-[1.625em] text-parchment/50">
          © 2024 Tokyo Retro Gems. Bảo lưu mọi quyền tuyệt tác. Tất cả trang sức đều được kiểm định bởi chuyên gia GIA uy tín nhất.
        </p>
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

function SocialIcon({ name }: { name: string }) {
  if (name === 'instagram') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="#F2CA50" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" stroke="#F2CA50" strokeWidth="1.5" />
        <circle cx="17.5" cy="6.5" r="1" fill="#F2CA50" />
      </svg>
    );
  }
  if (name === 'facebook') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 8H16V5H14C12.3 5 11 6.3 11 8V10H9V13H11V21H14V13H16L17 10H14V8Z" stroke="#F2CA50" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'youtube') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke="#F2CA50" strokeWidth="1.5" />
        <path d="M10 9L15 12L10 15V9Z" fill="#F2CA50" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 3V14.5C15 16.4 13.4 18 11.5 18C9.6 18 8 16.4 8 14.5C8 12.6 9.6 11 11.5 11C12 11 12.5 11.1 13 11.3V8.2C12.5 8.1 12 8 11.5 8C8 8 5 11 5 14.5C5 18 8 21 11.5 21C15 21 18 18 18 14.5V8C19.5 9 21 9.5 21 9.5V6C21 6 18 5.5 16 3.5C15.7 3.2 15.3 3 15 3Z" stroke="#F2CA50" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}