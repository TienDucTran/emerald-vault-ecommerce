import { requireCustomer } from '@/lib/auth/require-customer';
import { AddressBook } from '@/components/account/address-book';

export const metadata = { title: 'Sổ địa chỉ' };

export default async function AddressesPage() {
  const { user } = await requireCustomer();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-normal leading-tight tracking-[0.1em] text-gold">
          SỔ ĐỊA CHỈ
        </h1>
        <p className="text-base text-text-muted">
          Lưu địa chỉ giao hàng để thanh toán nhanh hơn.
        </p>
      </div>
      <AddressBook userId={user.id} />
      <div className="flex justify-center pt-8">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </div>
    </div>
  );
}
