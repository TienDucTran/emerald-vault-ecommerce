import { requireCustomer } from '@/lib/auth/require-customer';
import { ProfileForm, type ProfileFormData } from '@/components/account/profile-form';
import { AccountInfoCards } from '@/components/account/account-info-cards';
import { LoyaltyCard } from '@/components/account/loyalty-card';
import { getCustomerLoyalty } from '@/lib/gamification/queries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hồ sơ của tôi',
  description: 'Quản lý thông tin cá nhân và cài đặt tài khoản bảo mật của bạn tại Emerald Vault.',
};

export default async function ProfilePage() {
  const { user, profile } = await requireCustomer();

  // Fetch loyalty data server-side (non-blocking — UI falls back to BRONZE/0 if null)
  const loyalty = await getCustomerLoyalty(user.id);

  const p = profile as unknown as Record<string, unknown>;
  const initialData: ProfileFormData = {
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    email: user.email ?? '',
    date_of_birth: (p.date_of_birth as string)?.split('T')[0] ?? '',
    gender: (p.gender as 'male' | 'female' | 'other' | null) ?? null,
    marketing_opt_in: (p.marketing_opt_in as boolean) ?? false,
    avatar_url: (p.avatar_url as string | null) ?? null,
  };

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">
          HỒ SƠ CỦA TÔI
        </h1>
        <p className="text-base text-text-muted">
          Quản lý thông tin cá nhân và cài đặt tài khoản bảo mật của bạn tại Emerald Vault.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProfileForm initialData={initialData} userEmail={user.email ?? ''} />
        </div>
        <div className="lg:col-span-1">
          <AccountInfoCards
            profile={{ id: profile.id, created_at: profile.created_at }}
            loyalty={loyalty}
          />
        </div>
      </div>

      {/* Loyalty & Gamification section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xl font-normal tracking-[0.1em] text-gold">
            CHƯƠNG TRÌNH KHÁCH HÀNG THÂN THIẾT
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
        </div>
        <LoyaltyCard loyalty={loyalty} />
      </div>

      <div className="flex justify-center pt-8">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </div>
    </div>
  );
}
