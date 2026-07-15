import { type LucideIcon } from 'lucide-react';

interface AccountPlaceholderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

export function AccountPlaceholder({ title, subtitle, icon: Icon }: AccountPlaceholderProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">{title}</h1>
        <p className="text-base text-text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-gold/20 bg-surface p-12 text-center shadow-card">
        <div className="grid h-16 w-16 place-items-center rounded-full border border-gold/30 bg-surface-emerald">
          <Icon className="h-8 w-8 text-gold" />
        </div>
        <h2 className="font-heading text-xl text-gold">Sắp ra mắt</h2>
        <p className="max-w-md text-sm text-text-muted">Tính năng này đang được phát triển. Vui lòng quay lại sau.</p>
      </div>
    </div>
  );
}
