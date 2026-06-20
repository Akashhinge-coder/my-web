"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR, generateWhatsAppBillLink } from "@/lib/utils";
import {
  ArrowLeft,
  Receipt,
  Share2,
  Smartphone,
  Banknote,
  CreditCard,
  Check,
  Loader2,
} from "lucide-react";
import { ordersApi, type SessionBill } from "@/frontend/api/orders";

export default function CustomerBillView({
  slug,
  tableId,
}: {
  slug: string;
  tableId: string;
}) {
  const router = useRouter();
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [payMethod, setPayMethod] = useState<string | null>(null);

  useEffect(() => {
    ordersApi
      .getBill(slug, tableId)
      .then((data) => {
        if (data.orders.length === 0 && !data.sessionId) {
          setBill(null);
        } else {
          setBill(data);
        }
      })
      .catch(() => setBill(null))
      .finally(() => setLoading(false));
  }, [slug, tableId]);

  function submitRating(score: number) {
    setRating(score);
    setRated(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
import {
  ArrowLeft,
  Receipt,
  Share2,
  Smartphone,
  Banknote,
  CreditCard,
  Check,
  Loader2,
} from "lucide-react";
import { ordersApi, type SessionBill } from "@/frontend/api/orders";

export default function CustomerBillView({
  slug,
  tableId,
}: {
  slug: string;
  tableId: string;
}) {
  const router = useRouter();
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [payMethod, setPayMethod] = useState<string | null>(null);

  useEffect(() => {
    ordersApi
      .getBill(slug, tableId)
      .then((data) => {
        if (data.orders.length === 0 && !data.sessionId) {
          setBill(null);
        } else {
          setBill(data);
        }
      })
      .catch(() => setBill(null))
      .finally(() => setLoading(false));
  }, [slug, tableId]);

  function submitRating(score: number) {
    setRating(score);
    setRated(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6 text-center">
        <Receipt className="w-12 h-12 text-zinc-500 opacity-30 mb-4" />
        <p className="text-ink-3 font-medium">No active bill found</p>
        <button
          onClick={() => router.push(`/${slug}/${tableId}`)}
          type="button"
          className="btn-md btn-primary mt-4"
        >
          Back to menu
        </button>
      </div>
    );
  }

  const pricing = bill.pricing;
  const whatsappLink = generateWhatsAppBillLink(
    bill.restaurant.phone,
    bill.restaurant.name,
    pricing.grandTotal
  );

  return (
    <div className="min-h-screen bg-dark pb-10">
      <div className="sticky top-0 z-40 bg-dark/90 backdrop-blur-md border-b border-dark-border px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          type="button"
          className="p-2 rounded-xl text-zinc-400 hover:bg-dark-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-semibold text-white">Your Bill</h1>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-md mx-auto">
        <div className="text-center pb-4 border-b border-dark-border">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-xl"
            style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
          >
            {bill.restaurant.name.charAt(0)}
          </div>
          <h2 className="font-display text-xl font-semibold text-white">{bill.restaurant.name}</h2>
          <p className="text-zinc-400 text-sm">Table {bill.table.table_number}</p>
          {bill.restaurant.gst_number && (
            <p className="text-xs text-zinc-500 mt-1 font-mono">GSTIN: {bill.restaurant.gst_number}</p>
          )}
        </div>

        <div className="bg-dark-card rounded-2xl border border-dark-border p-4 space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          {bill.orders.flatMap((order) =>
            (order.items ?? []).map((item, i) => (
              <div key={`${order.order_number}-${i}`} className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-dark-tertiary flex items-center justify-center text-xs font-bold text-zinc-400 border border-dark-border">
                    {item.quantity}
                  </span>
                  <span className="text-white">{item.item_name}</span>
                </div>
                <span className="text-zinc-400">{formatINR(item.unit_price)} each</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-dark-card rounded-2xl border border-dark-border p-4 shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-2.5">
          <div className="flex justify-between text-sm text-zinc-400">
            <span>Subtotal</span>
            <span>{formatINR(pricing.subtotal)}</span>
          </div>
          {pricing.happyHourDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Happy hour</span>
              <span>-{formatINR(pricing.happyHourDiscount)}</span>
            </div>
          )}
          {pricing.couponDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Coupon</span>
              <span>-{formatINR(pricing.couponDiscount)}</span>
            </div>
          )}
          {pricing.loyaltyDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Loyalty</span>
              <span>-{formatINR(pricing.loyaltyDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-zinc-400">
            <span>CGST ({bill.restaurant.cgst_rate}%)</span>
            <span>{formatINR(pricing.cgst)}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-400">
            <span>SGST ({bill.restaurant.sgst_rate}%)</span>
            <span>{formatINR(pricing.sgst)}</span>
          </div>
          <div className="flex justify-between font-bold text-white text-base pt-2 border-t border-dark-border">
            <span>Total</span>
            <span className="font-display text-xl">{formatINR(pricing.grandTotal)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold text-white">Pay via</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "upi", label: "UPI", icon: Smartphone },
              { id: "cash", label: "Cash", icon: Banknote },
              { id: "card", label: "Card", icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPayMethod(id)}
                type="button"
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  payMethod === id
                    ? "border-brand bg-brand/10"
                    : "border-dark-border bg-dark-card hover:border-brand/30"
                }`}
              >
                <Icon className={`w-6 h-6 ${payMethod === id ? "text-brand" : "text-zinc-500"}`} />
                <span
                  className={`text-xs font-semibold ${payMethod === id ? "text-brand" : "text-zinc-400"}`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          {payMethod === "upi" && (
            <div className="bg-brand/10 border border-brand/20 rounded-2xl p-4 text-center">
              <p className="text-sm text-zinc-400 mb-2">Scan at the counter or ask your waiter</p>
              <p className="text-2xl font-display font-bold text-brand">{formatINR(pricing.grandTotal)}</p>
            </div>
          )}
          {(payMethod === "cash" || payMethod === "card") && (
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-2xl p-4">
              <p className="text-sm text-amber-200 font-medium">
                Please inform your waiter to process the {payMethod} payment of{" "}
                <strong>{formatINR(pricing.grandTotal)}</strong>
              </p>
            </div>
          )}
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-green-600/50 text-green-400 font-semibold bg-green-950/30 hover:bg-green-900/40 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share bill on WhatsApp
        </a>

        <div className="bg-dark-card rounded-2xl border border-dark-border p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] text-center">
          <p className="font-semibold text-white mb-1">How was your experience?</p>
          <p className="text-xs text-zinc-400 mb-4">Rate your visit at {bill.restaurant.name}</p>
          {rated ? (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="font-medium text-sm">Thank you for your feedback!</span>
            </div>
          ) : (
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => submitRating(n)}
                  type="button"
                  className={`text-3xl transition-transform active:scale-110 ${
                    n <= rating ? "opacity-100" : "opacity-30 hover:opacity-70"
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-500">Thank you for dining with us 🙏</p>
      </div>
    </div>
  );
}
