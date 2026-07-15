/**
 * Inner dashboard layout — chỉ wrap children.
 * Sidebar + Header đã được mount ở `app/(admin)/layout.tsx` (root của nhóm admin).
 * Tại đây có thể thêm: auth gate server-side, breadcrumbs, page title resolver, ...
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
