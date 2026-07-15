import { SecurityPanel } from '@/components/account/security-panel';

export const metadata = { title: 'Bảo mật' };

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">
          BẢO MẬT
        </h1>
        <p className="text-base text-text-muted">
          Bảo vệ tài khoản của bạn bằng mật khẩu mạnh và quản lý phiên đăng nhập.
        </p>
      </div>
      <SecurityPanel />
    </div>
  );
}
