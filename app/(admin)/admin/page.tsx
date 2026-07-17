/**
 * /admin — Dashboard Overview (real data)
 *
 * Server Component:
 *   - Gọi `getDashboardData()` từ `lib/analytics/dashboard.ts` (dùng supabaseAdmin).
 *   - `revalidate = 30` → cache 30s để giảm tải DB.
 *   - Có client "Làm mới" button để gọi router.refresh().
 *
 * Data flow:
 *   Row 1 — 4 KPI cards: Revenue (month), Orders (month), Products avail/total, Subscribers.
 *   Row 2 — Alerts (pending orders, expiring locks, sold-out products).
 *   Row 3 — Recent orders (5) + Low stock products (5).
 *   Row 4 — 30-day revenue chart (SVG bar).
 *   Row 5 — Pending orders (5) + Expiring locks (5).
 */
import Link from 'next/link';
import {
  getDashboardData,
  type DashboardData,
} from '@/lib/analytics/dashboard';
import { formatVND, formatVNDShort } from '@/lib/utils';
import { RefreshButton } from '@/components/admin/dashboard-refresh-button';

export const revalidate = 30;

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

function formatDelta(n: number | null): {
  text: string;
  tone: 'up' | 'down' | 'flat';
} {
  if (n === null || !Number.isFinite(n)) return { text: '—', tone: 'flat' };
  const r = Math.round(n * 10) / 10;
  if (r > 0) return { text: `↑ ${r}%`, tone: 'up' };
  if (r < 0) return { text: `↓ ${Math.abs(r)}%`, tone: 'down' };
  return { text: '0%', tone: 'flat' };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN');
}

function statusBadge(status: string): string {
  switch (status) {
    case 'NEW':
      return 'border border-warning/40 text-warning bg-warning/10';
    case 'CONFIRMED':
      return 'border border-info/40 text-info bg-info/10';
    case 'SHIPPING':
      return 'border border-blue-400/40 text-blue-300 bg-blue-400/10';
    case 'DONE':
      return 'border border-success/40 text-success bg-success/10';
    case 'CANCELLED':
      return 'border border-error/40 text-error bg-error/10';
    case 'PAID':
      return 'border border-success/40 text-success bg-success/10';
    case 'PENDING':
      return 'border border-warning/40 text-warning bg-warning/10';
    case 'AVAILABLE':
      return 'border border-success/40 text-success bg-success/10';
    case 'SOLD_OUT':
      return 'border border-error/40 text-error bg-error/10';
    case 'ACTIVE':
      return 'border border-info/40 text-info bg-info/10';
    default:
      return 'border border-[#4D4635]/40 text-[#D0C5AF]/70 bg-[#1F1B13]';
  }
}

