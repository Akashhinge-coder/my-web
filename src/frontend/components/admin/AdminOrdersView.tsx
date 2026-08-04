"use client";

import { useState } from "react";
import { formatINR, timeAgo, cn } from "@/lib/utils";
import { ShoppingBag, Clock, Check, ChefHat, Filter, RefreshCw } from "lucide-react";
import type { Order } from "@/types/domain";
import { ordersApi } from "@/frontend/api/orders";
import { useRestaurantOrders } from "@/frontend/hooks/useOrderFeed";
import { useAdminRestaurant } from "@/frontend/hooks/useAdminRestaurant";
import { useCashRequests, type CashRequest } from "@/frontend/hooks/useCashRequests";
import { CollectCashDialog } from "./CollectCashDialog";
import { IndianRupee } from "lucide-react";
import { apiFetch } from "@/frontend/api/http";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-amber-600 dark:text-amber-400", next: "cooking", nextLabel: "Start Cooking" },
  cooking: { label: "Cooking", color: "text-orange-600 dark:text-orange-400", next: "served", nextLabel: "Mark Served" },
  served: { label: "Served", color: "text-emerald-600 dark:text-emerald-400", next: null, nextLabel: null },
  cancelled: { label: "Cancelled", color: "text-destructive", next: null, nextLabel: null },
} as const;

type FilterType = "all" | "pending" | "cooking" | "served";

export default function AdminOrdersView() {
  const { restaurantId, loading: restaurantLoading } = useAdminRestaurant();
  const sessionLoaded = !restaurantLoading && Boolean(restaurantId);
  const { data: orders = [], loading, refresh: refreshOrders } = useRestaurantOrders(sessionLoaded, "today");
  const { requests: cashRequests, loading: cashLoading, refresh: refreshCash } = useCashRequests(sessionLoaded);
  const [filter, setFilter] = useState<FilterType>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedCashRequest, setSelectedCashRequest] = useState<CashRequest | null>(null);

  const refresh = async () => {
    await Promise.all([refreshOrders(), refreshCash()]);
  };

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

  const isLoading = restaurantLoading || loading || cashLoading;

  const handleConfirmCash = async (request: CashRequest) => {
    await apiFetch("/api/payments/cash-confirm", {
      method: "POST",
      body: JSON.stringify({ paymentId: request.id, checkoutId: request.session_id })
    });
    await refresh();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-foreground">Live Orders</h1>
          <p className="page-subtitle text-muted-foreground">Updates every few seconds • Today</p>
        </div>
        <button onClick={() => void refresh()} className="btn-md btn-admin mt-1" type="button">
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
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border",
              filter === f
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                filter === f ? "bg-primary-foreground/20" : "bg-muted-foreground/20 text-muted-foreground"
              )}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {!isLoading && cashRequests.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Requires Action</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cashRequests.map((req) => {
              const tables = req.session?.restaurant_tables;
              const tableNum = Array.isArray(tables) ? tables[0]?.table_number : tables?.table_number;
              const minutes = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 60000);
              const colorClass = minutes > 8 ? "border-red-500/50 bg-red-500/5" 
                               : minutes > 3 ? "border-orange-500/50 bg-orange-500/5" 
                               : "border-emerald-500/50 bg-emerald-500/5";

              return (
                <div key={req.id} className={cn("card-admin p-5 flex flex-col gap-4 transition-all border", colorClass)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-semibold text-foreground text-lg flex items-center gap-2">
                          <IndianRupee className="w-5 h-5 text-amber-500" />
                          Cash Requested
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold bg-muted border border-border">
                          {tableNum?.replace("T", "") || "—"}
                        </span>
                        Table {tableNum || "—"}
                        <span className="text-border">·</span>
                        <Clock className="w-3 h-3" />
                        {timeAgo(req.created_at)}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground bg-muted border border-border px-2.5 py-1 rounded-lg">
                      {formatINR(req.amount)}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedCashRequest(req)}
                    className="w-full py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-colors mt-2"
                  >
                    Collect Cash
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-admin p-5 space-y-3">
              <div className="animate-pulse h-4 rounded w-24 bg-muted/20" />
              <div className="animate-pulse h-3 rounded w-full bg-muted/20" />
              <div className="animate-pulse h-3 rounded w-3/4 bg-muted/20" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="font-medium text-muted-foreground">No {filter === "all" ? "" : filter} orders</p>
          <p className="text-xs mt-1 text-muted-foreground/60">New orders will appear here automatically</p>
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
                  "card-admin p-5 flex flex-col gap-4 transition-all border",
                  order.status === "pending" && "border-amber-500/30",
                  order.status === "cooking" && "border-orange-500/30"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-foreground text-base">
                        {order.order_number}
                      </span>
                      {order.source !== "table" && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                            order.source === "zomato"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-chart-5/10 text-chart-5"
                          )}
                        >
                          {order.source}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold bg-muted border border-border">
                        {tableNum.replace("T", "")}
                      </span>
                      Table {tableNum}
                      <span className="text-border">·</span>
                      <Clock className="w-3 h-3" />
                      {timeAgo(order.created_at)}
                    </div>
                  </div>
                  <span className={cn("text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-muted border border-border", cfg.color)}>{cfg.label}</span>
                </div>

                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary">
                          {item.quantity}
                        </span>
                        <span className="text-foreground/80">{item.item_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatINR(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mt-2">
                      📝 {order.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">{formatINR(order.total)}</span>
                  {cfg.next && (
                    <button
                      onClick={() => void updateStatus(order.id, cfg.next!)}
                      disabled={updating === order.id}
                      type="button"
                      className={cn(
                        "btn-sm transition-all font-bold",
                        order.status === "pending"
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:bg-orange-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
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

      {selectedCashRequest && (
        <CollectCashDialog 
          request={selectedCashRequest} 
          onClose={() => setSelectedCashRequest(null)}
          onConfirm={() => handleConfirmCash(selectedCashRequest)}
        />
      )}
    </div>
  );
}
