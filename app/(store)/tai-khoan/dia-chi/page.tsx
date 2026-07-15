import { requireCustomer } from '@/lib/auth/require-customer';
import { AddressBook } from '@/components/account/address-book';

export const metadata = { title: 'Sổ địa chỉ' };

export default async function AddressesPage() {
  const { user } = await requireCustomer();
  return <AddressBook userId={user.id} />;
}
