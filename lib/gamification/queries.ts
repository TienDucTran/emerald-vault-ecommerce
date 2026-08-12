/**
 * Gamification DB queries — server-side (Service role client)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { GiftRule, CustomerLoyalty, GiftPoolItem, LoyaltyTier } from './types';
import { getTierFromOrderCount, parseLoyaltyConfig, calculatePointsEarned } from './rules';

/**
 * Fetch loyalty config settings trực tiếp bằng admin client.
 * Tránh dùng getSiteSettings() (server client, cookie-bound) trong admin context
 * vì có thể throw nếu RLS chặn hoặc session khác.
 */
async function getLoyaltyConfigSettings(): Promise<Record<string, string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .like('key', 'loyalty%');

  if (error) {
    console.error('[getLoyaltyConfigSettings] error:', error.message);
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }
  return map;
}

/**
 * Get all active gift rules (public read)
 */
export async function getActiveGiftRules(): Promise<GiftRule[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gift_rules')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('[getActiveGiftRules] error:', error.message);
    return [];
  }

  return (data ?? []) as unknown as GiftRule[];
}

/**
 * Get gift pool items cho 1 rule
 * Join products để lấy title, image, price, tier
 */
export async function getGiftPoolByRule(ruleId: string): Promise<GiftPoolItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gift_pool')
    .select(
      `id, rule_id, product_id, stock, is_active,
       products!inner(id, title, image_url, price, quality_tier)`
    )
    .eq('rule_id', ruleId)
    .eq('is_active', true);

  if (error) {
    console.error('[getGiftPoolByRule] error:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    rule_id: row.rule_id,
    product_id: row.product_id,
    product_title: row.products?.title ?? '',
    product_image: row.products?.image_url ?? '',
    product_price: row.products?.price ?? 0,
    product_tier: row.products?.quality_tier ?? '',
    stock: row.stock ?? 0,
    is_active: row.is_active,
  }));
}

/**
 * Get customer loyalty của user hiện tại
 * Dùng admin client để bypass RLS (caller đã auth)
 */
export async function getCustomerLoyalty(userId: string): Promise<CustomerLoyalty | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_loyalty')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getCustomerLoyalty] error:', error.message);
    return null;
  }

  if (!data) {
    // Auto-create loyalty row nếu chưa có (lazy init)
    const { data: created, error: createErr } = await supabase
      .from('customer_loyalty')
      .insert({ user_id: userId })
      .select('*')
      .single();

    if (createErr) {
      console.error('[getCustomerLoyalty] create error:', createErr.message);
      return null;
    }
    return created as unknown as CustomerLoyalty;
  }

  return data as unknown as CustomerLoyalty;
}

/**
 * Upsert customer loyalty (create if not exists, update if exists)
 */
export async function upsertCustomerLoyalty(
  userId: string,
  updates: Partial<CustomerLoyalty>
): Promise<CustomerLoyalty | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('customer_loyalty')
    .upsert({ user_id: userId, ...updates })
    .select('*')
    .single();

  if (error) {
    console.error('[upsertCustomerLoyalty] error:', error.message);
    return null;
  }

  return data as unknown as CustomerLoyalty;
}

/**
 * Add point transaction + update loyalty balance
 * Should be called khi order DONE (cộng điểm) hoặc CANCELLED/REFUND (trừ điểm)
 *
 * @param userId - auth.users.id
 * @param points - số điểm (dương = cộng, âm = trừ)
 * @param reason - ORDER_DONE | ORDER_CANCEL | REFUND | REDEMPTION | TIER_BONUS
 * @param orderId - orders.id (optional)
 * @param orderValue - giá trị đơn hàng (optional, để cập nhật lifetime_value)
 */
