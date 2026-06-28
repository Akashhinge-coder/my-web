"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR, timeAgo, cn } from "@/lib/utils";
import Image from "next/image";
import { ChefHat, Check, Clock, Wifi, WifiOff } from "lucide-react";
import { ordersApi } from "@/frontend/api/orders";
import { restaurantsApi } from "@/frontend/api/restaurants";
import { menuApi } from "@/frontend/api/menu";
import { useKitchenOrders } from "@/frontend/hooks/useOrderFeed";
import type { Order } from "@/types/domain";
import type { AdminDish } from "@/types/menu";


export default function KitchenDisplayView({ restaurantId }: { restaurantId: string }) {
  const { data: orders = [], loading, refresh } = useKitchenOrders(Boolean(restaurantId));
  const [online, setOnline] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<{ name: string; logo_url?: string | null } | null>(null);
  const [allDishes, setAllDishes] = useState<AdminDish[]>([]);

  const orderList = (orders ?? []) as Order[];

  const fetchRestaurant = useCallback(async () => {
    try {
      const r = await restaurantsApi.getById(restaurantId);
      setRestaurant({ name: r.name, logo_url: r.logo_url });
    } catch (error) {
      console.error("Failed to load restaurant details in kitchen view:", error);
    }
  }, [restaurantId]);

  const fetchDishes = useCallback(async () => {
    try {
      const d = await menuApi.listDishes(restaurantId);
      setAllDishes(d);
    } catch (error) {
      console.error("Failed to load dishes in kitchen view:", error);
    }
  }, [restaurantId]);

  useEffect(() => {
    void fetchRestaurant();
    void fetchDishes();
  }, [fetchRestaurant, fetchDishes]);

  useEffect(() => {
    window.addEventListener("settings-updated", fetchRestaurant);
    return () => {
      window.removeEventListener("settings-updated", fetchRestaurant);
    };
  }, [fetchRestaurant]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId);
    try {
      await ordersApi.updateStatus(restaurantId, orderId, status);
      await refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update order status. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  const pending = orderList.filter((o) => o.status === "pending");
  const cooking = orderList.filter((o) => o.status === "cooking");

  const initials = restaurant?.name ? restaurant.name.charAt(0).toUpperCase() : "M";

  return (
    <div className="min-h-screen bg-dark text-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-secondary">
        <div className="flex items-center gap-3">
          {restaurant?.logo_url ? (
            <Image
              src={restaurant.logo_url}
              alt={restaurant.name || ""}
              width={36}
              height={36}
              unoptimized
              className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-dark-border"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-white text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
            >
              {initials}
            </div>
          )}
          <div>
            <p className="font-display font-semibold text-lg leading-none">Kitchen Display</p>
            {restaurant && <p className="text-xs text-ink-4 mt-0.5">{restaurant.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-4 text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Pending: <strong className="text-white">{pending.length}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Cooking: <strong className="text-white">{cooking.length}</strong>
            </span>
          </div>
          <div className={cn("flex items-center gap-1.5 text-xs", online ? "text-emerald-400" : "text-red-400")}>
            {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {online ? "Live" : "Offline"}
          </div>
          <div className="text-ink-4 text-xs tabular-nums">
            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <ChefHat className="w-12 h-12 mx-auto mb-4 text-brand animate-pulse-soft" />
            <p className="text-ink-3">Loading orders…</p>
          </div>
        </div>
      ) : orderList.length === 0 ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-ink-4 opacity-30" />
            <p className="text-2xl font-display text-ink-3 font-semibold">Kitchen clear!</p>
            <p className="text-ink-4 mt-1">New orders will appear here automatically</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 h-[calc(100vh-73px)]">
          <div className="border-r border-dark-border overflow-y-auto p-4 space-y-3">
            <div className="flex items-center gap-2 mb-4 sticky top-0 bg-dark py-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse-soft" />
              <h2 className="font-semibold text-amber-400 text-sm uppercase tracking-wider">
                Pending ({pending.length})
              </h2>
            </div>
             {pending.map((order) => (
              <KitchenCard
                key={order.id}
                order={order}
                onAction={() => void updateStatus(order.id, "cooking")}
                actionLabel="Start Cooking"
                actionClass="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30"
                borderClass="border-amber-500/30"
                isUpdating={updating === order.id}
                dishes={allDishes}
              />
            ))}
          </div>

          <div className="overflow-y-auto p-4 space-y-3">
            <div className="flex items-center gap-2 mb-4 sticky top-0 bg-dark py-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse-soft" />
              <h2 className="font-semibold text-orange-400 text-sm uppercase tracking-wider">
                Cooking ({cooking.length})
              </h2>
            </div>
             {cooking.map((order) => (
              <KitchenCard
                key={order.id}
                order={order}
                onAction={() => void updateStatus(order.id, "served")}
                actionLabel="Mark Served"
                actionClass="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                borderClass="border-orange-500/30"
                isUpdating={updating === order.id}
                dishes={allDishes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KitchenCard({
  order,
  onAction,
  actionLabel,
  actionClass,
  borderClass,
  isUpdating,
  dishes,
}: {
  order: Order;
  onAction: () => void;
  actionLabel: string;
  actionClass: string;
  borderClass: string;
  isUpdating: boolean;
  dishes: any[];
}) {
  const tableNum = order.session?.table?.table_number ?? "—";

  return (
    <div className={cn("card-dark p-4 space-y-3 border", borderClass)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white text-xl">{order.order_number}</span>
          <span className="px-2 py-0.5 rounded-lg bg-dark-tertiary border border-dark-border text-xs text-ink-3">
            Table {tableNum}
          </span>
          {order.session?.host_participant?.name && (
            <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400 uppercase tracking-wide">
              {order.session.host_participant.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-4">
          <Clock className="w-3 h-3" />
          {timeAgo(order.created_at)}
        </div>
      </div>

      <div className="space-y-2">
        {(order.items ?? []).map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
              {item.quantity}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-base leading-tight">
                {item.item_type === "combo" ? `${item.item_name} (Combo)` : item.item_name}
              </p>
              {item.item_type === "combo" && item.combo?.dish_ids && (
                <div className="mt-1 pl-3 border-l border-dark-border space-y-0.5 text-xs text-ink-3">
                  {item.combo.dish_ids.map((dId: string) => {
                    const dish = dishes.find((d) => d.id === dId);
                    return <p key={dId}>• {dish ? dish.name : "Constituent Dish"}</p>;
                  })}
                </div>
              )}
              {item.notes && <p className="text-xs text-amber-400/80 mt-0.5">📝 {item.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {order.notes && (
        <p className="text-sm text-amber-400/80 bg-amber-400/5 border border-amber-400/10 rounded-lg px-3 py-2">
          📋 {order.notes}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-dark-border">
        <span className="text-sm text-ink-3">{formatINR(order.total)}</span>
        <button onClick={onAction} disabled={isUpdating} type="button" className={cn("btn-md border", actionClass)}>
          {isUpdating ? (
            "Updating…"
          ) : actionLabel === "Mark Served" ? (
            <>
              <Check className="w-4 h-4" />
              {actionLabel}
            </>
          ) : (
            <>
              <ChefHat className="w-4 h-4" />
              {actionLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
