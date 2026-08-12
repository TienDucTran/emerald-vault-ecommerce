/**
 * Gamification rules engine — Buy X Get Y + Loyalty points
 * Pure functions, no DB calls (DB queries ở queries.ts)
 */

import type {
  GiftRule,
  GiftRuleCode,
  LoyaltyTier,
  LoyaltyConfig,
  GamificationCheck,
} from './types';

/** Default loyalty config (match seed trong migration 0036) */
export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  points_rate_bronze: 5,
  points_rate_silver: 7,
  points_rate_gold: 10,
  points_rate_platinum: 15,
  min_redemption_points: 50,
  max_redemption_percent: 20,
};

/** Parse loyalty config từ site_settings map */
export function parseLoyaltyConfig(settings: Record<string, string>): LoyaltyConfig {
  return {
    points_rate_bronze: parseInt(settings['loyalty_points_rate_bronze'] ?? '5', 10),
    points_rate_silver: parseInt(settings['loyalty_points_rate_silver'] ?? '7', 10),
    points_rate_gold: parseInt(settings['loyalty_points_rate_gold'] ?? '10', 10),
    points_rate_platinum: parseInt(settings['loyalty_points_rate_platinum'] ?? '15', 10),
    min_redemption_points: parseInt(settings['loyalty_min_redemption_points'] ?? '50', 10),
    max_redemption_percent: parseInt(settings['loyalty_max_redemption_percent'] ?? '20', 10),
  };
}

/** Tier labels (Vietnamese) */
export const TIER_LABELS: Record<LoyaltyTier, string> = {
  BRONZE: '🥉 New Collector',
  SILVER: '🥈 Silver Curator',
  GOLD: '🥇 Gold Connoisseur',
  PLATINUM: '💎 Vault Insider',
};

/** Tier thresholds (dựa trên orders_count) */
export const TIER_THRESHOLDS: Record<LoyaltyTier, { min: number; max: number }> = {
  BRONZE: { min: 0, max: 4 },
  SILVER: { min: 5, max: 9 },
  GOLD: { min: 10, max: 19 },
  PLATINUM: { min: 20, max: Infinity },
};

/** Get tier từ orders_count */
export function getTierFromOrderCount(ordersCount: number): LoyaltyTier {
  if (ordersCount >= 20) return 'PLATINUM';
  if (ordersCount >= 10) return 'GOLD';
  if (ordersCount >= 5) return 'SILVER';
  return 'BRONZE';
}

/** Get points rate (%) theo tier */
export function getPointsRate(tier: LoyaltyTier, config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG): number {
  switch (tier) {
    case 'BRONZE':
      return config.points_rate_bronze;
    case 'SILVER':
      return config.points_rate_silver;
    case 'GOLD':
      return config.points_rate_gold;
    case 'PLATINUM':
      return config.points_rate_platinum;
  }
}

/** Tính điểm nhận từ đơn (1 point = 1000 VND) */
export function calculatePointsEarned(
  orderValue: number,
  tier: LoyaltyTier,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG
): number {
  const rate = getPointsRate(tier, config);
  // points = orderValue * rate% / 1000 (1 point = 1000 VND)
  return Math.floor((orderValue * rate) / 100000);
}

/**
 * Evaluate BOGO (Buy X Get Y) rules cho cart hiện tại
 * Chỉ count items có tier SS hoặc S (SSS excluded)
 *
 * @param rules - danh sách gift rules (ITEM_COUNT type)
 * @param eligibleItemCount - số item SS/S trong cart
 * @returns progress + best achieved + next goal
 */
export function evaluateBogoRules(
  rules: GiftRule[],
  eligibleItemCount: number
): GamificationCheck['bogo'] {
  // Filter chỉ ITEM_COUNT rules, active, sort by trigger_value asc
  const bogoRules = rules
    .filter((r) => r.trigger_type === 'ITEM_COUNT' && r.is_active)
    .sort((a, b) => a.trigger_value - b.trigger_value);

  const ruleProgress = bogoRules.map((rule) => ({
    rule_code: rule.rule_code,
    trigger_value: rule.trigger_value,
    gift_count: rule.gift_count,
    eligible_count: eligibleItemCount,
    remaining: Math.max(0, rule.trigger_value - eligibleItemCount),
    is_eligible: eligibleItemCount >= rule.trigger_value,
    voucher_amount: rule.voucher_amount,
  }));

  // Best achieved = rule có trigger_value cao nhất mà user đã đạt
  const achieved = ruleProgress.filter((r) => r.is_eligible);
  const bestAchieved = achieved.length > 0
    ? {
        rule_code: achieved[achieved.length - 1].rule_code,
        gift_count: achieved[achieved.length - 1].gift_count,
        voucher_amount: achieved[achieved.length - 1].voucher_amount,
      }
    : null;

  // Next goal = rule đầu tiên chưa đạt
  const notAchieved = ruleProgress.filter((r) => !r.is_eligible);
  const nextGoal = notAchieved.length > 0
    ? {
        rule_code: notAchieved[0].rule_code,
        trigger_value: notAchieved[0].trigger_value,
        remaining: notAchieved[0].remaining,
      }
    : null;

  return {
    rules: ruleProgress,
    best_achieved: bestAchieved,
    next_goal: nextGoal,
  };
}

/** Check nếu sản phẩm tier eligible cho gift (SS or S only) */
export function isTierEligibleForGift(tier: string, tierFilter: string[] = ['SS', 'S']): boolean {
  return tierFilter.includes(tier);
}

/** BOGO rule labels (Vietnamese) cho UI */
export const BOGO_RULE_LABELS: Record<string, string> = {
  BUY4GET1: 'Mua 4 tặng 1',
  BUY6GET2: 'Mua 6 tặng 2 + Voucher 50k',
  BUY10GET3: 'Mua 10 tặng 3 + Voucher 100k',
  FIRST_ORDER_VOUCHER: 'Đơn đầu tiên — Voucher 30k',
  MILESTONE_5: 'Đơn thứ 5 — Quà bí ẩn',
  MILESTONE_10: 'Đơn thứ 10 — Voucher 100k + Badge',
  BIRTHDAY_GIFT: 'Quà sinh nhật',
};