export async function addPointTransaction(
  userId: string,
  points: number,
  reason: string,
  orderId?: string,
  orderValue?: number
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Insert transaction log
  const { error: txErr } = await supabase.from('point_transactions').insert({
    user_id: userId,
    order_id: orderId ?? null,
    points,
    reason,
  });

  if (txErr) {
    console.error('[addPointTransaction] insert error:', txErr.message);
    return;
  }

  // 2. Update loyalty balance
  const { data: existing } = await supabase
    .from('customer_loyalty')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // Tính delta cho orders_count + lifetime_value dựa trên reason
  const isOrderDone = reason === 'ORDER_DONE';
  const isOrderCancel = reason === 'ORDER_CANCEL';
  const isRefund = reason === 'REFUND';

  if (!existing) {
    // Create new row — chỉ ORDER_DONE mới cộng orders_count + lifetime_value
    const newOrdersCount = isOrderDone ? 1 : 0;
    const newLifetimeValue = isOrderDone && orderValue ? orderValue : 0;
    const newTier = getTierFromOrderCount(newOrdersCount) as LoyaltyTier;

    await upsertCustomerLoyalty(userId, {
      total_points: Math.max(0, points),
      lifetime_points: Math.max(0, points),
      orders_count: newOrdersCount,
      lifetime_value: newLifetimeValue,
      tier: newTier,
    });
  } else {
    // Update existing
    const newTotal = Math.max(0, (existing.total_points ?? 0) + points);
    // lifetime_points: chỉ cộng khi points > 0, không trừ (chỉ total_points trừ)
    const newLifetime = Math.max(0, (existing.lifetime_points ?? 0) + Math.max(0, points));
    const newOrdersCount = isOrderDone
      ? (existing.orders_count ?? 0) + 1
      : isOrderCancel
        ? Math.max(0, (existing.orders_count ?? 0) - 1)
        : isRefund
          ? Math.max(0, (existing.orders_count ?? 0) - 1) // refund cũng trừ count
          : existing.orders_count ?? 0;

    // lifetime_value: cộng khi ORDER_DONE, trừ khi ORDER_CANCEL/REFUND
    let newLifetimeValue = existing.lifetime_value ?? 0;
    if (isOrderDone && orderValue) {
      newLifetimeValue += orderValue;
    } else if ((isOrderCancel || isRefund) && orderValue) {
      newLifetimeValue = Math.max(0, newLifetimeValue - orderValue);
    }

    // Auto recalculate tier dựa trên newOrdersCount
    const newTier = getTierFromOrderCount(newOrdersCount) as LoyaltyTier;

    await supabase
      .from('customer_loyalty')
      .update({
        total_points: newTotal,
        lifetime_points: newLifetime,
        orders_count: newOrdersCount,
        lifetime_value: newLifetimeValue,
        tier: newTier,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }
}

/**
 * Award points khi đơn hàng hoàn tất (status → DONE).
 *
 * Fetch order từ DB để lấy total_amount + customer_id, tính điểm theo tier
 * hiện tại của user, gọi addPointTransaction.
 *
 * @param orderId - orders.id
 */
export async function awardOrderPoints(orderId: string): Promise<void> {
  const supabase = createAdminClient();

  // 1. Fetch order để lấy customer_id + total_amount
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, customer_id, total_amount')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    console.error('[awardOrderPoints] order not found:', orderId, orderErr?.message);
    return;
  }

  if (!order.customer_id) {
    console.warn('[awardOrderPoints] order has no customer_id:', orderId);
    return;
  }

  // 2. Fetch loyalty data để biết tier
  const loyalty = await getCustomerLoyalty(order.customer_id);
  const tier = (loyalty?.tier as LoyaltyTier) ?? 'BRONZE';

  // 3. Fetch loyalty config từ site_settings (dùng admin client, không cookie-bound)
  const settings = await getLoyaltyConfigSettings();
  const loyaltyConfig = parseLoyaltyConfig(settings);

  // 4. Tính điểm
  const orderValue = Number(order.total_amount ?? 0);
  const pointsEarned = calculatePointsEarned(orderValue, tier, loyaltyConfig);

  if (pointsEarned <= 0) {
    console.log('[awardOrderPoints] pointsEarned=0, skip', orderId);
    return;
  }

  // 5. Check xem đã award chưa (idempotent — tránh double-award)
  const { data: existingTx } = await supabase
    .from('point_transactions')
    .select('id')
    .eq('order_id', orderId)
    .eq('reason', 'ORDER_DONE')
    .maybeSingle();

  if (existingTx) {
    console.log('[awardOrderPoints] already awarded, skip', orderId);
    return;
  }

  // 6. Award
  await addPointTransaction(
    order.customer_id,
    pointsEarned,
    'ORDER_DONE',
    orderId,
    orderValue
  );
  console.log('[awardOrderPoints] awarded', pointsEarned, 'points for order', orderId);
}

/**
 * Reverse points khi đơn bị hủy hoặc refund.
 *
 * Tra point_transactions để biết đã cộng bao nhiêu điểm cho đơn này,
 * trừ đúng số đó (không trừ dư — nếu user đã redeem thì chỉ trừ tối đa total_points).
 *
 * @param orderId - orders.id
 * @param reason - 'ORDER_CANCEL' | 'REFUND'
 */
export async function reverseOrderPoints(
  orderId: string,
  reason: 'ORDER_CANCEL' | 'REFUND'
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Fetch order để lấy customer_id + total_amount
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, customer_id, total_amount')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    console.error('[reverseOrderPoints] order not found:', orderId, orderErr?.message);
    return;
  }

  if (!order.customer_id) {
    console.warn('[reverseOrderPoints] order has no customer_id:', orderId);
    return;
  }

  // 2. Check xem đã reverse chưa (idempotent)
  const { data: existingReverse } = await supabase
    .from('point_transactions')
    .select('id')
    .eq('order_id', orderId)
    .in('reason', ['ORDER_CANCEL', 'REFUND'])
    .maybeSingle();

  if (existingReverse) {
    console.log('[reverseOrderPoints] already reversed, skip', orderId);
    return;
  }

  // 3. Tra điểm đã cộng (ORDER_DONE transaction)
  const { data: awardTx } = await supabase
    .from('point_transactions')
    .select('points')
    .eq('order_id', orderId)
    .eq('reason', 'ORDER_DONE')
    .maybeSingle();

  const pointsAwarded = awardTx?.points ?? 0;

  if (pointsAwarded <= 0) {
    console.log('[reverseOrderPoints] no points were awarded for this order, skip', orderId);
    return;
  }

  // 4. Reverse (trừ điểm, trừ lifetime_value)
  const orderValue = Number(order.total_amount ?? 0);
  await addPointTransaction(
    order.customer_id,
    -pointsAwarded,  // âm = trừ
    reason,
    orderId,
    orderValue
  );
  console.log('[reverseOrderPoints] reversed', pointsAwarded, 'points for order', orderId, 'reason=', reason);
}

