/**
 * Inner layout cho /admin/* (login, register, forgot-password, ...).
 * KHÔNG render <html>/<body> ở đây — root layout (app/layout.tsx) đã làm.
 * Tách riêng khỏi (admin) route group vì:
 *   - Cần URL /admin/login (group (admin) làm URL mất segment "admin")
 *   - Cần layout riêng (không sidebar/header — vì user chưa đăng nhập)
 */
export default function AdminPublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
