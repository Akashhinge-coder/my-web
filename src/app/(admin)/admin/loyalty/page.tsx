"use client";

import { useEffect, useState } from "react";
import {
  loyaltyApi,
  type LoyaltyAccount,
  type LoyaltyDashboard,
} from "@/frontend/api/loyalty.api";
import { formatINR, formatDate } from "@/lib/utils";
import { Gift, Search, Star, TrendingUp, Users, Phone, Loader2 } from "lucide-react";

export default function LoyaltyPage() {
  const [dashboard, setDashboard] = useState<LoyaltyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await loyaltyApi.dashboard();
        if (active) setDashboard(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load loyalty program");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const accounts = dashboard?.accounts ?? [];
  const settings = dashboard?.settings ?? {
    pointsPerHundred: 10,
    minimumPointsToRedeem: 100,
    redemptionRate: 0.1,
    maxRedemptionPercent: 20,
  };
  const summary = dashboard?.summary ?? {
    totalMembers: 0,
    activeMembers: 0,
    totalPoints: 0,
    totalSpent: 0,
  };

  const filtered = accounts.filter((account: LoyaltyAccount) =>
    !search ||
    account.phone.includes(search) ||
    (account.name && account.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-brand" />Loyalty Program
        </h1>
        <p className="page-subtitle">Phone-based rewards - no login needed for customers</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card-dark p-5 border-brand/20">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-white text-sm mb-1">How loyalty works</p>
            <p className="text-xs text-ink-3 leading-relaxed">
              Customers earn <strong className="text-brand">{settings.pointsPerHundred} points per Rs.100</strong> spent.
              Points are tracked by phone number. Minimum <strong className="text-brand">{settings.minimumPointsToRedeem} points</strong> to redeem.
              Redemption is capped at <strong className="text-brand">{settings.maxRedemptionPercent}%</strong> of the order amount.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total members", value: summary.totalMembers.toString(), icon: Users, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
          { label: "Active (30d)", value: summary.activeMembers.toString(), icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10 border-green-400/20" },
          { label: "Total points", value: summary.totalPoints.toLocaleString(), icon: Star, color: "text-brand", bg: "bg-brand/10 border-brand/20" },
          { label: "Total spent", value: formatINR(summary.totalSpent), icon: Gift, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <p className="stat-label">{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card-dark p-5">
        <h3 className="font-semibold text-white mb-4">Program Settings</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label text-ink-3">Points earned per Rs.100</label>
            <input className="input-dark" type="number" value={settings.pointsPerHundred} disabled />
          </div>
          <div>
            <label className="label text-ink-3">Min points to redeem</label>
            <input className="input-dark" type="number" value={settings.minimumPointsToRedeem} disabled />
          </div>
          <div>
            <label className="label text-ink-3">Max redemption %</label>
            <input className="input-dark" type="number" value={settings.maxRedemptionPercent} disabled />
          </div>
        </div>
      </div>

      <div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
          <input
            className="input-dark pl-9"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => <div key={item} className="card-dark p-4 shimmer h-16" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 mx-auto mb-4 text-ink-4 opacity-30" />
            <p className="text-ink-3 font-medium">No loyalty members yet</p>
            <p className="text-xs text-ink-4 mt-1">Members are added automatically when customers pay</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((account, index) => (
              <div key={account.id} className="card-dark p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white text-sm">{account.name || "Guest"}</p>
                    {index < 3 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand">Top {index + 1}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-4">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{account.phone}</span>
                    <span>{account.visitCount} visits</span>
                    <span>Spent {formatINR(account.totalSpent)}</span>
                    {account.lastVisited && <span>Last: {formatDate(account.lastVisited)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display font-bold text-brand text-lg">{account.totalPoints.toLocaleString()}</p>
                  <p className="text-[10px] text-ink-4">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
