"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/frontend/hooks/useCart";
import { useCartPricing } from "@/frontend/hooks/useCartPricing";
import { formatINR, cn, timeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  ChefHat,
  Check,
  Clock,
  ShoppingBag,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ordersApi, sessionsApi } from "@/frontend/api/orders";
import { restaurantsApi } from "@/frontend/api/restaurants";
import { useSessionOrders } from "@/frontend/hooks/useOrderFeed";
import type { Order } from "@/types/domain";

const STATUS_CONFIG = {
  pending: { label: "Waiting", color: "text-amber-600", bg: "bg-amber-50  border-amber-200", icon: Clock },
  cooking: { label: "Cooking", color: "text-orange-600", bg: "bg-orange-50 border-orange-200", icon: ChefHat },
  served: { label: "Served", color: "text-green-600", bg: "bg-green-50  border-green-200", icon: CheckCircle2 },
};


export default function CustomerOrdersView({
  slug,
  tableId,
}: {
  slug: string;
  tableId: string;
}) {
  const router = useRouter();
  const cart = useCart();

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(cart.state.sessionId);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const { pricing, loading: pricingLoading } = useCartPricing(restaurantId, cart.state.items);

  const { data: orders = [], loading, setData } = useSessionOrders(sessionId);
  const orderList = (orders ?? []) as Order[];

  useEffect(() => {
    restaurantsApi.getBySlug(slug).then((r) => setRestaurantId(r.id));
  }, [slug]);

  useEffect(() => {
    setSessionId(cart.state.sessionId);
  }, [cart.state.sessionId]);

  async function placeOrder() {
    if (!restaurantId || cart.totalItems === 0) return;
    setPlacing(true);

    try {
      const result = await ordersApi.place(restaurantId, {
        tableId,
        sessionId: sessionId ?? undefined,
        items: cart.state.items.map((item) => ({
          dishId: item.itemType === "dish" ? item.id : undefined,
          comboId: item.itemType === "combo" ? item.id : undefined,
          itemType: item.itemType,
          quantity: item.quantity,
          notes: item.notes,
        })),
      });

      setSessionId(result.sessionId);
      cart.setSession(result.sessionId);
      cart.clearCart();
      setPlaced(true);
      setData(await ordersApi.listBySession(result.sessionId));
    } catch (err) {
      console.error(err);
      alert("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          type="button"
          className="p-2 rounded-xl text-ink-3 hover:bg-surface-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-semibold text-ink">Your Orders</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {cart.totalItems > 0 && (
          <div className="bg-white rounded-2xl border-2 border-brand/30 p-5 shadow-card">
            <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand" />
              Ready to order ({cart.totalItems} items)
            </h2>
            <div className="space-y-2 mb-4">
              {cart.state.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-ink-3">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span>{formatINR(item.price)} each</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border mb-4">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-display font-semibold text-ink text-lg">
                {formatINR(pricing.grandTotal)}
              </span>
            </div>
            <button
              onClick={() => void placeOrder()}
              disabled={placing || pricingLoading}
              type="button"
              className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
            >
              {placing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Placing order…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Place Order
                </>
              )}
            </button>
          </div>
        )}

        {placed && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Order placed!</p>
              <p className="text-green-600 text-xs mt-0.5">Your kitchen is preparing it now</p>
            </div>
          </div>
        )}

        {loading && orderList.length === 0 ? (
          <div className="text-center py-12 text-ink-3">Loading orders…</div>
        ) : orderList.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-ink">Order History</h2>
            {orderList.map((order) => {
              const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = cfg?.icon || Clock;
              const items = order.items ?? [];

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-border p-4 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">{order.order_number}</span>
                        <span className="text-xs text-ink-4">{timeAgo(order.created_at)}</span>
                      </div>
                      {order.placed_by_name && (
                        <span className="text-xs font-medium text-brand/80">Ordered by {order.placed_by_name}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                        cfg?.bg,
                        cfg?.color
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {cfg?.label}
                    </span>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-ink-3">
                        <span className="w-5 h-5 rounded-md bg-surface-secondary flex items-center justify-center text-xs font-bold text-ink-3">
                          {item.quantity}
                        </span>
                        {item.item_name}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-sm text-ink-3">Order total</span>
                    <span className="font-display font-semibold text-ink">{formatINR(order.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {orderList.length === 0 && cart.totalItems === 0 && !loading && (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-ink-4 opacity-30" />
            <p className="text-ink-3 font-medium">No orders yet</p>
            <button
              onClick={() => router.push(`/${slug}/${tableId}`)}
              type="button"
              className="btn-md btn-primary mt-4 inline-flex"
            >
              <Plus className="w-4 h-4" />
              Browse menu
            </button>
          </div>
        )}
      </div>

      {orderList.length > 0 && cart.totalItems === 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 safe-bottom bg-white/90 backdrop-blur-md border-t border-border">
          <button
            onClick={() => router.push(`/${slug}/${tableId}`)}
            type="button"
            className="w-full py-3.5 rounded-2xl border-2 border-brand text-brand font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Order more
          </button>
        </div>
      )}
    </div>
  );
}
