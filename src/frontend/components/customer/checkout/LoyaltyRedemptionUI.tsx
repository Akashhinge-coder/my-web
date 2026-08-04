"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useCheckout } from "./CheckoutContext";
import { ordersApi } from "@/frontend/api/orders";
import { Star, Loader2, Phone } from "lucide-react";
import { formatINR } from "@/lib/utils";

export function LoyaltyRedemptionUI() {
  const { slug, tableId } = useParams<{ slug: string; tableId: string }>();
  const { bill, setBill } = useCheckout();
  
  const [phone, setPhone] = useState("");
  const [points, setPoints] = useState("");
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [error, setError] = useState("");

  if (!bill) return null;

  const appliedLoyaltyDiscount = bill.pricing.loyaltyDiscount || 0;

  const handleApply = async () => {
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    
    const pointsToRedeem = parseInt(points, 10);
    if (!pointsToRedeem || pointsToRedeem <= 0) {
      setError("Please enter a valid amount of points to redeem");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const newBill = await ordersApi.getBill(slug, tableId, phone, pointsToRedeem);
      setBill(newBill);
    } catch (err: any) {
      setError(err.message || "Failed to apply loyalty points");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setLoading(true);
      setError("");
      // Fetch fresh bill without loyalty params
      const newBill = await ordersApi.getBill(slug, tableId);
      setBill(newBill);
      setPoints("");
    } catch (err: any) {
      setError(err.message || "Failed to remove loyalty points");
    } finally {
      setLoading(false);
    }
  };

  if (appliedLoyaltyDiscount > 0) {
    return (
      <div className="mt-4 p-4 rounded-2xl bg-green-950/20 border border-green-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Star className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-400">Loyalty Points Applied</p>
              <p className="text-xs text-green-500/70">-{formatINR(appliedLoyaltyDiscount)} off your bill</p>
            </div>
          </div>
          <button 
            onClick={handleRemove}
            disabled={loading}
            className="text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-full bg-dark-secondary"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 rounded-2xl bg-dark-secondary/50 border border-dark-border">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-brand" />
        <h3 className="font-semibold text-white text-sm">Pay with Loyalty Points</h3>
      </div>
      
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setAvailablePoints(null); // Reset on change
              }}
              className="w-full bg-dark border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
            />
          </div>
          {availablePoints === null && (
            <button
              onClick={async () => {
                if (!phone || phone.length < 10) {
                  setError("Enter a valid phone number to check balance");
                  return;
                }
                try {
                  setCheckingBalance(true);
                  setError("");
                  const res = await fetch(`/api/v1/loyalty/balance?slug=${slug}&phone=${phone}`);
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  setAvailablePoints(data.availablePoints);
                } catch (err: any) {
                  setError(err.message || "Failed to check balance");
                } finally {
                  setCheckingBalance(false);
                }
              }}
              disabled={checkingBalance || !phone}
              className="bg-dark-tertiary text-zinc-300 px-4 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            >
              {checkingBalance ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check Points"}
            </button>
          )}
        </div>
        
        {availablePoints !== null && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="number"
                placeholder={`Points to redeem (Max: ${availablePoints})`}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                max={availablePoints}
                className="w-full bg-dark border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-brand focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleApply}
              disabled={loading || !phone || !points || parseInt(points, 10) > availablePoints}
              className="bg-brand text-white px-4 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center min-w-[80px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </button>
          </div>
        )}
        {availablePoints !== null && (
          <p className="text-xs text-brand font-medium ml-1">You have {availablePoints} points available.</p>
        )}
      </div>
    </div>
  );
}
