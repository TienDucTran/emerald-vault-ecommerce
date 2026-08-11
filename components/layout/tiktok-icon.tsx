/**
 * TikTokIcon — icon TikTok outline (currentColor, stroke), đồng nhất style lucide-react.
 * lucide-react không có icon TikTok → tạo custom component.
 */
interface TikTokIconProps {
  className?: string;
}

export function TikTokIcon({ className }: TikTokIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}