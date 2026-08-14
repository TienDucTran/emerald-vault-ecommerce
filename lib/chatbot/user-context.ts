// lib/chatbot/user-context.ts
// User Context Injection — VIP upgrade Phase 3
// Cá nhân hóa chatbot theo user logged-in: loyalty, orders gần đây, recently viewed
// Tận dụng gamification + orders infra đã có

import { createAdminClient } from '@/lib/supabase/admin';
import { getCustomerLoyalty } from '@/lib/gamification/queries';
import { formatVND } from './tools';

export interface UserContext {
  loyalty: {
    tier: string;
    totalPoints: number;
    ordersCount: number;
    lifetimeValue: number;
  } | null;
  recentOrders: Array<{
    code: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    itemCount: number;
  }>;
  recentlyViewedSlugs: string[];
}

/**
 * Fetch user context để inject vào system prompt runtime.
 * Chỉ gọi khi user logged-in (userId != null).
 * Tất cả queries dùng admin client (bypass RLS) vì route handler server-side.
 * Silent fail — nếu lỗi thì trả null, chatbot vẫn hoạt động bình thường.
 */
export async function fetchUserContext(userId: string | null): Promise<UserContext | null> {
  if (!userId) return null;

  try {
    const supabase = createAdminClient();

    // Parallel fetch: loyalty + recent orders
    const [loyalty, ordersResult] = await Promise.all([
      getCustomerLoyalty(userId).catch(() => null),
      supabase
        .from('orders')
        .select('id, code, status, total_amount, created_at')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)
        .then((res: { data: any[] | null; error: { message: string } | null }) => {
          if (res.error) {
            console.error('[user-context] orders query error:', res.error.message);
            return [];
          }
          return res.data ?? [];
        })
        .catch(() => []),
    ]);

    // Fetch item count cho each order (parallel)
    const ordersWithItems = await Promise.all(
      (ordersResult as any[]).map(async (order) => {
        try {
          const { count, error: countErr } = await supabase
            .from('order_items')
            .select('id', { count: 'exact', head: true })
            .eq('order_id', order.id);
          return {
            code: order.code,
            status: order.status,
            totalAmount: Number(order.total_amount ?? 0),
            createdAt: order.created_at,
            itemCount: countErr ? 0 : (count ?? 0),
          };
        } catch {
          return {
            code: order.code,
            status: order.status,
            totalAmount: Number(order.total_amount ?? 0),
            createdAt: order.created_at,
            itemCount: 0,
          };
        }
      })
    );

    // Recently viewed: query chat_messages để xem user đã hỏi về sp nào gần đây
    // (Fallback — wishlist cần bảng riêng, hiện dùng chat history heuristic)
    let recentlyViewedSlugs: string[] = [];
    try {
      const { data: recentMessages } = await supabase
        .from('chat_messages')
        .select('content')
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentMessages) {
        const slugRegex = /\/san-pham\/([a-z0-9-]+)/gi;
        const slugs = new Set<string>();
        for (const msg of recentMessages) {
          const content = msg.content ?? '';
          let match;
          while ((match = slugRegex.exec(content)) !== null) {
            slugs.add(match[1]);
            if (slugs.size >= 3) break;
          }
          if (slugs.size >= 3) break;
        }
        recentlyViewedSlugs = Array.from(slugs);
      }
    } catch {
      // silent — recently viewed is optional
    }

    return {
      loyalty: loyalty
        ? {
            tier: (loyalty as any).tier ?? 'BRONZE',
            totalPoints: (loyalty as any).total_points ?? 0,
            ordersCount: (loyalty as any).orders_count ?? 0,
            lifetimeValue: Number((loyalty as any).lifetime_value ?? 0),
          }
        : null,
      recentOrders: ordersWithItems,
      recentlyViewedSlugs,
    };
  } catch (e) {
    console.error('[user-context] fetch failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Format user context thành string inject vào system prompt.
 * Chỉ inject nếu có data đáng kể (đơn hàng hoặc loyalty points > 0).
 */
export function formatUserContext(ctx: UserContext | null): string {
  if (!ctx) return '';

  const parts: string[] = [];

  // Loyalty
  if (ctx.loyalty && (ctx.loyalty.totalPoints > 0 || ctx.loyalty.ordersCount > 0)) {
    const tierLabel = formatTier(ctx.loyalty.tier);
    parts.push(`THÔNG TIN KHÁCH HÀNG (đã đăng nhập):
- Hạng: ${tierLabel}
- Điểm tích lũy: ${ctx.loyalty.totalPoints} điểm
- Đã mua: ${ctx.loyalty.ordersCount} đơn — tổng giá trị ${formatVND(ctx.loyalty.lifetimeValue)}
- Mẹo: Nếu khách hỏi về điểm/quyền lợi, dựa vào thông tin này trả lời. Khách sắp đạt mốc quà tặng thì nhắc nhẹ.`);
  }

  // Recent orders
  if (ctx.recentOrders.length > 0) {
    const orderLines = ctx.recentOrders.map((o) => {
      const date = new Date(o.createdAt).toLocaleDateString('vi-VN');
      const statusLabel = formatOrderStatus(o.status);
      return `  + Đơn ${o.code} (${date}): ${statusLabel}, ${o.itemCount} món, ${formatVND(o.totalAmount)}`;
    });
    parts.push(`ĐƠN HÀNG GẦN ĐÂY:
${orderLines.join('\n')}
- Mẹo: Nếu khách hỏi về đơn hàng, đối chiếu mã đơn ở trên. Đơn PENDING/CONFIRMED → gợi ý chờ. Đơn SHIPPED → ước lượng ngày giao. Đơn DELIVERED → hỏi trải nghiệm.`);
  }

  // Recently viewed
  if (ctx.recentlyViewedSlugs.length > 0) {
    parts.push(`SẢN PHẨM ĐÃ XEM GẦN ĐÂY (slug): ${ctx.recentlyViewedSlugs.join(', ')}
- Mẹo: Nếu khách hỏi "món lúc nãy" hoặc "cái kia", đối chiếu slug này.`);
  }

  return parts.length > 0 ? parts.join('\n\n') : '';
}

function formatTier(tier: string): string {
  const labels: Record<string, string> = {
    BRONZE: 'Đồng',
    SILVER: 'Bạc',
    GOLD: 'Vàng',
    PLATINUM: 'Bạch Kim',
    DIAMOND: 'Kim Cương',
  };
  return labels[tier] ?? tier;
}

function formatOrderStatus(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PROCESSING: 'Đang chuẩn bị',
    SHIPPED: 'Đang giao',
    DELIVERED: 'Đã giao',
    DONE: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    REFUNDED: 'Đã hoàn tiền',
  };
  return labels[status] ?? status;
}