/**
 * Get all gift rules + pool (admin only — for settings tab)
 */
export async function getAllGiftRulesAdmin(): Promise<GiftRule[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('gift_rules')
    .select('*')
    .order('trigger_value', { ascending: true });

  if (error) {
    console.error('[getAllGiftRulesAdmin] error:', error.message);
    return [];
  }

  return (data ?? []) as unknown as GiftRule[];
}

/**
 * Get all gift pool items (admin only)
 */
export async function getAllGiftPoolAdmin(): Promise<GiftPoolItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('gift_pool')
    .select(
      `id, rule_id, product_id, stock, is_active,
       products(id, title, image_url, price, quality_tier)`
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllGiftPoolAdmin] error:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    rule_id: row.rule_id,
    product_id: row.product_id,
    product_title: row.products?.title ?? '',
    product_image: row.products?.image_url ?? '',
    product_price: row.products?.price ?? 0,
    product_tier: row.products?.quality_tier ?? '',
    stock: row.stock ?? 0,
    is_active: row.is_active,
  }));
}

/**
 * Add product to gift pool (admin)
 */
export async function addGiftPoolItem(
  ruleId: string,
  productId: string,
  stock: number
): Promise<boolean> {
  const supabase = createAdminClient();

  // Mark product as gift
  await supabase
    .from('products')
    .update({ is_gift: true })
    .eq('id', productId);

  // Add to gift_pool
  const { error } = await supabase.from('gift_pool').insert({
    rule_id: ruleId,
    product_id: productId,
    stock,
    is_active: true,
  });

  if (error) {
    console.error('[addGiftPoolItem] error:', error.message);
    return false;
  }
  return true;
}

/**
 * Remove product from gift pool (admin)
 */
export async function removeGiftPoolItem(giftPoolId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('gift_pool')
    .delete()
    .eq('id', giftPoolId);

  if (error) {
    console.error('[removeGiftPoolItem] error:', error.message);
    return false;
  }
  return true;
}

/**
 * Update gift rule (admin) — edit trigger_value, gift_count, voucher_amount, is_active.
 * Chỉ cho phép với ITEM_COUNT rules (BOGO). ORDER_COUNT/BIRTHDAY không chỉnh trigger qua UI này.
 */
