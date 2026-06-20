import Link from "next/link";
import { DashboardService } from "@/backend/services/dashboard.service";
import { formatINR, formatINRCompact, timeAgo } from "@/lib/utils";
import {
  TrendingUp, ShoppingBag, Table2, Users,
  ArrowUpRight, Clock
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { stats, recentOrders, tables, payments } = await DashboardService.getDashboard();
  const {
    todayRevenue,
    totalOrders,
    pendingCount,
    cookingCount,
    availableTables,
    occupiedTables,
    reservedTables,
    cleaningTables,
    totalTables,
    totalCovers,
    activeSessionCount,
  } = stats;

  const STATS = [
    {
      label: "Today's Revenue",
      value: formatINRCompact(todayRevenue),
      full: formatINR(todayRevenue),
      icon: TrendingUp,
      color: "text-[#22d3ee]",
      bg: "bg-[#22d3ee]/10 border-[#22d3ee]/20",
      href: "/admin/analytics",
    },
    {
      label: "Orders Today",
      value: totalOrders.toString(),
      sub: `${pendingCount} pending · ${cookingCount} cooking`,
      icon: ShoppingBag,
      color: "text-[#facc15]",
      bg: "bg-[#facc15]/10 border-[#facc15]/20",
      href: "/admin/orders",
    },
    {
      label: "Tables",
      value: `${occupiedTables}/${totalTables}`,
      sub: `${availableTables} available`,
      icon: Table2,
      color: "text-[#34d399]",
      bg: "bg-[#34d399]/10 border-[#34d399]/20",
      href: "/admin/tables",
    },
    {
      label: "Live Covers",
      value: totalCovers.toString(),
      sub: `${activeSessionCount} active sessions`,
      icon: Users,
      color: "text-[#a78bfa]",
      bg: "bg-[#a78bfa]/10 border-[#a78bfa]/20",
      href: "/admin/tables",
    },
  ];

  const STATUS_STYLES: Record<string, string> = {
    pending: "badge-pending",
    cooking: "badge-cooking",
    served: "badge-served",
    cancelled: "badge-error",
  };

  const SOURCE_STYLES: Record<string, string> = {
    table: "bg-white/5 text-slate-400",
    zomato: "bg-red-500/10 text-red-400",
    swiggy: "bg-orange-500/10 text-orange-400",
  };

  const tableSummary = [
    { label: "Available", count: availableTables, color: "text-[#34d399]", bg: "bg-[#34d399]/10 border-[#34d399]/20" },
    { label: "Occupied", count: occupiedTables, color: "text-[#f87171]", bg: "bg-[#f87171]/10 border-[#f87171]/20" },
    { label: "Reserved", count: reservedTables, color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10 border-[#a78bfa]/20" },
    { label: "Cleaning", count: cleaningTables, color: "text-[#facc15]", bg: "bg-[#facc15]/10 border-[#facc15]/20" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-white">Dashboard</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <Link key={stat.label} href={stat.href} className="stat-card-admin group hover:border-accent-cyan/30 transition-all">
            <div className="flex items-start justify-between mb-3">
              <p className="stat-label">{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="stat-value" title={stat.full}>{stat.value}</p>
            {stat.sub && (
              <p className="stat-delta mt-1">{stat.sub}</p>
            )}
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 group-hover:text-accent-cyan transition-colors">
              View details <ArrowUpRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-admin p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sans font-semibold text-white">Live Orders</h2>
            <Link href="/admin/orders" className="text-xs text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders yet today</p>
              <p className="text-xs mt-1 text-slate-500">Orders will appear here in real time</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="order-card-admin flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-white">
                        {order.orderNumber}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${SOURCE_STYLES[order.source]}`}>
                        {order.source}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {order.summary}{order.extra}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px]">{timeAgo(order.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white mb-1">
                      {formatINR(order.total)}
                    </p>
                    <span className={STATUS_STYLES[order.status] || "badge"}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-admin p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sans font-semibold text-white">Table Status</h2>
            <Link href="/admin/tables" className="text-xs text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1 transition-colors">
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {tableSummary.map((s) => (
              <div key={s.label} className={`p-2.5 rounded-xl border ${s.bg} text-center`}>
                <p className={`text-xl font-display font-semibold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {tables.slice(0, 20).map((table) => {
              const colors: Record<string, string> = {
                available: "bg-[#34d399]/20 border-[#34d399]/30 text-[#34d399]",
                occupied: "bg-[#f87171]/20 border-[#f87171]/30 text-[#f87171]",
                reserved: "bg-[#a78bfa]/20 border-[#a78bfa]/30 text-[#a78bfa]",
                cleaning: "bg-[#facc15]/20 border-[#facc15]/30 text-[#facc15]",
              };
              return (
                <div
                  key={table.id}
                  title={`${table.tableNumber} · ${table.seatingCapacity} seats · ${table.status}`}
                  className={`aspect-square rounded-lg border flex items-center justify-center text-[10px] font-bold cursor-default ${colors[table.status]}`}
                >
                  {table.tableNumber.replace("T", "")}
                </div>
              );
            })}
            {tables.length > 20 && (
              <div className="aspect-square rounded-lg border border-admin-border-2 flex items-center justify-center text-[10px] text-slate-500">
                +{tables.length - 20}
              </div>
            )}
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="card-admin p-6">
          <h2 className="font-sans font-semibold text-white mb-5">
            Today&apos;s Payments
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(["upi", "gpay", "phonepe", "paytm", "cash", "card"] as const).map((method) => {
              const methodPayments = payments.filter((payment) => payment.method === method);
              const total = methodPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
              if (total === 0) return null;
              return (
                <div key={method} className="bg-admin-card-2 rounded-xl p-3 border border-admin-border-2 text-center">
                  <p className="text-sm font-semibold text-white">{formatINRCompact(total)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{method}</p>
                  <p className="text-[10px] text-slate-500">{methodPayments.length} txn</p>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}
    </div>
  );
}
