"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import type { SessionBill } from "@/frontend/api/orders";
import { restaurantsApi } from "@/frontend/api/restaurants";
import { useSessionOrders } from "@/frontend/hooks/useOrderFeed";
import type { Order } from "@/types/domain";
import { PaymentModal } from "./PaymentModal";

const STATUS_CONFIG = {
  pending: { label: "Waiting", color: "text-amber-400", bg: "bg-amber-900/30  border-amber-900/50", icon: Clock },
  cooking: { label: "Cooking", color: "text-orange-400", bg: "bg-orange-900/30 border-orange-900/50", icon: ChefHat },
  served: { label: "Served", color: "text-green-400", bg: "bg-green-900/30  border-green-900/50", icon: CheckCircle2 },
};

export default function CustomerOrdersView({
  slug,
  tableId,
}: {
  slug: string;
  tableId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(cart.state.sessionId);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(searchParams?.get("placed") === "true");
  const { pricing, loading: pricingLoading } = useCartPricing(restaurantId, cart.state.items);

  const { data: orders = [], loading, error, setData } = useSessionOrders(sessionId);
  const orderList = (orders ?? []) as Order[];

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [billData, setBillData] = useState<SessionBill | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handlePayBillClick = async () => {
    if (!slug || !tableId) return;
    try {
       const bill = await ordersApi.getBill(slug, tableId);
       setBillData(bill);
       setPaymentModalOpen(true);
    } catch (err) {
       alert("Could not load bill details. Please try again.");
    }
  };

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
    <div className="min-h-screen bg-dark pb-32">
      <div className="sticky top-0 z-40 bg-dark/90 backdrop-blur-md border-b border-dark-border px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          type="button"
          className="p-2 rounded-xl text-zinc-400 hover:bg-dark-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-semibold text-white">Your Orders</h1>
      </div>

      {paymentSuccess ? (
        <div className="px-4 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-zinc-400 mb-8 max-w-sm">Thank you for dining with us. Your bill has been paid. We hope to see you again soon!</p>
        </div>
      ) : (
      <div className="px-4 py-5 space-y-4">
        {cart.totalItems > 0 && (
          <div className="bg-dark-card rounded-2xl border-2 border-brand/50 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand" />
              Ready to order ({cart.totalItems} items)
            </h2>
            <div className="space-y-2 mb-4">
              {cart.state.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-zinc-400">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span>{formatINR(item.price)} each</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-dark-border mb-4">
              <span className="font-semibold text-white">Total</span>
              <span className="font-display font-semibold text-white text-lg">
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
          <div className="bg-green-950/40 border border-green-900/50 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-100 text-sm">Order placed!</p>
              <p className="text-green-300 text-xs mt-0.5">Your kitchen is preparing it now</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-4 rounded-2xl mb-4">
            <p className="font-semibold text-sm mb-1">Could not load orders</p>
            <p className="text-xs">{error}</p>
          </div>
        ) : null}

        {loading && orderList.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">Loading orders…</div>
        ) : (
          <div className="mt-8 space-y-6">
            <h2 className="font-display text-2xl font-bold text-white mb-2">Order Timeline</h2>
            {orderList.length > 0 ? (
              <div className="relative pl-6 space-y-8 border-l-2 border-brand/20 ml-2">
                {orderList.map((order, idx) => {
                  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon || Clock;
                  const items = order.items ?? [];
                  const isLatest = idx === 0;

                  return (
                    <div key={order.id} className="relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute -left-[33px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10",
                        order.status === "pending" ? "bg-amber-500 animate-pulse" : 
                        order.status === "cooking" ? "bg-orange-500" : "bg-green-500"
                      )} />
                      
                      <div className={cn(
                        "bg-dark-card rounded-3xl border p-5 shadow-sm transition-all relative overflow-hidden",
                        isLatest ? "border-brand/40 shadow-card" : "border-dark-border opacity-90"
                      )}>
                        {isLatest && <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />}
                        
                        <div className="flex flex-col mb-4 relative z-10">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-display font-bold text-lg text-white">Order ID {order.order_number}</span>
                            <span className={cn(
                              "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border shadow-sm",
                              cfg.bg,
                              cfg.color
                            )}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {cfg.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {order.placed_by_name ? (
                              <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                                Ordered by {order.placed_by_name}
                              </span>
                            ) : <span />}
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                              {timeAgo(order.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-5 relative z-10">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-lg bg-dark-tertiary flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-dark-border">
                                {item.quantity}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-zinc-300 leading-tight mt-0.5">{item.item_name}</span>
                                {item.notes && <span className="text-[11px] text-zinc-500 mt-1 font-medium bg-dark-tertiary px-2 py-0.5 rounded w-max">Note: {item.notes}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-dashed border-dark-border relative z-10">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Order Total</span>
                          <span className="font-display text-xl font-bold text-white">{formatINR(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : cart.totalItems > 0 ? (
              <div className="bg-dark-card rounded-2xl border border-dark-border border-dashed p-6 text-center shadow-sm">
                <Clock className="w-8 h-8 text-zinc-500 mx-auto mb-2 opacity-50" />
                <p className="text-zinc-400 text-sm font-medium">You haven't placed any orders yet.</p>
                <p className="text-zinc-500 text-xs mt-1">Place your order above to see it here.</p>
              </div>
            ) : null}
          </div>
        )}

        {orderList.length === 0 && cart.totalItems === 0 && !loading && (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-zinc-500 opacity-30" />
            <p className="text-zinc-400 font-medium">No orders yet</p>
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
      )}

      {orderList.length > 0 && cart.totalItems === 0 && !paymentSuccess && (
        <div className="fixed bottom-0 left-0 right-0 p-4 safe-bottom bg-dark/90 backdrop-blur-md border-t border-dark-border">
          <div className="flex items-center gap-3">
             <button
               onClick={() => router.push(`/${slug}/${tableId}`)}
               type="button"
               className="flex-1 py-3.5 rounded-2xl border-2 border-brand text-brand font-semibold flex items-center justify-center gap-2"
             >
               <Plus className="w-4 h-4" />
               Order more
             </button>
             
             {/* Only show pay bill if there's orders to pay for. (This could be hidden if bill is already 0, but for now we assume they have a balance) */}
             <button
               onClick={handlePayBillClick}
               type="button"
               className="flex-1 py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2"
               style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
             >
               Pay Bill
             </button>
          </div>
        </div>
      )}

      <PaymentModal 
         isOpen={isPaymentModalOpen}
         onClose={() => setPaymentModalOpen(false)}
         bill={billData}
         restaurantId={restaurantId}
         onPaymentSuccess={() => {
            setPaymentModalOpen(false);
            setPaymentSuccess(true);
            // Optionally, clear orders or redirect
         }}
      />
    </div>
  );
}
