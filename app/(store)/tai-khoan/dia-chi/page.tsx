import { Truck, ShieldCheck, BadgeCheck, Headphones } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/require-customer';
import { AddressBook } from '@/components/account/address-book';

export const metadata = { title: 'Sổ địa chỉ' };

export default async function AddressesPage() {
  const { user } = await requireCustomer();
  return (
    <div className="flex flex-col gap-8">
      <AddressBook userId={user.id} showHeader />
    </div>
  );
}