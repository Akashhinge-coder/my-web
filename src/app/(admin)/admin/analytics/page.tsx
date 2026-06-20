"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import { analyticsApi } from "@/frontend/api/analytics.api";
import { formatINR, formatINRCompact } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Users, Star, BarChart3 } from "lucide-react";
import type {
  AnalyticsDayData,
  AnalyticsDishData,
  AnalyticsPaymentData,
} from "@/types/analytics";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState<"7" | "30" | "90">("7");

  const [totalRevenue,  setTotalRevenue]  = useState(0);
  const [totalOrders,   setTotalOrders]   = useState(0);
  const [totalCovers,   setTotalCovers]   = useState(0);
  const [avgOrder,      setAvgOrder]      = useState(0);
  const [avgRating,     setAvgRating]     = useState(0);
  const [dailyData,     setDailyData]     = useState<AnalyticsDayData[]>([]);
  const [topDishes,     setTopDishes]     = useState<AnalyticsDishData[]>([]);
  const [paymentData,   setPaymentData]   = useState<AnalyticsPaymentData[]>([]);
  const [peakHours,     setPeakHours]     = useState<{ hour: number; count: number }[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getDashboard(range);
      setTotalRevenue(data.summary.totalRevenue);
      setTotalOrders(data.summary.totalOrders);
      setTotalCovers(data.summary.totalCovers);
      setAvgOrder(data.summary.avgOrder);
      setAvgRating(data.summary.avgRating);
      setDailyData(data.dailyData);
      setTopDishes(data.topDishes);
      setPaymentData(data.paymentData);
      setPeakHours(data.peakHours);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);
  const maxDishCount = Math.max(...topDishes.map(d => d.count), 1);
  const maxHourCount = Math.max(...peakHours.map(h => h.count), 1);

  const PAYMENT_COLORS: Record<string, string> = {
    upi:     "#10B981", gpay: "#10B981", phonepe: "#7C3AED",
    paytm:   "#0EA5E9", cash: "#F59E0B", card: "#3B82F6",
  };

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-white">Analytics</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="card-admin p-5 animate-pulse h-28 bg-white/5" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-white">Analytics</h1>
          <p className="page-subtitle">Business performance overview</p>
        </div>
        {/* Range selector */}
        <div className="flex gap-1 bg-[#131622] border border-[#1e293b] rounded-xl p-1">
          {(["7","30","90"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === r ? "bg-[#22d3ee] text-[#0c0e12]" : "text-slate-400 hover:text-white"
              }`}>
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue",     value: formatINRCompact(totalRevenue), full: formatINR(totalRevenue), icon: TrendingUp, color: "text-[#22d3ee]",   bg: "bg-[#22d3ee]/10 border-[#22d3ee]/20" },
          { label: "Orders",      value: totalOrders.toString(),          icon: ShoppingBag,             color: "text-[#facc15]",  bg: "bg-[#facc15]/10 border-[#facc15]/20" },
          { label: "Covers",      value: totalCovers.toString(),          icon: Users,                   color: "text-[#3b82f6]",   bg: "bg-[#3b82f6]/10 border-[#3b82f6]/20" },
          { label: "Avg Rating",  value: avgRating > 0 ? `${avgRating.toFixed(1)} ⭐` : "—", icon: Star, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10 border-[#fbbf24]/20" },
        ].map(stat => (
          <div key={stat.label} className="stat-card-admin">
            <div className="flex items-start justify-between mb-3">
              <p className="stat-label">{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="stat-value" title={(stat as { full?: string }).full}>{stat.value}</p>
            {stat.label === "Revenue" && avgOrder > 0 && (
              <p className="text-xs text-slate-500 mt-1">Avg order: {formatINR(avgOrder)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card-admin p-6">
        <h2 className="font-semibold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-cyan" />
          Daily Revenue
        </h2>
        <div className="flex items-end gap-1.5 h-40">
          {dailyData.map(day => {
            const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
            const date   = new Date(day.date);
            const label  = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex items-end justify-center" style={{ height: "120px" }}>
                  <div
                    className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80 relative"
                    style={{
                      height: `${Math.max(height, 2)}%`,
                      background: day.revenue > 0
                        ? "linear-gradient(180deg,#22d3ee,#2563eb)"
                        : "#1e293b",
                      minHeight: "4px",
                    }}
                  >
                    {day.revenue > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#111420] border border-[#1e293b] rounded-md px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {formatINRCompact(day.revenue)}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 rotate-45 origin-left whitespace-nowrap hidden sm:block">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top dishes + Payment breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top dishes */}
        <div className="card-admin p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent-cyan" />
            Top Dishes
          </h2>
          {topDishes.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No orders in this period</p>
          ) : (
            <div className="space-y-3">
              {topDishes.map((dish, i) => (
                <div key={dish.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-white truncate">{dish.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{dish.count} orders</span>
                    </div>
                    <div className="h-1.5 bg-[#131622] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(dish.count / maxDishCount) * 100}%`,
                          background: i === 0 ? "linear-gradient(90deg,#22d3ee,#2563eb)" : "#1e293b",
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-accent-cyan font-semibold">{formatINRCompact(dish.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="card-admin p-6">
          <h2 className="font-semibold text-white mb-5">Payment Methods</h2>
          {paymentData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No payments in this period</p>
          ) : (
            <div className="space-y-3">
              {paymentData.map(pm => {
                const pct = totalRevenue > 0 ? (pm.amount / totalRevenue) * 100 : 0;
                const color = PAYMENT_COLORS[pm.method] || "#888";
                return (
                  <div key={pm.method}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-white capitalize">{pm.method}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{pm.count} txn</span>
                        <span className="text-sm font-semibold text-white">{formatINRCompact(pm.amount)}</span>
                        <span className="text-xs text-slate-500 w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#131622] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Peak hours heatmap */}
      <div className="card-admin p-6">
        <h2 className="font-semibold text-white mb-5">Peak Hours</h2>
        <div className="flex items-end gap-1 h-24">
          {peakHours.map(h => {
            const height = maxHourCount > 0 ? (h.count / maxHourCount) * 100 : 0;
            const isPeak = height > 60;
            const hour12 = h.hour === 0 ? "12am" : h.hour < 12 ? `${h.hour}am` : h.hour === 12 ? "12pm" : `${h.hour-12}pm`;
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full rounded-t-sm transition-all" style={{
                  height: `${Math.max(height, 2)}%`,
                  background: isPeak ? "linear-gradient(180deg,#22d3ee,#2563eb)" : "#1e293b",
                  minHeight: "3px",
                }} />
                {(h.hour % 3 === 0) && (
                  <span className="text-[9px] text-slate-500">{hour12}</span>
                )}
              </div>
            );
          })}
        </div>
        {peakHours.length > 0 && (
          <p className="text-xs text-slate-500 mt-3">
            Busiest hour: {(() => {
              const peak = peakHours.reduce((a, b) => a.count > b.count ? a : b);
              const h = peak.hour;
              return h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h-12}pm`;
            })()} · {maxHourCount} orders
          </p>
        )}
      </div>
    </div>
  );
}
