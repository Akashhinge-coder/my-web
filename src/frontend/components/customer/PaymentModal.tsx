"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { SessionBill } from "@/frontend/api/orders";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: SessionBill | null;
  restaurantId: string | null;
  onPaymentSuccess: () => void;
}

export function PaymentModal({ isOpen, onClose, bill, restaurantId, onPaymentSuccess }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    // Load Razorpay SDK
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => setError("Failed to load payment gateway");
      document.body.appendChild(script);
    } else {
      setRazorpayLoaded(true);
    }
  }, [isOpen]);

  if (!isOpen || !bill) return null;

  const handlePay = async () => {
    if (!razorpayLoaded) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Create order
      const createOrderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: bill.sessionId,
          restaurantId,
          amount: bill.pricing.grandTotal,
          currency: "INR",
          billSnapshot: bill.orders,
          sessionVersion: (bill as any).sessionVersion || 1, // Safe fallback
        }),
      });

      const createOrderData = await createOrderRes.json();
      
      if (!createOrderRes.ok) {
        throw new Error(createOrderData.error || "Failed to create payment order");
      }

      // 2. Open Razorpay (or simulate if using mock key)
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mock123";

      if (razorpayKey === "rzp_test_mock123") {
        // Simulate a successful payment in dev mode to avoid 401 errors from Razorpay servers
        console.log("Mock Razorpay Key detected, simulating payment success...");
        setTimeout(async () => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: createOrderData.orderId,
                razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(2, 9),
                razorpay_signature: "mock_signature",
                amount: bill.pricing.grandTotal,
                currency: "INR",
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              onPaymentSuccess();
            } else {
              setError(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        }, 1500);
        return;
      }

      // Real Razorpay Flow
      const options = {
        key: razorpayKey, 
        amount: Math.round(bill.pricing.grandTotal * 100), 
        currency: "INR",
        name: bill.restaurant.name,
        description: `Payment for Table ${bill.table.table_number}`,
        order_id: createOrderData.orderId,
        handler: async function (response: any) {
          // 3. Instead of verifying directly, we poll our backend for the final status
          // as per V2 Outbox/Webhook architecture.
          let attempt = 0;
          const pollIntervals = [3000, 6000, 12000, 24000];
          
          const pollStatus = async () => {
            try {
              const res = await fetch(`/api/payments/status?sessionId=${bill.sessionId}`);
              const data = await res.json();
              
              if (data.status === "captured" || data.status === "paid") {
                setLoading(false);
                onPaymentSuccess();
                return;
              }
              
              if (data.status === "failed" || data.status === "cancelled" || data.status === "expired") {
                setError("Payment failed or expired.");
                setLoading(false);
                return;
              }

              if (attempt < pollIntervals.length) {
                setTimeout(pollStatus, pollIntervals[attempt]);
                attempt++;
              } else {
                setError("Payment is being verified. Please don't pay again. Check back in a few minutes.");
                setLoading(false);
              }
            } catch (err) {
              if (attempt < pollIntervals.length) {
                setTimeout(pollStatus, pollIntervals[attempt]);
                attempt++;
              } else {
                setError("Network error while verifying. Please don't pay again.");
                setLoading(false);
              }
            }
          };

          // Start polling
          pollStatus();
        },
        prefill: {
          name: "Guest", // Can populate with participant name if available
        },
        theme: {
          color: "#E8A85F",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response: any) {
         setError(response.error.description || "Payment failed");
         setLoading(false);
      });
      rzp1.open();

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-dark border border-dark-border rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="font-display font-semibold text-lg text-white">Bill Summary</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-dark-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
           {error && (
             <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-sm">
                {error}
             </div>
           )}

           <div className="space-y-3 mb-6">
              {bill.orders.map((o) => (
                 <div key={o.order_number} className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-500 uppercase">Order {o.order_number}</div>
                    {o.items.map((item, idx) => (
                       <div key={idx} className="flex justify-between text-sm text-zinc-300">
                          <span>{item.quantity}× {item.item_name}</span>
                          <span>{formatINR(item.unit_price * item.quantity)}</span>
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
              <div className="flex justify-between">
                 <span>GST</span>
                 <span>{formatINR(bill.pricing.gst)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2">
                 <span>Total Amount</span>
                 <span>{formatINR(bill.pricing.grandTotal)}</span>
              </div>
           </div>
        </div>

        <div className="p-4 border-t border-dark-border bg-dark/50">
           <button
             onClick={handlePay}
             disabled={loading || !razorpayLoaded}
             className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
             style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
           >
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pay via Online Gateway"}
           </button>
        </div>
      </div>
    </div>
  );
}
