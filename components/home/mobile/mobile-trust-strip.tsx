const TRUST_ITEMS = [
  {
    icon: <ShieldIcon />,
    text: ['CHÍNH HÃNG', 'GIA KIỂM ĐỊNH'],
  },
  {
    icon: <ClockIcon />,
    text: ['GIỮ HÀNG', '10 PHÚT ƯU TIÊN'],
  },
  {
    icon: <CraftIcon />,
    text: ['CHẾ TÁC', 'THỦ CÔNG TINH XẢO'],
  },
  {
    icon: <GlobeIcon />,
    text: ['BẢO HIỂM', 'VẬN CHUYỂN TOÀN CẦU'],
  },
];

export function MobileTrustStrip() {
  return (
    <section
      className="py-12"
      style={{
        backgroundColor: '#0D1117',
        borderTop: '1px solid rgba(242, 202, 80, 0.1)',
        borderBottom: '1px solid rgba(242, 202, 80, 0.1)',
      }}
    >
      <div className="grid grid-cols-2 gap-y-8 px-6">
        {TRUST_ITEMS.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center gap-3">
            {/* Icon */}
            <div className="pb-3">{item.icon}</div>
            {/* Text */}
            <div className="flex flex-col items-center">
              {item.text.map((line, lineIdx) => (
                <p
                  key={lineIdx}
                  className="font-heading text-[10px] leading-[1.25em] text-text-base"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="25" viewBox="0 0 20 25" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 0L0 4V12C0 19 4.5 23.5 10 25C15.5 23.5 20 19 20 12V4L10 0Z"
        fill="rgba(242, 202, 80, 0.8)"
      />
      <path
        d="M6.5 12L9 14.5L14 8.5"
        stroke="#0D1117"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="27" viewBox="0 0 24 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="13.5" r="11" stroke="#F2CA50" strokeWidth="1.5" />
      <path
        d="M12 7V13.5L16 16"
        stroke="#F2CA50"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CraftIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 26 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 0L16 9H25L18 15L21 24L13 18L5 24L8 15L1 9H10L13 0Z"
        fill="rgba(242, 202, 80, 0.8)"
        stroke="#F2CA50"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="26" height="27" viewBox="0 0 26 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13.5" r="11" stroke="#F2CA50" strokeWidth="1.5" />
      <ellipse cx="13" cy="13.5" rx="5" ry="11" stroke="#F2CA50" strokeWidth="1.5" />
      <path d="M2 13.5H24M4 8.5H22M4 18.5H22" stroke="#F2CA50" strokeWidth="1.5" />
    </svg>
  );
}