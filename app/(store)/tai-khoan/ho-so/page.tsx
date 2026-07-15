import { ProfileForm } from '@/components/account/profile-form';
import { AccountInfoCards } from '@/components/account/account-info-cards';

export const metadata = {
  title: 'Hồ sơ của tôi',
  description: 'Quản lý thông tin cá nhân và cài đặt tài khoản bảo mật của bạn tại Emerald Vault.',
};

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">HỒ SƠ CỦA TÔI</h1>
        <p className="text-base text-text-muted">Quản lý thông tin cá nhân và cài đặt tài khoản bảo mật của bạn tại Emerald Vault.</p>
      </div>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2"><ProfileForm /></div>
        <div className="lg:col-span-1"><AccountInfoCards /></div>
      </div>
      <div className="flex justify-center pt-8">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </div>
    </div>
  );
}