export default async function AdminDashboardPage() {
  let data: DashboardData | null = null;
  let loadError: string | null = null;
  try {
    data = await getDashboardData();
  } catch (e) {
    console.error('[admin/page] getDashboardData failed:', e);
    loadError = (e as Error)?.message ?? 'Lỗi tải dữ liệu';
  }

  if (!data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Tổng quan
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">Dashboard tổng hợp cho admin.</p>
        </div>
        <div
          className="p-6 rounded-sm border border-error/30 text-error text-sm"
          style={{ background: 'rgba(18, 36, 28, 0.6)' }}
        >
          Không thể tải dữ liệu dashboard. {loadError}
        </div>
      </div>
    );
  }

  const { kpis, recentOrders, lowStockProducts, pendingOrders, expiringLocks, revenueChart } = data;
  const revenueDeltaPct = pctDelta(kpis.revenueThisMonth, kpis.revenueLastMonth);
  const ordersDeltaPct = pctDelta(kpis.ordersThisMonth, kpis.ordersLastMonth);
  const revenueDelta = formatDelta(revenueDeltaPct);
  const ordersDelta = formatDelta(ordersDeltaPct);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#EAE1D4] tracking-tight">
            Tổng quan
          </h1>
          <p className="text-sm text-[#D0C5AF]/60 mt-1">
            Số liệu thật từ Supabase · Tự động cập nhật mỗi 30s
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Row 1 — KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue this month */}
        <KpiCard
          label="Doanh thu tháng này"
          value={kpis.revenueThisMonth > 0 ? formatVNDShort(kpis.revenueThisMonth) : '₫0'}
          sub={
            <>
              <span
                className={
                  revenueDelta.tone === 'up'
                    ? 'text-success'
                    : revenueDelta.tone === 'down'
                      ? 'text-error'
                      : 'text-[#D0C5AF]/50'
                }
              >
                {revenueDelta.text}
              </span>{' '}
              <span className="text-[#D0C5AF]/40">vs tháng trước</span>
            </>
          }
          icon="₫"
        />
        {/* Orders this month */}
        <KpiCard
          label="Đơn hàng tháng này"
          value={kpis.ordersThisMonth.toString()}
          sub={
            <>
              <span
                className={
                  ordersDelta.tone === 'up'
                    ? 'text-success'
                    : ordersDelta.tone === 'down'
                      ? 'text-error'
                      : 'text-[#D0C5AF]/50'
                }
              >
                {ordersDelta.text}
              </span>{' '}
              <span className="text-[#D0C5AF]/40">tổng {kpis.totalOrders}</span>
            </>
          }
          icon="🛒"
        />
        {/* Products available */}
        <KpiCard
          label="Sản phẩm available"
          value={`${kpis.productsAvailable} / ${kpis.totalProducts}`}
          sub={
            <span className="text-[#D0C5AF]/40">
              {kpis.productsSoldOut > 0 ? `${kpis.productsSoldOut} đã bán hết` : 'Chưa có sản phẩm bán hết'}
            </span>
          }
          icon="📦"
        />
        {/* Subscribers */}
        <KpiCard
          label="Subscriber newsletter"
          value={kpis.totalSubscribers.toString()}
          sub={
            <span className="text-[#D0C5AF]/40">
              {kpis.totalCollections > 0
                ? `${kpis.publishedCollections}/${kpis.totalCollections} collection đã xuất bản`
                : '—'}
            </span>
          }
          icon="✉"
        />
      </div>

      {/* Row 2 — Alerts */}
      <div className="flex flex-wrap gap-3">
        {kpis.ordersPending > 0 && (
          <Link
            href="/admin/orders?status=NEW"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.05em] uppercase border border-warning/40 text-warning bg-warning/5 hover:bg-warning/10 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            Có {kpis.ordersPending} đơn hàng chờ xử lý → Xem
          </Link>
        )}
        {kpis.pendingBankConfirmations > 0 && (
          <Link
            href="/admin/orders?status=WAITING_CONFIRM"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.05em] uppercase border border-error/40 text-error bg-error/5 hover:bg-error/10 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
            Có {kpis.pendingBankConfirmations} đơn CK chờ xác nhận → Xem
          </Link>
        )}
        {expiringLocks.length > 0 && (
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.05em] uppercase border border-info/40 text-info bg-info/5 hover:bg-info/10 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-info animate-pulse" />
            Có {expiringLocks.length} lock sắp hết hạn
          </Link>
        )}
        {kpis.productsSoldOut > 0 && (
          <Link
            href="/admin/products?status=SOLD_OUT"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.05em] uppercase border border-error/40 text-error bg-error/5 hover:bg-error/10 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-error" />
            {kpis.productsSoldOut} sản phẩm đã bán hết
          </Link>
        )}
        {kpis.activeLocks > 0 && (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.05em] uppercase border border-[#4D4635]/40 text-[#D0C5AF]/70 bg-[#1F1B13]">
            <span className="w-2 h-2 rounded-full bg-gold" />
            {kpis.activeLocks} lock đang hoạt động
          </span>
        )}
        {kpis.ordersPending === 0 &&
          kpis.pendingBankConfirmations === 0 &&
          expiringLocks.length === 0 &&
          kpis.productsSoldOut === 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-heading tracking-[0.05em] uppercase border border-success/40 text-success bg-success/5">
              <span className="w-2 h-2 rounded-full bg-success" />
              Mọi thứ ổn — không có cảnh báo
            </span>
          )}
      </div>

      {/* Row 3 — Recent orders + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <Panel
          title="Đơn hàng gần đây"
          subtitle="5 đơn mới nhất"
          link={{ href: '/admin/orders', label: 'Xem tất cả' }}
        >
          {recentOrders.length === 0 ? (
            <EmptyRow message="Chưa có đơn hàng nào." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#4D4635]/30">
                  <th className="text-left py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Mã
                  </th>
                  <th className="text-left py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Khách
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Tổng
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.15)] transition-colors"
                  >
                    <td className="py-2 px-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-gold hover:text-gold/80 font-medium"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-[#D0C5AF]/80 truncate max-w-[140px]">
                      {o.customer_name}
                    </td>
                    <td className="py-2 px-3 text-right text-[#EAE1D4]">
                      {formatVND(Number(o.total_amount))}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 text-[9px] rounded ${statusBadge(o.status)}`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Low stock */}
        <Panel
          title="Sản phẩm sắp hết"
          subtitle="AVAILABLE cũ nhất (quantity = 1, sắp hết vì lâu không bán)"
          link={{ href: '/admin/products?status=AVAILABLE', label: 'Xem tất cả' }}
        >
          {lowStockProducts.length === 0 ? (
            <EmptyRow message="Chưa có sản phẩm AVAILABLE nào." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#4D4635]/30">
                  <th className="text-left py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Sản phẩm
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Giá
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Tạo
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.15)] transition-colors"
                  >
                    <td className="py-2 px-3">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="flex items-center gap-2 text-[#D0C5AF] hover:text-gold transition-colors"
                      >
                        <div className="w-6 h-6 rounded bg-[#1F1B13] border border-[#4D4635]/30 flex items-center justify-center overflow-hidden shrink-0">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[8px] text-[#D0C5AF]/30">◆</span>
                          )}
                        </div>
                        <span className="truncate max-w-[180px]">{p.title}</span>
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-right text-[#EAE1D4]">
                      {formatVND(Number(p.price))}
                    </td>
                    <td className="py-2 px-3 text-right text-[#D0C5AF]/50">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {/* Row 4 — Revenue chart 30 days */}
      <Panel
        title="Doanh thu 30 ngày"
        subtitle={`Tổng: ${formatVND(
          revenueChart.reduce((s, r) => s + r.revenue, 0)
        )} · ${revenueChart.reduce((s, r) => s + r.orders, 0)} đơn PAID`}
      >
        <RevenueBarChart data={revenueChart} />
      </Panel>

      {/* Row 5 — Pending orders + Expiring locks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="Đơn chờ xử lý"
          subtitle="status = NEW, cũ nhất trước"
          link={{ href: '/admin/orders?status=NEW', label: 'Xem tất cả' }}
        >
          {pendingOrders.length === 0 ? (
            <EmptyRow message="Không có đơn chờ xử lý." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#4D4635]/30">
                  <th className="text-left py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Mã
                  </th>
                  <th className="text-left py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Khách
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Tổng
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Tạo
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.15)] transition-colors"
                  >
                    <td className="py-2 px-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-gold hover:text-gold/80 font-medium"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-[#D0C5AF]/80 truncate max-w-[140px]">
                      {o.customer_name}
                    </td>
                    <td className="py-2 px-3 text-right text-[#EAE1D4]">
                      {formatVND(Number(o.total_amount))}
                    </td>
                    <td className="py-2 px-3 text-right text-[#D0C5AF]/50">
                      {formatDateTime(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          title="Lock sắp hết hạn"
          subtitle="ACTIVE, expires < 5 phút tới"
          link={{ href: '/admin/inventory', label: 'Xem inventory' }}
        >
          {expiringLocks.length === 0 ? (
            <EmptyRow message="Không có lock sắp hết hạn." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#4D4635]/30">
                  <th className="text-left py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Product ID
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/50">
                    Hết hạn
                  </th>
                </tr>
              </thead>
              <tbody>
                {expiringLocks.map((l) => {
                  const ms = new Date(l.expires_at).getTime() - Date.now();
                  const isUrgent = ms < 60_000;
                  return (
                    <tr
                      key={l.id}
                      className="border-b border-[#4D4635]/10 hover:bg-[rgba(56,52,43,0.15)] transition-colors"
                    >
                      <td className="py-2 px-3">
                        <Link
                          href={`/admin/products/${l.product_id}/edit`}
                          className="text-[#D0C5AF]/80 hover:text-gold font-mono text-[10px]"
                        >
                          {l.product_id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={
                            isUrgent
                              ? 'text-error font-medium'
                              : ms < 3 * 60_000
                                ? 'text-warning'
                                : 'text-[#D0C5AF]/70'
                          }
                        >
                          {Math.max(0, Math.round(ms / 1000))}s
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  icon: string;
}) {
  return (
    <div
      className="p-5 rounded-sm flex flex-col gap-3 min-w-0"
      style={{
        background: 'rgba(18, 36, 28, 0.6)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(241, 229, 172, 0.1)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-heading tracking-[0.1em] uppercase text-[#D0C5AF]/60">
          {label}
        </span>
        <span className="text-gold/60 text-lg">{icon}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-heading font-bold text-[#EAE1D4] truncate">
        {value}
      </div>
      <div className="text-[10px] truncate">{sub}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  link,
  children,
}: {
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{
        background: 'rgba(18, 36, 28, 0.6)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(241, 229, 172, 0.1)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 sm:px-6 py-4 border-b border-[#4D4635]/30">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-bold text-[#EAE1D4] tracking-[0.05em] uppercase">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-[#D0C5AF]/50 mt-0.5">{subtitle}</p>
          )}
        </div>
        {link && (
          <Link
            href={link.href}
            className="text-[10px] text-gold hover:text-gold/80 font-heading tracking-[0.1em] uppercase whitespace-nowrap"
          >
            {link.label} →
          </Link>
        )}
      </div>
      <div className="p-4 sm:p-6 overflow-x-auto">{children}</div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-xs text-[#D0C5AF]/40">{message}</div>
  );
}

/** SVG bar chart cho 30 ngày revenue. */
function RevenueBarChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const w = 800;
  const h = 180;
  const padding = 28;
  const n = Math.max(1, data.length);
  const slot = (w - padding * 2) / n;
  const barW = Math.max(2, slot - 3);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
      {data.map((d, i) => {
        const x = padding + i * slot;
        const barH = (d.revenue / max) * (h - 50);
        const y = h - 30 - barH;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={1.5}
              fill="url(#gold-grad-dash)"
              opacity={d.revenue > 0 ? 0.9 : 0.2}
            >
              <title suppressHydrationWarning>
                {d.date}: {formatVND(d.revenue)} ({d.orders} đơn)
              </title>
            </rect>
            {i % 5 === 0 && (
              <text
                x={x + barW / 2}
                y={h - 10}
                textAnchor="middle"
                className="fill-[#D0C5AF]/40"
                fontSize={9}
              >
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <defs>
        <linearGradient id="gold-grad-dash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2CA50" />
          <stop offset="100%" stopColor="#F2CA5080" />
        </linearGradient>
      </defs>
    </svg>
  );
}
