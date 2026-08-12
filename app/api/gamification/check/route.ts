/**
 * POST /api/gamification/check
 *
 * Check gamification status cho cart hiện tại:
 * - BOGO (Buy X Get Y) progress — threshold tính ALL items (SSS+SS+S)
 * - Freeship theo khu vực
 * - Loyalty points sẽ nhận — chỉ tính paid items (không tính gift)
 *
 * Body:
 *   {
 *     items: [{ productId, price, quality_tier, is_gift? }],
 *     address: { province, district }
 *   }
 *
 * Response 200: { ok: true, data: GamificationCheck }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOptionalCustomer } from '@/lib/auth/require-customer';
import { getSiteSettings } from '@/lib/supabase/queries/site-content';
import { getActiveGiftRules, getCustomerLoyalty } from '@/lib/gamification/queries';
import {
  detectShippingZone,
  checkFreeship,
  getZoneLabel,
  parseFreeshipConfig,
  parseInnerDistricts,
} from '@/lib/gamification/freeship';
import {
  evaluateBogoRules,
  parseLoyaltyConfig,
  getPointsRate,
  calculatePointsEarned,
  TIER_LABELS,
} from '@/lib/gamification/rules';
import type { GamificationCheck, LoyaltyTier } from '@/lib/gamification/types';

const ItemSchema = z.object({
  productId: z.string().uuid(),
  price: z.number().int().positive(),
  quality_tier: z.enum(['SSS', 'SS', 'S']),
  is_gift: z.boolean().optional().default(false),
});

const AddressSchema = z.object({
  province: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
});

const Body = z.object({
  items: z.array(ItemSchema).min(0).max(50),
  address: AddressSchema.optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { items, address } = parsed.data;

  // Get site settings
  let settings: Record<string, string> = {};
  try {
    settings = await getSiteSettings();
  } catch (settingsErr) {
    console.error('[gamification/check] getSiteSettings failed:', settingsErr);
  }

  const freeshipConfig = parseFreeshipConfig(settings);
  const loyaltyConfig = parseLoyaltyConfig(settings);
  const innerDistricts = parseInnerDistricts(settings);

  // Get gift rules
  const rules = await getActiveGiftRules();

  // ─── KEY LOGIC ───
  // 1. BOGO threshold: TÍNH TẤT CẢ items (SSS + SS + S đều count)
  //    Gift received chỉ từ pool SS/S (admin quản lý qua gift_pool)
  // 2. Gift products (is_gift=true) KHÔNG tính vào:
  //    - totalValue (không cộng giá trị)
  //    - loyalty points (không cộng điểm)
  //    - freeship count/value (không tính vào threshold)
  // 3. Chỉ paid items (is_gift=false) tính cho value + points

  const totalItemCount = items.length; // ALL items cho BOGO threshold
  const paidItems = items.filter((i) => !i.is_gift); // Chỉ paid items
  const totalValue = paidItems.reduce((sum, i) => sum + i.price, 0); // Chỉ paid value
  const paidItemCount = paidItems.length; // Chỉ paid count cho freeship

  // Evaluate BOGO — threshold tính ALL items
  const bogo = evaluateBogoRules(rules, totalItemCount);

  // Detect shipping zone + check freeship (chỉ paid items)
  const zone = detectShippingZone(
    address?.province ?? null,
    address?.district ?? null,
    innerDistricts
  );
  const freeshipCheck = checkFreeship(zone, paidItemCount, totalValue, freeshipConfig);

  // Get loyalty (optional — chỉ khi user login)
  // Points chỉ tính trên paid items value
  const customer = await getOptionalCustomer();
  let loyalty: GamificationCheck['loyalty'] = null;

  if (customer) {
    const loyaltyData = await getCustomerLoyalty(customer.user.id);
    const tier = (loyaltyData?.tier as LoyaltyTier) ?? 'BRONZE';
    const pointsRate = getPointsRate(tier, loyaltyConfig);
    const pointsEarned = calculatePointsEarned(totalValue, tier, loyaltyConfig);

    loyalty = {
      tier,
      tier_label: TIER_LABELS[tier],
      total_points: loyaltyData?.total_points ?? 0,
      points_earned: pointsEarned,
      points_rate: pointsRate,
    };
  }

  const result: GamificationCheck = {
    bogo,
    freeship: {
      zone,
      zone_label: getZoneLabel(zone),
      item_count_required: freeshipCheck.item_count_required,
      value_required: freeshipCheck.value_required,
      current_item_count: paidItemCount,
      current_value: totalValue,
      is_free: freeshipCheck.is_free,
      ship_fee: freeshipCheck.ship_fee,
      remaining_items: freeshipCheck.remaining_items,
      remaining_value: freeshipCheck.remaining_value,
    },
    loyalty,
  };

  return NextResponse.json({ ok: true, data: result });
}