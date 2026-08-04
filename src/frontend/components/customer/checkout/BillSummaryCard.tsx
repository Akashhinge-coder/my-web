"use client";

import { useCheckout } from "./CheckoutContext";
import { formatINR } from "@/lib/utils";

export function BillSummaryCard() {
  const { bill } = useCheckout();

  if (!bill) return null;

  return (
    <div className="bg-dark border border-dark-border rounded-2xl p-5 space-y-4 shadow-sm">
      <h3 className="font-display font-semibold text-white/90">Bill Summary</h3>
      
      <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
        {bill.orders.map((o) => (
          <div key={o.order_number} className="space-y-1">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Order {o.order_number}</div>
            {o.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm text-zinc-300">
                <span className="flex-1 pr-4">{item.quantity}× {item.item_name}</span>
                <span className="shrink-0">{formatINR(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="border-t border-dashed border-dark-border pt-4 space-y-2 text-sm text-zinc-400">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatINR(bill.pricing.subtotal)}</span>
        </div>
        {bill.pricing.happyHourDiscount > 0 && (
          <div className="flex justify-between text-green-500">
            <span>Happy hour</span>
            <span>-{formatINR(bill.pricing.happyHourDiscount)}</span>
          </div>
        )}
        {bill.pricing.couponDiscount > 0 && (
          <div className="flex justify-between text-green-500">
            <span>Coupon</span>
            <span>-{formatINR(bill.pricing.couponDiscount)}</span>
          </div>
        )}
        {bill.pricing.loyaltyDiscount > 0 && (
          <div className="flex justify-between text-green-400">
            <span>Loyalty</span>
            <span>-{formatINR(bill.pricing.loyaltyDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Taxes</span>
          <span>{formatINR(bill.pricing.gst)}</span>
        </div>
        <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-dark-border">
          <span>Total Amount</span>
          <span>{formatINR(bill.pricing.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
