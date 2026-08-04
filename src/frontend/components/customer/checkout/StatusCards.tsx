"use client";

import { useCheckout } from "./CheckoutContext";
import { Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export function PendingCard() {
  const { requestCancel, startVerification } = useCheckout();

  return (
    <div className="bg-dark border border-dark-border rounded-2xl p-6 text-center space-y-4">
      <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
      <h3 className="font-display font-semibold text-lg text-white">Payment in Progress</h3>
      <p className="text-zinc-400 text-sm">
        Payment is still being verified. Don't pay again. If you've already completed the payment, this screen will update automatically.
      </p>
      
      <div className="pt-4 space-y-3">
        <button 
          onClick={startVerification}
          className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Check Status
        </button>
        <button 
          onClick={requestCancel}
          className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors"
        >
          Cancel Payment
        </button>
        <button className="w-full py-3 text-zinc-500 hover:text-zinc-300 text-xs">
          Need Help?
        </button>
      </div>
    </div>
  );
}

export function ConfirmCancelCard() {
  const { abortCancel, confirmCancel } = useCheckout();

  return (
    <div className="bg-dark border border-dark-border rounded-2xl p-6 text-center space-y-4">
      <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="font-display font-semibold text-lg text-white">Cancel Payment?</h3>
      <p className="text-zinc-400 text-sm">
        Are you sure you want to cancel? Any amount deducted will be automatically refunded by your bank within 3-5 days.
      </p>
      
      <div className="pt-4 flex gap-3">
        <button 
          onClick={abortCancel}
          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
        >
          No, Go Back
        </button>
        <button 
          onClick={confirmCancel}
          className="flex-1 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-sm font-medium transition-colors"
        >
          Yes, Cancel
        </button>
      </div>
    </div>
  );
}

export function VerificationCard() {
  return (
    <div className="bg-dark border border-dark-border rounded-2xl p-6 space-y-6">
      <div className="text-center space-y-2">
        <h3 className="font-display font-semibold text-lg text-white">Verifying payment...</h3>
        <p className="text-zinc-400 text-sm">This usually takes a few seconds.</p>
      </div>
      
      <div className="space-y-4 pl-4">
        <div className="flex items-center gap-3 text-zinc-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-brand" />
          <span>Waiting for payment gateway</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-brand" />
          <span>Checking payment status</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-400 text-sm animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Confirming with restaurant</span>
        </div>
      </div>
    </div>
  );
}

export function SuccessCard() {
  const { closeCheckout } = useCheckout();
  return (
    <div className="bg-dark border border-dark-border rounded-2xl p-6 text-center space-y-4">
      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="font-display font-semibold text-2xl text-white">Payment Successful</h3>
      <p className="text-zinc-400 text-sm">
        Your payment has been confirmed. Thank you!
      </p>
      <button 
        onClick={closeCheckout}
        className="w-full py-3.5 mt-4 rounded-xl text-white font-semibold"
        style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
      >
        Done
      </button>
    </div>
  );
}

export function FailureCard() {
  const { retryPayment, currentState } = useCheckout();
  
  let title = "Payment Failed";
  let message = "Something went wrong with your payment. Please try again.";
  
  if (currentState === "EXPIRED") {
    title = "Session Expired";
    message = "This payment session expired. Start a new payment to continue.";
  } else if (currentState === "CANCELLED") {
    title = "Payment Cancelled";
    message = "You cancelled the payment request.";
  }
  
  return (
    <div className="bg-dark border border-dark-border rounded-2xl p-6 text-center space-y-4">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
        <XCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="font-display font-semibold text-xl text-white">{title}</h3>
      <p className="text-zinc-400 text-sm">{message}</p>
      
      <button 
        onClick={retryPayment}
        className="w-full py-3 mt-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

export function CashRequestCard() {
  const { requestCancel } = useCheckout();
  
  return (
    <div className="bg-dark border border-dark-border rounded-2xl p-6 text-center space-y-4">
      <div className="w-12 h-12 bg-[#34d399]/10 rounded-full flex items-center justify-center mx-auto mb-2">
        <CheckCircle2 className="w-6 h-6 text-[#34d399]" />
      </div>
      <h3 className="font-display font-semibold text-lg text-white">Cash payment requested</h3>
      
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2 mt-4 mb-4">
        <p className="text-zinc-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
          A waiter has been notified.
        </p>
        <p className="text-zinc-300 text-sm pl-6">
          Please keep the exact amount ready.
        </p>
        <div className="pt-2 flex items-center justify-between border-t border-white/10 mt-2">
          <span className="text-zinc-500 text-xs font-medium">Estimated arrival</span>
          <span className="text-zinc-300 text-sm font-semibold">1-3 minutes</span>
        </div>
      </div>
      
      <div className="pt-2 space-y-3">
        <button 
          onClick={requestCancel}
          className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors border border-red-500/20"
        >
          Cancel Request
        </button>
        <button className="w-full py-3 text-zinc-500 hover:text-zinc-300 text-xs">
          Need Help?
        </button>
      </div>
    </div>
  );
}
