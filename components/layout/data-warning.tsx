// Banner cảnh báo khi data layer fail (chỉ hiển thị ở dev).
import { AlertTriangle } from 'lucide-react';

interface DataWarningProps {
  message: string | null;
}

export function DataWarning({ message }: DataWarningProps) {
  if (!message) return null;
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Đang hiển thị dữ liệu rỗng — Supabase chưa sẵn sàng hoặc schema chưa khớp.
        <span className="ml-2 hidden font-mono text-[10px] text-amber-300/80 sm:inline">
          ({message})
        </span>
      </span>
    </div>
  );
}
