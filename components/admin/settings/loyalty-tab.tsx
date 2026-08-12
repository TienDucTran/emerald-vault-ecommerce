'use client';

/**
 * LoyaltyTab — Admin Settings tab for Loyalty & Rewards
 * - Gift Pool management (add/remove products to gift pool)
 * - Freeship settings (3 zones)
 * - Loyalty points rate config
 */

import { useEffect, useState } from 'react';
import { Gift, Truck, Trophy, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { formatVND } from '@/lib/utils';

interface GiftRule {
  id: string;
  rule_code: string;
  trigger_type: string;
  trigger_value: number;
  gift_count: number;
  voucher_amount: number;
  is_active: boolean;
}

interface GiftPoolItem {
  id: string;
  rule_id: string;
  product_id: string;
  product_title: string;
  product_image: string;
  product_price: number;
  product_tier: string;
  stock: number;
}

interface Product {
  id: string;
  title: string;
  price: number;
  quality_tier: string;
}

const BOGO_RULE_LABELS: Record<string, string> = {
  BUY4GET1: 'Mua 4 tặng 1',
  BUY6GET2: 'Mua 6 tặng 2 + Voucher 50k',
  BUY10GET3: 'Mua 10 tặng 3 + Voucher 100k',
  FIRST_ORDER_VOUCHER: 'Đơn đầu tiên — Voucher 30k',
  MILESTONE_5: 'Đơn thứ 5 — Quà bí ẩn',
  MILESTONE_10: 'Đơn thứ 10 — Voucher 100k + Badge',
  BIRTHDAY_GIFT: 'Quà sinh nhật',
};

export function LoyaltyTab() {
  const [rules, setRules] = useState<GiftRule[]>([]);
  const [pool, setPool] = useState<GiftPoolItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [stockInput, setStockInput] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load gift rules
      const rulesRes = await fetch('/api/admin/gamification/rules');
      const rulesJson = await rulesRes.json();
      if (rulesJson.ok) {
        setRules(rulesJson.data);
        if (rulesJson.data.length > 0) {
          setSelectedRuleId(rulesJson.data[0].id);
        }
      }

      // Load gift pool
      const poolRes = await fetch('/api/admin/gamification/pool');
      const poolJson = await poolRes.json();
      if (poolJson.ok) {
        setPool(poolJson.data);
      }

      // Load products (SS, S only for gift pool)
      const productsRes = await fetch('/api/admin/gamification/products');
      const productsJson = await productsRes.json();
      if (productsJson.ok) {
        setProducts(productsJson.data);
      }
    } catch (err) {
      console.error('[LoyaltyTab] load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function addToPool() {
    if (!selectedRuleId || !selectedProductId) {
      setMessage('Vui lòng chọn rule và sản phẩm');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/gamification/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId: selectedRuleId,
          productId: selectedProductId,
          stock: stockInput,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage('✅ Đã thêm sản phẩm vào gift pool');
        loadData();
      } else {
        setMessage(`❌ ${json.error || 'Lỗi'}`);
      }
    } catch {
      setMessage('❌ Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  }

  async function removeFromPool(poolId: string) {
    if (!confirm('Xóa sản phẩm này khỏi gift pool?')) return;
    try {
      const res = await fetch('/api/admin/gamification/pool', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage('✅ Đã xóa');
        loadData();
      }
    } catch {
      setMessage('❌ Lỗi kết nối');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Gift Pool Management */}
      <section className="rounded-lg border border-[#4D4635]/30 bg-[#1A1813]/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Gift className="h-5 w-5 text-gold" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-gold">
            Gift Pool — Quản lý sản phẩm tặng
          </h3>
        </div>
        <p className="mb-4 text-xs text-[#D0C5AF]/60">
          Thêm sản phẩm (Tier SS/S) vào pool quà tặng. Sản phẩm sẽ bị ẩn khỏi storefront
          và chỉ dùng làm quà tặng theo rule tương ứng.
        </p>

        {/* Add to pool form */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#D0C5AF]/50">
              Rule
            </label>
            <select
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-3 py-2 text-sm text-[#EAE1D4]"
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {BOGO_RULE_LABELS[r.rule_code] ?? r.rule_code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#D0C5AF]/50">
              Sản phẩm (SS/S)
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-3 py-2 text-sm text-[#EAE1D4]"
            >
              <option value="">— Chọn —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.quality_tier}) — {formatVND(p.price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#D0C5AF]/50">
              Stock
            </label>
            <input
              type="number"
              value={stockInput}
              onChange={(e) => setStockInput(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-3 py-2 text-sm text-[#EAE1D4]"
              min={-1}
              placeholder="-1 = unlimited"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addToPool}
              disabled={saving || !selectedRuleId || !selectedProductId}
              className="flex w-full items-center justify-center gap-1 rounded bg-gold/20 px-4 py-2 text-xs font-heading uppercase tracking-wider text-gold transition-colors hover:bg-gold/30 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Thêm
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded border border-gold/20 bg-gold/5 p-2 text-xs text-[#D0C5AF]/80">
            {message}
          </div>
        )}

        {/* Pool list */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#4D4635]/30 text-left text-[10px] uppercase tracking-wider text-[#D0C5AF]/50">
                <th className="pb-2 pr-4">Sản phẩm</th>
                <th className="pb-2 pr-4">Tier</th>
                <th className="pb-2 pr-4">Rule</th>
                <th className="pb-2 pr-4">Stock</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {pool.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-[#D0C5AF]/40">
                    Chưa có sản phẩm nào trong gift pool
                  </td>
                </tr>
              ) : (
                pool.map((item) => {
                  const rule = rules.find((r) => r.id === item.rule_id);
                  return (
                    <tr key={item.id} className="border-b border-[#4D4635]/20">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.product_image}
                            alt={item.product_title}
                            className="h-8 w-8 rounded object-cover"
                          />
                          <span className="text-[#EAE1D4]">{item.product_title}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-[#D0C5AF]/70">{item.product_tier}</td>
                      <td className="py-2 pr-4 text-[#D0C5AF]/70">
                        {rule ? (BOGO_RULE_LABELS[rule.rule_code] ?? rule.rule_code) : '—'}
                      </td>
                      <td className="py-2 pr-4 text-[#D0C5AF]/70">
                        {item.stock === -1 ? '∞' : item.stock}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => removeFromPool(item.id)}
                          className="text-red-400/70 transition-colors hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Freeship Settings */}
      <section className="rounded-lg border border-[#4D4635]/30 bg-[#1A1813]/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-gold" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-gold">
            Freeship — 3 khu vực
          </h3>
        </div>
        <FreeshipSettings />
      </section>

      {/* Loyalty Points Settings */}
      <section className="rounded-lg border border-[#4D4635]/30 bg-[#1A1813]/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-gold">
            Loyalty — Tỷ lệ điểm
          </h3>
        </div>
        <LoyaltySettings />
      </section>
    </div>
  );
}

function FreeshipSettings() {
  const [config, setConfig] = useState({
    freeship_inner_hcm_count: '4',
    freeship_inner_hcm_value: '350000',
    freeship_outer_hcm_count: '6',
    freeship_outer_hcm_value: '500000',
    freeship_province_count: '8',
    freeship_province_value: '700000',
    ship_fee_inner_hcm: '30000',
    ship_fee_outer_hcm: '40000',
    ship_fee_province: '50000',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (json.ok && json.data) {
        const map = json.data as Record<string, string>
        setConfig((prev) => ({
          ...prev,
          freeship_inner_hcm_count: map.freeship_inner_hcm_count ?? prev.freeship_inner_hcm_count,
          freeship_inner_hcm_value: map.freeship_inner_hcm_value ?? prev.freeship_inner_hcm_value,
          freeship_outer_hcm_count: map.freeship_outer_hcm_count ?? prev.freeship_outer_hcm_count,
          freeship_outer_hcm_value: map.freeship_outer_hcm_value ?? prev.freeship_outer_hcm_value,
          freeship_province_count: map.freeship_province_count ?? prev.freeship_province_count,
          freeship_province_value: map.freeship_province_value ?? prev.freeship_province_value,
          ship_fee_inner_hcm: map.ship_fee_inner_hcm ?? prev.ship_fee_inner_hcm,
          ship_fee_outer_hcm: map.ship_fee_outer_hcm ?? prev.ship_fee_outer_hcm,
          ship_fee_province: map.ship_fee_province ?? prev.ship_fee_province,
        }));
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function saveConfig() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: Object.fromEntries(Object.entries(config)) }),
      });
      const json = await res.json();
      if (json.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const zones = [
    { label: 'Nội thành HCMC', prefix: 'inner_hcm' },
    { label: 'Ngoại thành HCMC', prefix: 'outer_hcm' },
    { label: 'Tỉnh khác', prefix: 'province' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {zones.map((zone) => {
          const countKey = `freeship_${zone.prefix}_count`;
          const valueKey = `freeship_${zone.prefix}_value`;
          const feeKey = `ship_fee_${zone.prefix}`;
          return (
            <div key={zone.prefix} className="rounded border border-[#4D4635]/30 bg-[#0F0E0B]/50 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gold">
                {zone.label}
              </p>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-[#D0C5AF]/50">Số món để freeship</label>
                  <input
                    type="number"
                    value={config[countKey as keyof typeof config]}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, [countKey]: e.target.value }))
                    }
                    className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-2 py-1 text-xs text-[#EAE1D4]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#D0C5AF]/50">Hoặc giá trị (VND)</label>
                  <input
                    type="number"
                    value={config[valueKey as keyof typeof config]}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, [valueKey]: e.target.value }))
                    }
                    className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-2 py-1 text-xs text-[#EAE1D4]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#D0C5AF]/50">Phí ship (VND)</label>
                  <input
                    type="number"
                    value={config[feeKey as keyof typeof config]}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, [feeKey]: e.target.value }))
                    }
                    className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-2 py-1 text-xs text-[#EAE1D4]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={saveConfig}
        disabled={saving}
        className="flex items-center gap-1 rounded bg-gold/20 px-4 py-2 text-xs font-heading uppercase tracking-wider text-gold transition-colors hover:bg-gold/30 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        {saved ? 'Đã lưu!' : 'Lưu'}
      </button>
    </div>
  );
}

function LoyaltySettings() {
  const [config, setConfig] = useState({
    loyalty_points_rate_bronze: '5',
    loyalty_points_rate_silver: '7',
    loyalty_points_rate_gold: '10',
    loyalty_points_rate_platinum: '15',
    loyalty_min_redemption_points: '50',
    loyalty_max_redemption_percent: '20',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (json.ok && json.data) {
        const map = json.data as Record<string, string>
        setConfig((prev) => ({
          ...prev,
          loyalty_points_rate_bronze: map.loyalty_points_rate_bronze ?? prev.loyalty_points_rate_bronze,
          loyalty_points_rate_silver: map.loyalty_points_rate_silver ?? prev.loyalty_points_rate_silver,
          loyalty_points_rate_gold: map.loyalty_points_rate_gold ?? prev.loyalty_points_rate_gold,
          loyalty_points_rate_platinum: map.loyalty_points_rate_platinum ?? prev.loyalty_points_rate_platinum,
          loyalty_min_redemption_points: map.loyalty_min_redemption_points ?? prev.loyalty_min_redemption_points,
          loyalty_max_redemption_percent: map.loyalty_max_redemption_percent ?? prev.loyalty_max_redemption_percent,
        }));
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function saveConfig() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: Object.fromEntries(Object.entries(config)) }),
      });
      const json = await res.json();
      if (json.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const tiers = [
    { key: 'loyalty_points_rate_bronze', label: '🥉 Bronze (%)' },
    { key: 'loyalty_points_rate_silver', label: '🥈 Silver (%)' },
    { key: 'loyalty_points_rate_gold', label: '🥇 Gold (%)' },
    { key: 'loyalty_points_rate_platinum', label: '💎 Platinum (%)' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiers.map((tier) => (
          <div key={tier.key}>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#D0C5AF]/50">
              {tier.label}
            </label>
            <input
              type="number"
              value={config[tier.key]}
              onChange={(e) => setConfig((prev) => ({ ...prev, [tier.key]: e.target.value }))}
              className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-2 py-1.5 text-sm text-[#EAE1D4]"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#D0C5AF]/50">
            Điểm tối thiểu để dùng
          </label>
          <input
            type="number"
            value={config.loyalty_min_redemption_points}
            onChange={(e) => setConfig((prev) => ({ ...prev, loyalty_min_redemption_points: e.target.value }))}
            className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-2 py-1.5 text-sm text-[#EAE1D4]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#D0C5AF]/50">
            Giảm tối đa (% đơn)
          </label>
          <input
            type="number"
            value={config.loyalty_max_redemption_percent}
            onChange={(e) => setConfig((prev) => ({ ...prev, loyalty_max_redemption_percent: e.target.value }))}
            className="w-full rounded border border-[#4D4635]/50 bg-[#0F0E0B] px-2 py-1.5 text-sm text-[#EAE1D4]"
          />
        </div>
      </div>
      <p className="text-[10px] text-[#D0C5AF]/40">
        1 điểm = 1.000 VNĐ. Tỷ lệ (%) áp dụng cho giá trị đơn → quy đổi điểm.
        Vd: đơn 100k, Bronze 5% → nhận 5 điểm (= 5.000đ giảm cho đơn sau).
      </p>
      <button
        onClick={saveConfig}
        disabled={saving}
        className="flex items-center gap-1 rounded bg-gold/20 px-4 py-2 text-xs font-heading uppercase tracking-wider text-gold transition-colors hover:bg-gold/30 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        {saved ? 'Đã lưu!' : 'Lưu'}
      </button>
    </div>
  );
}
