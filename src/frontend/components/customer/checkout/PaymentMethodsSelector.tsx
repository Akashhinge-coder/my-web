"use client";

import { useCheckout, PAYMENT_METHODS, PaymentMethodId } from "./CheckoutContext";
import { CheckCircle2, ChevronRight, Coins, CreditCard, Smartphone } from "lucide-react";

const getIconForMethod = (id: PaymentMethodId) => {
  switch (id) {
    case "upi": return <Smartphone className="w-5 h-5" />;
    case "card": return <CreditCard className="w-5 h-5" />;
    case "cash": return <Coins className="w-5 h-5" />;
  }
};

export function PaymentMethodsSelector() {
  const { selectedPaymentMethod, selectPaymentMethod } = useCheckout();

  return (
    <div className="space-y-3">
      <h3 className="font-display font-medium text-white/90 text-sm px-1">Choose Payment Method</h3>
      
      <div className="space-y-2">
        {PAYMENT_METHODS.filter(m => m.enabled).map((method) => {
          const isSelected = selectedPaymentMethod === method.id;
          
          return (
            <button
              key={method.id}
              onClick={() => selectPaymentMethod(method.id)}
              className={`w-full text-left flex items-center p-4 rounded-xl border transition-all duration-200 ${
                isSelected 
                  ? "bg-brand/10 border-brand" 
                  : "bg-dark border-dark-border hover:bg-dark-secondary"
              }`}
            >
              <div className={`p-2 rounded-full mr-3 ${isSelected ? 'bg-brand/20 text-brand' : 'bg-dark-secondary text-zinc-400'}`}>
                {getIconForMethod(method.id)}
              </div>
              
              <div className="flex-1">
                <div className={`font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                  {method.title}
                </div>
                {method.description && (
                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-brand/80' : 'text-zinc-500'}`}>
                    {method.description}
                  </div>
                )}
              </div>

              <div className="ml-2">
                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-brand" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-dark-border" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
