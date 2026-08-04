"use client";

import { X, Loader2, WifiOff } from "lucide-react";
import { useCheckout } from "./CheckoutContext";
import { BillSummaryCard } from "./BillSummaryCard";
import { PaymentMethodsSelector } from "./PaymentMethodsSelector";
import { GatewayLauncher } from "./GatewayLauncher";
import { PendingCard, VerificationCard, SuccessCard, FailureCard, ConfirmCancelCard, CashRequestCard } from "./StatusCards";
import { PaymentsHistory } from "./PaymentsHistory";
import { LoyaltyRedemptionUI } from "./LoyaltyRedemptionUI";

export function CheckoutDrawer() {
  const { 
    isDrawerOpen, 
    closeCheckout, 
    currentState, 
    initiatePayment, 
    isOffline,
    selectedPaymentMethod
  } = useCheckout();

  if (!isDrawerOpen) return null;

  const renderContent = () => {
    switch (currentState) {
      case "IDLE":
        return (
          <>
            <BillSummaryCard />
            <LoyaltyRedemptionUI />
            <div className="pt-4">
              <PaymentMethodsSelector />
            </div>
            
            {/* If there's an offline state, show banner */}
            {isOffline && (
              <div className="mt-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm text-red-200">
                  <div className="font-medium text-red-400">You're offline.</div>
                  Reconnect to continue your payment.
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={initiatePayment}
                disabled={isOffline || !selectedPaymentMethod}
                className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", boxShadow: "0 4px 20px rgba(245, 158, 11, 0.35)" }}
              >
                Proceed to Pay
              </button>
            </div>
            
            {/* Placeholder for history in a real app this would fetch the actual payments */}
            <PaymentsHistory payments={[]} />
          </>
        );
        
      case "CREATING_PAYMENT":
      case "READY_FOR_GATEWAY":
      case "GATEWAY_OPEN":
        // Show a loader overlay while the gateway is launching or we are talking to the backend
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
            <p className="text-zinc-400 text-sm">Setting up secure payment...</p>
          </div>
        );

      case "VERIFYING":
        return <VerificationCard />;
        
      case "CASH_REQUESTED":
        return <CashRequestCard />;
        
      case "PENDING_RECOVERY":
        return <PendingCard />;
        
      case "CONFIRM_CANCEL":
        return <ConfirmCancelCard />;
        
      case "SUCCESS":
        return <SuccessCard />;
        
      case "FAILED":
      case "CANCELLED":
      case "EXPIRED":
        return <FailureCard />;
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-dark border-t sm:border border-dark-border rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="font-display font-semibold text-lg text-white">Checkout</h2>
          <button 
            onClick={closeCheckout} 
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-dark-secondary transition-colors"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
      
      {/* Invisible launcher that handles Razorpay JS lifecycle based on context state */}
      <GatewayLauncher />
    </div>
  );
}
