"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import { ApiClientError } from "@/frontend/api/http";
import { billingApi } from "@/frontend/api/billing";
import { formatINR, timeAgo, generateWhatsAppBillLink, cn } from "@/lib/utils";
import {
  Receipt, CreditCard, Banknote, Smartphone,
  Check, Loader2, ArrowRight, Users, Clock,
  Split, Share2, ChevronDown, ChevronUp,
} from "lucide-react";
import type { PaymentMethod } from "@/types/domain";
import type { BillingRestaurant, BillingSession } from "@/types/billing";

type BillingLoadState = "loading" | "success" | "unauthorized" | "error";

const PAYMENT_METHODS = [
  { id: "upi",     label: "UPI / QR",  icon: Smartphone },
  { id: "gpay",    label: "GPay",      icon: Smartphone },
  { id: "phonepe", label: "PhonePe",   icon: Smartphone },
  { id: "cash",    label: "Cash",      icon: Banknote   },
  { id: "card",    label: "Card",      icon: CreditCard },
] as const;

export default function BillingPage() {
  const [restaurantData, setRestaurantData] = useState<BillingRestaurant | null>(null);
  const [sessions,       setSessions]       = useState<BillingSession[]>([]);
  const [loadState,      setLoadState]      = useState<BillingLoadState>("loading");
  const [errorMessage,   setErrorMessage]   = useState<string | null>(null);
  const [expanded,       setExpanded]       = useState<string | null>(null);
  const [payMethod,      setPayMethod]      = useState<PaymentMethod>("cash");
  const [cashReceived,   setCashReceived]   = useState("");
  const [processing,     setProcessing]     = useState<string | null>(null);
  const [splitCount,     setSplitCount]     = useState(2);
  const [showSplit,      setShowSplit]       = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const dashboard = await billingApi.getDashboard();
      setRestaurantData(dashboard.restaurant);
      setSessions(dashboard.sessions);
      setLoadState("success");
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "AUTH_REQUIRED") {
        setLoadState("unauthorized");
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "Unable to load billing");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // ── Process payment ───────────────────────────────────────
  async function processPayment(session: BillingSession) {
    if (!restaurantData) return;
    setProcessing(session.id);

    try {
      await billingApi.confirmPayment({
        sessionId: session.id,
        method: payMethod,
        amountPaid: payMethod === "cash" && cashReceived ? parseFloat(cashReceived) : undefined,
      });

      setCashReceived("");
      await fetchSessions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to process payment");
      setLoadState(error instanceof ApiClientError && error.code === "AUTH_REQUIRED" ? "unauthorized" : "error");
    } finally {
      setProcessing(null);
    }
  }

  if (loadState === "loading") return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  if (loadState === "unauthorized") return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card p-8 max-w-md text-center">
        <Receipt className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h1 className="font-display text-xl font-semibold text-foreground mb-2">
          Login required to view billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in with an admin or manager account to access billing and payments.
        </p>
      </div>
    </div>
  );

  if (loadState === "error") return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card p-8 max-w-md text-center">
        <Receipt className="w-10 h-10 mx-auto mb-4 text-destructive opacity-70" />
        <h1 className="font-display text-xl font-semibold text-foreground mb-2">
          Billing unavailable
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {errorMessage ?? "Unable to load billing right now."}
        </p>
        <button type="button" onClick={() => void fetchSessions()} className="btn-md btn-primary">
          Try again
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-white">Billing</h1>
        <p className="page-subtitle">{sessions.length} active tables awaiting payment</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground font-medium">No active billing sessions</p>
          <p className="text-xs text-muted-foreground mt-1">Active tables will appear here when customers request the bill</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => {
            const gst       = session.bill;
            const isExpanded = expanded === session.id;
            const change    = payMethod === "cash" && cashReceived
              ? Math.max(0, parseFloat(cashReceived || "0") - gst.total)
              : 0;
            const perPerson = gst.total / splitCount;
            const whatsappLink = restaurantData
              ? generateWhatsAppBillLink(restaurantData.phone, restaurantData.name, gst.total)
              : "";

            return (
              <div key={session.id} className="card overflow-hidden">
                {/* Session header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="font-display font-bold text-primary text-lg">
                        {session.restaurant_tables?.table_number?.replace("T","") ?? "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Table {session.restaurant_tables?.table_number}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />{session.guest_count} guests
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{timeAgo(session.started_at)}
                        </span>
                        <span>{session.orders.length} orders</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-display font-bold text-foreground text-xl">{formatINR(gst.total)}</p>
                      <p className="text-xs text-muted-foreground">incl. GST</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded billing detail */}
                {isExpanded && (
                  <div className="border-t border-border p-5 space-y-5">
                    {/* Order items */}
                    <div>
                      <p className="section-label text-muted-foreground mb-3">Items ordered</p>
                      <div className="space-y-2">
                        {session.orders.flatMap(order =>
                          order.order_items.map((item, i) => (
                            <div key={`${order.id}-${i}`} className="flex justify-between text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-bold border border-border">
                                  {item.quantity}
                                </span>
                                {item.item_name}
                              </div>
                              <span className="text-foreground font-medium">
                                {formatINR(item.unit_price)} each
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* GST breakdown */}
                    <div className="bg-muted rounded-xl p-4 space-y-2 text-sm border border-border">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span><span>{formatINR(gst.subtotal)}</span>
                      </div>
                      {gst.happyHourDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Happy hour</span><span>-{formatINR(gst.happyHourDiscount)}</span>
                        </div>
                      )}
                      {gst.couponDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Coupon</span><span>-{formatINR(gst.couponDiscount)}</span>
                        </div>
                      )}
                      {gst.loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Loyalty</span><span>-{formatINR(gst.loyaltyDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>CGST ({restaurantData?.cgst_rate ?? 2.5}%)</span>
                        <span>{formatINR(gst.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>SGST ({restaurantData?.sgst_rate ?? 2.5}%)</span>
                        <span>{formatINR(gst.sgst)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                        <span>Total</span>
                        <span className="font-display text-lg">{formatINR(gst.total)}</span>
                      </div>
                    </div>

                    {/* Split bill */}
                    <div>
                      <button
                        onClick={() => setShowSplit(showSplit === session.id ? null : session.id)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Split className="w-4 h-4" />
                        Split bill
                        {showSplit === session.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showSplit === session.id && (
                        <div className="mt-3 bg-muted rounded-xl p-4 border border-border">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-sm text-muted-foreground">Split between</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                                className="w-7 h-7 rounded-lg bg-background border border-border text-foreground font-bold flex items-center justify-center">−</button>
                              <span className="font-bold text-foreground w-4 text-center">{splitCount}</span>
                              <button onClick={() => setSplitCount(Math.min(20, splitCount + 1))}
                                className="w-7 h-7 rounded-lg bg-background border border-border text-foreground font-bold flex items-center justify-center">+</button>
                            </div>
                            <span className="text-sm text-muted-foreground">people</span>
                          </div>
                          <p className="text-primary font-display font-semibold text-xl">
                            {formatINR(perPerson)} <span className="text-sm text-muted-foreground font-sans font-normal">per person</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Payment method */}
                    <div>
                      <p className="section-label text-muted-foreground mb-3">Payment method</p>
                      <div className="flex gap-2 flex-wrap">
                        {PAYMENT_METHODS.map(pm => (
                          <button key={pm.id}
                            onClick={() => setPayMethod(pm.id)}
                            className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all",
                              payMethod === pm.id
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/30"
                            )}>
                            <pm.icon className="w-3.5 h-3.5" />
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cash change calculator */}
                    {payMethod === "cash" && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">Cash Change Calculator</p>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Bill amount</p>
                            <p className="font-display font-semibold text-foreground">{formatINR(gst.total)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Cash received (₹)</p>
                            <input
                              type="number"
                              value={cashReceived}
                              onChange={e => setCashReceived(e.target.value)}
                              className="input py-1.5 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Change to return</p>
                            <p className={cn("font-display font-semibold text-lg",
                              change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                            )}>
                              {change > 0 ? formatINR(change) : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <a href={whatsappLink} target="_blank" rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-colors">
                        <Share2 className="w-4 h-4" />WhatsApp bill
                      </a>
                      <button
                        onClick={() => processPayment(session)}
                        disabled={processing === session.id}
                        className="flex-2 flex-1 btn-md btn-primary"
                      >
                        {processing === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><Check className="w-4 h-4" />Mark Paid · {formatINR(gst.total)}</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
