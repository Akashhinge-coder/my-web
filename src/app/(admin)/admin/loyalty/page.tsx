"use client";
export const dynamic = 'force-dynamic';

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
          <Gift className="w-6 h-6 text-accent-cyan" />Loyalty Program
        </h1>
        <p className="page-subtitle text-slate-400">Phone-based rewards - no login needed for customers</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card-admin p-5 border-accent-cyan/20">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-white text-sm mb-1">How loyalty works</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Customers earn <strong className="text-accent-cyan">{settings.pointsPerHundred} points per Rs.100</strong> spent.
              Points are tracked by phone number. Minimum <strong className="text-accent-cyan">{settings.minimumPointsToRedeem} points</strong> to redeem.
              Redemption is capped at <strong className="text-accent-cyan">{settings.maxRedemptionPercent}%</strong> of the order amount.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total members", value: summary.totalMembers.toString(), icon: Users, color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10 border-[#a78bfa]/20" },
          { label: "Active (30d)", value: summary.activeMembers.toString(), icon: TrendingUp, color: "text-[#34d399]", bg: "bg-[#34d399]/10 border-[#34d399]/20" },
          { label: "Total points", value: summary.totalPoints.toLocaleString(), icon: Star, color: "text-[var(--accent-cyan)]", bg: "bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/20" },
          { label: "Total spent", value: formatINR(summary.totalSpent), icon: Gift, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card-admin">
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

      <div className="card-admin p-5">
        <h3 className="font-semibold text-white mb-4">Program Settings</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label text-slate-400">Points earned per Rs.100</label>
            <input className="input-admin" type="number" value={settings.pointsPerHundred} disabled />
          </div>
          <div>
            <label className="label text-slate-400">Min points to redeem</label>
            <input className="input-admin" type="number" value={settings.minimumPointsToRedeem} disabled />
          </div>
          <div>
            <label className="label text-slate-400">Max redemption %</label>
            <input className="input-admin" type="number" value={settings.maxRedemptionPercent} disabled />
          </div>
        </div>
      </div>

      <div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input-admin pl-9"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => <div key={item} className="card-admin p-4 animate-pulse h-16 bg-white/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-30" />
            <p className="text-slate-400 font-medium">No loyalty members yet</p>
            <p className="text-xs text-slate-500 mt-1">Members are added automatically when customers pay</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((account, index) => (
              <div key={account.id} className="card-admin-hover p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan font-bold text-xs flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white text-sm">{account.name || "Guest"}</p>
                    {index < 3 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan">Top {index + 1}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{account.phone}</span>
                    <span>{account.visitCount} visits</span>
                    <span>Spent {formatINR(account.totalSpent)}</span>
                    {account.lastVisited && <span>Last: {formatDate(account.lastVisited)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display font-bold text-accent-cyan text-lg">{account.totalPoints.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
