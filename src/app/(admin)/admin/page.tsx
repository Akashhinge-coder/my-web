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
    awaitingPaymentTables,
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
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
      href: "/admin/analytics",
    },
    {
      label: "Orders Today",
      value: totalOrders.toString(),
      sub: `${pendingCount} pending · ${cookingCount} cooking`,
      icon: ShoppingBag,
      color: "text-chart-2",
      bg: "bg-chart-2/10 border-chart-2/20",
      href: "/admin/orders",
    },
    {
      label: "Tables",
      value: `${occupiedTables}/${totalTables}`,
      sub: `${availableTables} available`,
      icon: Table2,
      color: "text-chart-3",
      bg: "bg-chart-3/10 border-chart-3/20",
      href: "/admin/tables",
    },
    {
      label: "Live Covers",
      value: totalCovers.toString(),
      sub: `${activeSessionCount} active sessions`,
      icon: Users,
      color: "text-chart-4",
      bg: "bg-chart-4/10 border-chart-4/20",
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
    table: "bg-muted text-muted-foreground",
    zomato: "bg-destructive/10 text-destructive",
    swiggy: "bg-chart-5/10 text-chart-5",
  };

  const tableSummary = [
    { label: "Available", count: availableTables, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Occupied", count: occupiedTables, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
    { label: "Reserved", count: reservedTables, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Cleaning", count: cleaningTables, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Awaiting Pay", count: awaitingPaymentTables, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-admin-text">Dashboard</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="flex items-center gap-1 mt-2 text-xs text-admin-subtle group-hover:text-accent-cyan transition-colors">
              View details <ArrowUpRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 card-admin p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sans font-semibold text-admin-text">Live Orders</h2>
            <Link href="/admin/orders" className="text-xs text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-admin-subtle">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders yet today</p>
              <p className="text-xs mt-1 text-admin-subtle">Orders will appear here in real time</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="order-card-admin flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-admin-text">
                        {order.orderNumber}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${SOURCE_STYLES[order.source]}`}>
                        {order.source}
                      </span>
                    </div>
                    <p className="text-xs text-admin-muted truncate">
                      {order.summary}{order.extra}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-admin-subtle">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px]">{timeAgo(order.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-admin-text mb-1">
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

        <div className="card-admin p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sans font-semibold text-admin-text">Table Status</h2>
            <Link href="/admin/tables" className="text-xs text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1 transition-colors">
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {tableSummary.map((s) => (
              <div key={s.label} className={`p-2.5 rounded-xl border ${s.bg} text-center`}>
                <p className={`text-xl font-display font-semibold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-admin-subtle mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 md:gap-2">
            {tables.slice(0, 20).map((table) => {
              const colors: Record<string, string> = {
                available: "bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                occupied: "bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-400",
                reserved: "bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400",
                cleaning: "bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400",
                awaiting_payment: "bg-purple-500/20 border-purple-500/30 text-purple-600 dark:text-purple-400",
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
              <div className="aspect-square rounded-lg border border-border flex items-center justify-center text-[10px] text-muted-foreground">
                +{tables.length - 20}
              </div>
            )}
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="card-admin p-4 md:p-6">
          <h2 className="font-sans font-semibold text-admin-text mb-5">
            Today&apos;s Payments
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(["razorpay", "cash", "pos"] as const).map((method) => {
              const methodPayments = payments.filter((payment) => payment.method === method);
              const total = methodPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
              if (total === 0) return null;
              return (
                <div key={method} className="bg-admin-card-2 rounded-xl p-3 border border-admin-border-2 text-center">
                  <p className="text-sm font-semibold text-admin-text">{formatINRCompact(total)}</p>
                  <p className="text-[10px] text-admin-subtle mt-0.5 uppercase tracking-wide">{method}</p>
                  <p className="text-[10px] text-admin-subtle">{methodPayments.length} txn</p>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}
    </div>
  );
}
