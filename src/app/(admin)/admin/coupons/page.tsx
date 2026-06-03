"use client";

import { useEffect, useState, useCallback } from "react";
import { couponsApi, type Coupon } from "@/frontend/api/coupons.api";
import { formatINR, cn } from "@/lib/utils";
import { Plus, Tag, Trash2, Check, X, Loader2, Copy, ToggleLeft, ToggleRight } from "lucide-react";

type CouponForm = {
  code: string;
  type: "flat" | "percent";
  value: string;
  minOrder: string;
  maxDiscount: string;
  maxUses: string;
  expiresAt: string;
};

const EMPTY: CouponForm = {
  code: "",
  type: "percent",
  value: "",
  minOrder: "0",
  maxDiscount: "",
  maxUses: "",
  expiresAt: "",
};

function toDateTime(value: string): string | null {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setCoupons(await couponsApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  async function saveCoupon() {
    if (!form.code || !form.value) return;
    setSaving(true);
    setError("");

    try {
      await couponsApi.create({
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: parseFloat(form.value),
        minOrder: parseFloat(form.minOrder) || 0,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        expiresAt: toDateTime(form.expiresAt),
      });
      setShowAdd(false);
      setForm({ ...EMPTY });
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create coupon");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(id: string, active: boolean) {
    setError("");
    try {
      await couponsApi.update(id, { isActive: !active });
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update coupon");
    }
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Delete this coupon?")) return;
    setError("");
    try {
      await couponsApi.delete(id);
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete coupon");
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
    setForm((previous) => ({ ...previous, code }));
  }

  const activeCoupons = coupons.filter((coupon) => coupon.isActive);
  const inactiveCoupons = coupons.filter((coupon) => !coupon.isActive);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-white">Coupons</h1>
          <p className="page-subtitle">{activeCoupons.length} active · {inactiveCoupons.length} inactive</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-md btn-primary mt-1">
          <Plus className="w-4 h-4" />New Coupon
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {showAdd && (
        <div className="card-dark p-6 border-brand/30">
          <h3 className="font-semibold text-white mb-5">Create Coupon</h3>

          <div className="mb-4">
            <label className="label text-ink-3">Coupon code</label>
            <div className="flex gap-2">
              <input
                className="input-dark font-mono uppercase flex-1"
                placeholder="SAVE20"
                value={form.code}
                onChange={(e) => setForm((previous) => ({ ...previous, code: e.target.value.toUpperCase() }))}
              />
              <button onClick={generateCode} className="btn-md btn-dark whitespace-nowrap">
                Generate
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label text-ink-3">Discount type</label>
              <div className="flex gap-2">
                {[
                  { value: "percent", label: "% Off" },
                  { value: "flat", label: "Rs. Off" },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setForm((previous) => ({ ...previous, type: type.value as "flat" | "percent" }))}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      form.type === type.value
                        ? "bg-brand/10 border-brand/30 text-brand"
                        : "border-dark-border text-ink-4"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label text-ink-3">
                {form.type === "percent" ? "Discount %" : "Discount Rs."}
              </label>
              <input
                className="input-dark"
                type="number"
                placeholder={form.type === "percent" ? "20" : "100"}
                value={form.value}
                onChange={(e) => setForm((previous) => ({ ...previous, value: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className="label text-ink-3">Min order</label>
              <input
                className="input-dark"
                type="number"
                placeholder="0"
                value={form.minOrder}
                onChange={(e) => setForm((previous) => ({ ...previous, minOrder: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-ink-3">Max discount</label>
              <input
                className="input-dark"
                type="number"
                placeholder="No cap"
                value={form.maxDiscount}
                onChange={(e) => setForm((previous) => ({ ...previous, maxDiscount: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-ink-3">Max uses</label>
              <input
                className="input-dark"
                type="number"
                placeholder="Unlimited"
                value={form.maxUses}
                onChange={(e) => setForm((previous) => ({ ...previous, maxUses: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-ink-3">Expires on</label>
              <input
                className="input-dark"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((previous) => ({ ...previous, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="btn-md btn-dark flex-1">
              <X className="w-4 h-4" />Cancel
            </button>
            <button onClick={saveCoupon} disabled={saving || !form.code || !form.value} className="btn-md btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create Coupon
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => <div key={item} className="card-dark p-5 shimmer h-20" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16">
          <Tag className="w-12 h-12 mx-auto mb-4 text-ink-4 opacity-30" />
          <p className="text-ink-3 font-medium">No coupons yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-md btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />Create first coupon
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const usagePercent = coupon.maxUses ? (coupon.usedCount / coupon.maxUses) * 100 : 0;
            const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();

            return (
              <div key={coupon.id} className={cn("card-dark p-4 transition-all", !coupon.isActive && "opacity-50")}>
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-white text-base">{coupon.code}</span>
                      <button
                        onClick={() => copyCode(coupon.code)}
                        className="p-1 rounded-md text-ink-4 hover:text-brand transition-colors"
                      >
                        {copied === coupon.code
                          ? <Check className="w-3 h-3 text-green-400" />
                          : <Copy className="w-3 h-3" />}
                      </button>
                      {isExpired && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-4 flex-wrap">
                      <span className="text-brand font-semibold">
                        {coupon.type === "percent" ? `${coupon.value}% off` : `${formatINR(coupon.value)} off`}
                      </span>
                      {coupon.minOrder > 0 && <span>Min {formatINR(coupon.minOrder)}</span>}
                      {coupon.maxDiscount !== null && <span>Cap {formatINR(coupon.maxDiscount)}</span>}
                      <span>{coupon.usedCount} used{coupon.maxUses ? ` / ${coupon.maxUses}` : ""}</span>
                      {coupon.expiresAt && (
                        <span>Expires {new Date(coupon.expiresAt).toLocaleDateString("en-IN")}</span>
                      )}
                    </div>
                    {coupon.maxUses && (
                      <div className="mt-2 h-1 bg-dark-tertiary rounded-full overflow-hidden w-32">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCoupon(coupon.id, coupon.isActive)}
                      className={cn("transition-colors", coupon.isActive ? "text-green-400" : "text-ink-4")}
                    >
                      {coupon.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => deleteCoupon(coupon.id)}
                      className="p-2 rounded-xl text-ink-4 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