export async function updateGiftRule(
  ruleId: string,
  updates: {
    trigger_value?: number;
    gift_count?: number;
    voucher_amount?: number;
    is_active?: boolean;
  }
): Promise<boolean> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (updates.trigger_value !== undefined) patch.trigger_value = updates.trigger_value;
  if (updates.gift_count !== undefined) patch.gift_count = updates.gift_count;
  if (updates.voucher_amount !== undefined) patch.voucher_amount = updates.voucher_amount;
  if (updates.is_active !== undefined) patch.is_active = updates.is_active;

  if (Object.keys(patch).length === 0) return true;

  const { error } = await supabase
    .from('gift_rules')
    .update(patch)
    .eq('id', ruleId);

  if (error) {
    console.error('[updateGiftRule] error:', error.message);
    return false;
  }
  return true;
}

/**
 * Validate gift items submitted khi tạo order — bảo vệ chống fraud.
 *
 * Logic (must match /api/gamification/check để admin + client + server đồng nhất):
 *  - Tất cả gift items phải cùng 1 gift_rule_code.
 *  - Rule phải tồn tại, is_active=true, trigger_type=ITEM_COUNT.
 *  - paidItemCount >= rule.trigger_value (đủ điều kiện nhận quà).
 *  - Số gift items <= rule.gift_count.
 *  - Mỗi gift productId phải nằm trong gift_pool của rule đó (is_active=true).
 *  - Stock pool phải đủ cho mỗi gift (trừ khi stock=-1 = unlimited).
 */
export async function validateGiftItemsForOrder(
  giftItems: Array<{ productId: string; gift_rule_code?: string | null }>,
  paidItemCount: number
): Promise<{
  ok: boolean;
  error?: string;
  productId?: string;
  rule?: GiftRule;
  validGiftItems?: Array<{ productId: string; gift_rule_code: string }>;
}> {
  if (giftItems.length === 0) {
    return { ok: true, validGiftItems: [] };
  }

  // 1. Tất cả gift items phải có rule_code, và cùng 1 rule_code
  const ruleCodes = Array.from(
    new Set(
      giftItems
        .map((g) => g.gift_rule_code)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    )
  );
  if (ruleCodes.length === 0) {
    return { ok: false, error: 'GIFT_NO_RULE_CODE' };
  }
  if (ruleCodes.length > 1) {
    return { ok: false, error: 'GIFT_MULTIPLE_RULES' };
  }
  const ruleCode = ruleCodes[0];

  // 2. Fetch rule
  const supabase = createAdminClient();
  const { data: ruleRow, error: ruleErr } = await supabase
    .from('gift_rules')
    .select('*')
    .eq('rule_code', ruleCode)
    .maybeSingle();

  if (ruleErr || !ruleRow) {
    return { ok: false, error: 'GIFT_RULE_NOT_FOUND' };
  }
  const rule = ruleRow as unknown as GiftRule;

  if (!rule.is_active) {
    return { ok: false, error: 'GIFT_RULE_INACTIVE' };
  }
  if (rule.trigger_type !== 'ITEM_COUNT') {
    return { ok: false, error: 'GIFT_RULE_TYPE_UNSUPPORTED' };
  }

  // 3. Đủ điều kiện: paidItemCount >= trigger_value
  if (paidItemCount < rule.trigger_value) {
    return { ok: false, error: 'GIFT_NOT_ELIGIBLE' };
  }

  // 4. Số gift items <= gift_count
  if (giftItems.length > rule.gift_count) {
    return { ok: false, error: 'GIFT_EXCEEDS_COUNT' };
  }

  // 5. Mỗi gift productId phải thuộc gift_pool của rule (is_active=true)
  const productIds = Array.from(new Set(giftItems.map((g) => g.productId)));
  const { data: poolRows, error: poolErr } = await supabase
    .from('gift_pool')
    .select('id, product_id, stock, is_active')
    .eq('rule_id', rule.id)
    .eq('is_active', true)
    .in('product_id', productIds);

  if (poolErr) {
    return { ok: false, error: 'GIFT_POOL_QUERY_FAILED' };
  }

  const poolMap = new Map<string, { id: string; stock: number }>();
  for (const row of poolRows ?? []) {
    if (!poolMap.has(row.product_id)) {
      poolMap.set(row.product_id, { id: row.id, stock: row.stock });
    }
  }

  // 6. Check tồn tại + stock (user có thể chọn cùng product nhiều lần)
  const productCounts = new Map<string, number>();
  for (const g of giftItems) {
    productCounts.set(g.productId, (productCounts.get(g.productId) ?? 0) + 1);
  }

  for (const [pid, qty] of productCounts.entries()) {
    const pool = poolMap.get(pid);
    if (!pool) {
      return { ok: false, error: 'GIFT_PRODUCT_NOT_IN_POOL', productId: pid };
    }
    if (pool.stock !== -1 && pool.stock < qty) {
      return { ok: false, error: 'GIFT_OUT_OF_STOCK', productId: pid };
    }
  }

  return {
    ok: true,
    rule,
    validGiftItems: giftItems.map((g) => ({
      productId: g.productId,
      gift_rule_code: ruleCode,
    })),
  };
}

