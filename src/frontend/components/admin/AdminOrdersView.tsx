"use client";

import { useState } from "react";
import { formatINR, timeAgo, cn } from "@/lib/utils";
import { ShoppingBag, Clock, Check, ChefHat, Filter, RefreshCw } from "lucide-react";
import type { Order } from "@/types/domain";
import { ordersApi } from "@/frontend/api/orders";
import { useRestaurantOrders } from "@/frontend/hooks/useOrderFeed";
import { useAdminRestaurant } from "@/frontend/hooks/useAdminRestaurant";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "badge-pending", next: "cooking", nextLabel: "Start Cooking" },
  cooking: { label: "Cooking", color: "badge-cooking", next: "served", nextLabel: "Mark Served" },
  served: { label: "Served", color: "badge-served", next: null, nextLabel: null },
  cancelled: { label: "Cancelled", color: "badge-error", next: null, nextLabel: null },
} as const;

type FilterType = "all" | "pending" | "cooking" | "served";

export default function AdminOrdersView() {
  const { restaurantId, loading: restaurantLoading } = useAdminRestaurant();
  const sessionLoaded = !restaurantLoading && Boolean(restaurantId);
  const { data: orders = [], loading, refresh } = useRestaurantOrders(sessionLoaded, "today");
  const [filter, setFilter] = useState<FilterType>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const orderList = (orders ?? []) as Order[];

  async function updateStatus(orderId: string, newStatus: string) {
    if (!restaurantId) return;
    setUpdating(orderId);
    try {
      await ordersApi.updateStatus(restaurantId, orderId, newStatus);
      await refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = orderList.filter((o) => (filter === "all" ? true : o.status === filter));

  const counts = {
    all: orderList.length,
    pending: orderList.filter((o) => o.status === "pending").length,
    cooking: orderList.filter((o) => o.status === "cooking").length,
    served: orderList.filter((o) => o.status === "served").length,
  };

  const isLoading = restaurantLoading || loading;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-white">Live Orders</h1>
          <p className="page-subtitle">Updates every few seconds • Today</p>
        </div>
        <button onClick={() => void refresh()} className="btn-md btn-dark mt-1" type="button">
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:block">Refresh</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(["all", "pending", "cooking", "served"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              filter === f
                ? "bg-brand text-white"
                : "bg-dark-card border border-dark-border text-ink-3 hover:text-white"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                filter === f ? "bg-white/20" : "bg-dark-tertiary"
              )}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-dark p-5 space-y-3">
              <div className="shimmer h-4 rounded w-24" />
              <div className="shimmer h-3 rounded w-full" />
              <div className="shimmer h-3 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-ink-4 opacity-40" />
          <p className="text-ink-3 font-medium">No {filter === "all" ? "" : filter} orders</p>
          <p className="text-xs text-ink-4 mt-1">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
            const session = order.session;
            const tableNum = session?.table?.table_number ?? "—";
            const items = order.items ?? [];

            return (
              <div
                key={order.id}
                className={cn(
                  "card-dark p-5 flex flex-col gap-4 transition-all",
                  order.status === "pending" && "border-amber-500/30",
                  order.status === "cooking" && "border-orange-500/30"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-white text-base">
                        {order.order_number}
                      </span>
                      {order.source !== "table" && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                            order.source === "zomato"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-orange-500/20 text-orange-400"
                          )}
                        >
                          {order.source}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-4">
                      <span className="w-5 h-5 rounded-md bg-dark-tertiary border border-dark-border flex items-center justify-center text-[10px] font-bold text-ink-3">
                        {tableNum.replace("T", "")}
                      </span>
                      Table {tableNum}
                      <span className="text-dark-border">·</span>
                      <Clock className="w-3 h-3" />
                      {timeAgo(order.created_at)}
                    </div>
                  </div>
                  <span className={cfg.color}>{cfg.label}</span>
                </div>

                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-[10px] font-bold text-brand">
                          {item.quantity}
                        </span>
                        <span className="text-ink-2">{item.item_name}</span>
                      </div>
                      <span className="text-ink-4 text-xs">
                        {formatINR(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/10 rounded-lg px-2.5 py-1.5 mt-2">
                      📝 {order.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dark-border">
                  <span className="font-semibold text-white">{formatINR(order.total)}</span>
                  {cfg.next && (
                    <button
                      onClick={() => void updateStatus(order.id, cfg.next!)}
                      disabled={updating === order.id}
                      type="button"
                      className={cn(
                        "btn-sm transition-all",
                        order.status === "pending"
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                      )}
                    >
                      {updating === order.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : order.status === "pending" ? (
                        <ChefHat className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      {cfg.nextLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
