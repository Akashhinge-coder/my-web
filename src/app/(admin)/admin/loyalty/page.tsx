"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import {
  loyaltyApi,
  type LoyaltyAccount,
  type LoyaltyDashboard,
} from "@/frontend/api/loyalty.api";
import { formatINR, formatDate } from "@/lib/utils";
import { Gift, Search, Star, TrendingUp, Users, Phone, Loader2, Power } from "lucide-react";

export default function LoyaltyPage() {
  const [dashboard, setDashboard] = useState<LoyaltyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

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
    earnEnabled: true,
    redeemEnabled: true,
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

  const toggleProgram = async () => {
    if (!dashboard) return;
    try {
      setSavingSettings(true);
      const isCurrentlyEnabled = settings.earnEnabled || settings.redeemEnabled;
      const newSettings = await loyaltyApi.updateSettings({
        earnEnabled: !isCurrentlyEnabled,
        redeemEnabled: !isCurrentlyEnabled,
      });
      setDashboard({ ...dashboard, settings: newSettings });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-foreground flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />Loyalty Program
        </h1>
        <p className="page-subtitle text-muted-foreground">Phone-based rewards - no login needed for customers</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card-admin p-5 border-primary/20 bg-card">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground text-sm mb-1">How loyalty works</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customers earn <strong className="text-primary">{settings.pointsPerHundred} points per Rs.100</strong> spent.
              Points are tracked by phone number. Minimum <strong className="text-primary">{settings.minimumPointsToRedeem} points</strong> to redeem.
              Redemption is capped at <strong className="text-primary">{settings.maxRedemptionPercent}%</strong> of the order amount.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total members", value: summary.totalMembers.toString(), icon: Users, color: "text-chart-4", bg: "bg-chart-4/10 border-chart-4/20" },
          { label: "Active (30d)", value: summary.activeMembers.toString(), icon: TrendingUp, color: "text-chart-3", bg: "bg-chart-3/10 border-chart-3/20" },
          { label: "Total points", value: summary.totalPoints.toLocaleString(), icon: Star, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
          { label: "Total spent", value: formatINR(summary.totalSpent), icon: Gift, color: "text-chart-2", bg: "bg-chart-2/10 border-chart-2/20" },
        ].map((stat) => (
          <div key={stat.label} className="card-admin p-5 bg-card">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-display font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card-admin p-5 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Program Settings</h3>
          <button
            onClick={toggleProgram}
            disabled={savingSettings || loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              settings.earnEnabled || settings.redeemEnabled
                ? "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
                : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
            }`}
          >
            {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
            {settings.earnEnabled || settings.redeemEnabled ? "Program Active" : "Program Disabled"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Points earned per Rs.100</label>
            <input className="input-admin" type="number" value={settings.pointsPerHundred} disabled />
          </div>
          <div>
            <label className="label">Min points to redeem</label>
            <input className="input-admin" type="number" value={settings.minimumPointsToRedeem} disabled />
          </div>
          <div>
            <label className="label">Max redemption %</label>
            <input className="input-admin" type="number" value={settings.maxRedemptionPercent} disabled />
          </div>
        </div>
      </div>

      <div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="input-admin"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => <div key={item} className="card-admin p-4 shimmer h-16" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground font-medium">No loyalty members yet</p>
            <p className="text-xs text-muted-foreground mt-1">Members are added automatically when customers pay</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((account, index) => (
              <div key={account.id} className="card-admin card-hover p-4 flex items-center gap-4 bg-card">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-foreground text-sm">{account.name || "Guest"}</p>
                    {index < 3 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">Top {index + 1}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{account.phone}</span>
                    <span>{account.visitCount} visits</span>
                    <span>Spent {formatINR(account.totalSpent)}</span>
                    {account.lastVisited && <span>Last: {formatDate(account.lastVisited)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display font-bold text-primary text-lg">{account.totalPoints.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
