"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/frontend/hooks/useCart";
import { useCartPricing } from "@/frontend/hooks/useCartPricing";
import { formatINR } from "@/lib/utils";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, ChevronRight } from "lucide-react";
import { ordersApi } from "@/frontend/api/orders";

export default function CartPage() {
  const params = useParams<{ slug: string; tableId: string }>();
  const router = useRouter();
  const cart   = useCart();
  const { pricing, loading: pricingLoading, error } = useCartPricing(
    cart.state.restaurantId,
    cart.state.items
  );

  if (cart.totalItems === 0) return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6">
      <ShoppingCart className="w-16 h-16 text-zinc-500 opacity-30 mb-4" />
      <h2 className="font-display text-2xl font-semibold text-white mb-2">Your cart is empty</h2>
      <p className="text-zinc-400 text-sm mb-6">Add some dishes from the menu</p>
      <button
        onClick={() => router.push(`/${params.slug}/${params.tableId}`)}
        className="btn-md btn-primary"
      >
        Browse Menu
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark pb-40">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-dark/90 backdrop-blur-md border-b border-dark-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl text-zinc-400 hover:bg-dark-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-semibold text-white">Your Cart</h1>
        <span className="ml-auto text-sm text-zinc-400">{cart.totalItems} items</span>
      </div>

      <div className="px-4 py-5 space-y-3">
        {cart.state.items.map(item => (
          <div key={item.id} className="bg-dark-card rounded-2xl border border-dark-border p-4 flex gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-dark-border" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{item.name}</p>
              <p className="text-brand font-display font-semibold mt-0.5">{formatINR(item.price)}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-2 border-2 border-brand rounded-xl px-2 py-1">
                  <button onClick={() => cart.decrement(item.id)} className="text-brand">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-brand text-sm w-4 text-center">{item.quantity}</span>
                  <button onClick={() => cart.increment(item.id)} className="text-brand">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => cart.removeItem(item.id)} className="text-zinc-500 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Bill summary */}
      <div className="fixed bottom-0 left-0 right-0 bg-dark border-t border-dark-border p-4 space-y-3 safe-bottom">
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span><span>{formatINR(pricing.subtotal)}</span>
          </div>
          {pricing.happyHourDiscount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Happy hour</span><span>-{formatINR(pricing.happyHourDiscount)}</span>
            </div>
          )}
          {pricing.couponDiscount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Coupon</span><span>-{formatINR(pricing.couponDiscount)}</span>
            </div>
          )}
          {pricing.loyaltyDiscount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Loyalty</span><span>-{formatINR(pricing.loyaltyDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-400">
            <span>CGST</span><span>{formatINR(pricing.cgst)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>SGST</span><span>{formatINR(pricing.sgst)}</span>
          </div>
          <div className="flex justify-between font-bold text-white border-t border-dark-border pt-2">
            <span>Total</span>
            <span className="font-display text-lg">{formatINR(pricing.grandTotal)}</span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/${params.slug}/${params.tableId}/orders`)}
          disabled={pricingLoading || Boolean(error)}
          className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-between px-5"
          style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
        >
          <span>Continue to Confirmation</span>
          <div className="flex items-center gap-1">
            <span>{formatINR(pricing.grandTotal)}</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
}
