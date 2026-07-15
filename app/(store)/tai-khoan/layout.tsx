import { AccountSidebar, AccountMobileTabs } from '@/components/account/account-sidebar';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col md:flex-row">
      <AccountSidebar />
      <AccountMobileTabs />
      <main className="flex-1 px-4 py-8 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