/**
 * Decrement gift_pool.stock cho mỗi gift item khi tạo order thành công.
 * stock = -1 (unlimited) thì bỏ qua.
 *
 * @param giftItems - mảng { productId, gift_rule_code }
 * @returns true nếu tất cả update thành công (non-fatal nếu fail — order đã tạo)
 */
export async function decrementGiftPoolStock(
  giftItems: Array<{ productId: string; gift_rule_code?: string | null }>
): Promise<boolean> {
  if (giftItems.length === 0) return true;
  const supabase = createAdminClient();

  // Đếm qty mỗi product
  const productCounts = new Map<string, number>();
  for (const g of giftItems) {
    productCounts.set(g.productId, (productCounts.get(g.productId) ?? 0) + 1);
  }

  let allOk = true;
  for (const [productId, qty] of productCounts.entries()) {
    // Lấy pool row hiện tại (stock != -1 mới cần decrement)
    const { data: poolRow, error: poolErr } = await supabase
      .from('gift_pool')
      .select('id, stock')
      .eq('product_id', productId)
      .neq('stock', -1)
      .maybeSingle();

    if (poolErr || !poolRow) {
      // stock=-1 (unlimited) hoặc không tìm thấy — bỏ qua
      continue;
    }

    const newStock = Math.max(0, (poolRow.stock ?? 0) - qty);
    const { error: updErr } = await supabase
      .from('gift_pool')
      .update({ stock: newStock })
      .eq('id', poolRow.id);

    if (updErr) {
      console.error('[decrementGiftPoolStock] update failed:', productId, updErr.message);
      allOk = false;
    }
  }
  return allOk;
}

/**
 * Restore gift_pool.stock khi đơn bị huỷ (admin cancel hoặc cleanup bank order).
 * Đọc order_items.is_gift=true của order, cộng lại stock cho pool product.
 * stock=-1 (unlimited) thì bỏ qua.
 */
export async function restoreGiftPoolStockOnCancel(orderId: string): Promise<boolean> {
  const supabase = createAdminClient();

  // Lấy gift items của order
  const { data: giftItems, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_id')
    .eq('order_id', orderId)
    .eq('is_gift', true);

  if (itemsErr) {
    console.error('[restoreGiftPoolStockOnCancel] query gift items failed:', itemsErr.message);
    return false;
  }
  if (!giftItems || giftItems.length === 0) return true;

  // Đếm qty mỗi product
  const productCounts = new Map<string, number>();
  for (const it of giftItems) {
    productCounts.set(it.product_id, (productCounts.get(it.product_id) ?? 0) + 1);
  }

  let allOk = true;
  for (const [productId, qty] of productCounts.entries()) {
    const { data: poolRow, error: poolErr } = await supabase
      .from('gift_pool')
      .select('id, stock')
      .eq('product_id', productId)
      .neq('stock', -1)
      .maybeSingle();

    if (poolErr || !poolRow) {
      continue;
    }

    const newStock = (poolRow.stock ?? 0) + qty;
    const { error: updErr } = await supabase
      .from('gift_pool')
      .update({ stock: newStock })
      .eq('id', poolRow.id);

    if (updErr) {
      console.error('[restoreGiftPoolStockOnCancel] update failed:', productId, updErr.message);
      allOk = false;
    }
  }
  return allOk;
}