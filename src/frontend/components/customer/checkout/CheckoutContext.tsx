"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SessionBill } from "@/frontend/api/orders";

export type PaymentMethodId = "upi" | "card" | "cash";

export interface PaymentMethodOption {
  id: PaymentMethodId;
  title: string;
  enabled: boolean;
  description?: string;
}

export type CheckoutUIState = 
  | "IDLE"
  | "CREATING_PAYMENT"
  | "READY_FOR_GATEWAY"
  | "GATEWAY_OPEN"
  | "VERIFYING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "PENDING_RECOVERY"
  | "CONFIRM_CANCEL"
  | "CASH_REQUESTED";

interface CheckoutContextValue {
  bill: SessionBill | null;
  restaurantId: string | null;
  
  // UI State
  currentState: CheckoutUIState;
  isDrawerOpen: boolean;
  isOffline: boolean;
  
  // Domain State
  selectedPaymentMethod: PaymentMethodId | null;
  paymentOrderId: string | null;
  activePaymentId: string | null;
  errorMessage: string | null;

  // Actions
  openCheckout: (bill: SessionBill, restaurantId: string) => void;
  setBill: (bill: SessionBill) => void;
  closeCheckout: () => void;
  selectPaymentMethod: (method: PaymentMethodId) => void;
  initiatePayment: () => Promise<void>;
  handleGatewayOpened: () => void;
  handleGatewayClosed: () => void;
  handleGatewayFailed: (errorMessage: string) => void;
  startVerification: () => void;
  requestCancel: () => void;
  abortCancel: () => void;
  confirmCancel: () => Promise<void>;
  retryPayment: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined);

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "upi", title: "UPI App (GPay, PhonePe)", enabled: true, description: "Fastest • Zero fees" },
  { id: "card", title: "Cards & Netbanking", enabled: true },
  { id: "cash", title: "Pay with Cash", enabled: true, description: "Waiter will collect" },
];

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  const [currentState, setCurrentState] = useState<CheckoutUIState>("IDLE");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodId | null>("upi");
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Restore state from LocalStorage if browser refreshed
  useEffect(() => {
    if (!bill) return;
    const key = `menuara_checkout_${bill.sessionId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Only recover if it was in a pending or verifying state
        if (["GATEWAY_OPEN", "VERIFYING", "READY_FOR_GATEWAY", "PENDING_RECOVERY", "CASH_REQUESTED"].includes(parsed.currentState)) {
           setPaymentOrderId(parsed.paymentOrderId);
           setActivePaymentId(parsed.activePaymentId);
           setSelectedPaymentMethod(parsed.selectedPaymentMethod);
           setCurrentState(parsed.currentState === "CASH_REQUESTED" ? "CASH_REQUESTED" : "PENDING_RECOVERY");
           setIsDrawerOpen(true);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [bill]);

  // Sync important state to LocalStorage
  useEffect(() => {
    if (bill && currentState !== "IDLE" && currentState !== "SUCCESS" && currentState !== "FAILED" && currentState !== "CANCELLED" && currentState !== "EXPIRED") {
       localStorage.setItem(`menuara_checkout_${bill.sessionId}`, JSON.stringify({
         currentState,
         paymentOrderId,
         activePaymentId,
         selectedPaymentMethod
       }));
    } else if (bill) {
       localStorage.removeItem(`menuara_checkout_${bill.sessionId}`);
    }
  }, [bill, currentState, paymentOrderId, activePaymentId, selectedPaymentMethod]);

  const openCheckout = useCallback((b: SessionBill, rId: string) => {
    setBill(b);
    setRestaurantId(rId);
    setIsDrawerOpen(true);
    setCurrentState("IDLE");
    setErrorMessage(null);
  }, []);

  const closeCheckout = useCallback(() => {
    if (["CREATING_PAYMENT", "GATEWAY_OPEN", "VERIFYING", "CASH_REQUESTED"].includes(currentState)) {
      // Don't fully close if in active transition, just hide the drawer for a sec?
      // Actually, if they try to close the drawer while pending, we should confirm.
      setCurrentState("CONFIRM_CANCEL");
      return;
    }
    setIsDrawerOpen(false);
  }, [currentState]);

  const selectPaymentMethod = useCallback((method: PaymentMethodId) => {
    setSelectedPaymentMethod(method);
  }, []);

  const initiatePayment = async () => {
    if (!bill || !restaurantId || !selectedPaymentMethod || isOffline) return;
    
    setCurrentState("CREATING_PAYMENT");
    setErrorMessage(null);

    try {
      if (selectedPaymentMethod === "cash") {
         const res = await fetch("/api/payments/cash-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               sessionId: bill.sessionId,
               restaurantId,
               amount: bill.pricing.grandTotal,
               currency: "INR",
               billSnapshot: bill,
               sessionVersion: (bill as any).sessionVersion || 1,
            })
         });
         
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Failed to notify staff");
         
         setActivePaymentId(data.payment.id);
         setCurrentState("CASH_REQUESTED"); // Move to new state
         startVerification(); // Begin polling
         return;
      }

      // Online Payment Flow
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: bill.sessionId,
          restaurantId,
          amount: bill.pricing.grandTotal,
          currency: "INR",
          billSnapshot: bill,
          sessionVersion: (bill as any).sessionVersion || 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize payment");

      if (data.recovered) {
        // Recovered an existing pending payment
        setPaymentOrderId(data.orderId);
        setActivePaymentId(data.payment.id);
        setCurrentState("PENDING_RECOVERY");
      } else {
        setPaymentOrderId(data.orderId);
        setActivePaymentId(data.payment.id);
        setCurrentState("READY_FOR_GATEWAY");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create payment");
      setCurrentState("FAILED");
    }
  };

  const handleGatewayOpened = () => setCurrentState("GATEWAY_OPEN");
  
  const handleGatewayClosed = () => {
    // If closed without success, it's either cancelled or pending
    setCurrentState("PENDING_RECOVERY");
  };

  const handleGatewayFailed = (err: string) => {
    setErrorMessage(err);
    setCurrentState("FAILED");
  };

  const startVerification = useCallback(() => {
    setCurrentState(prev => prev === "CASH_REQUESTED" ? "CASH_REQUESTED" : "VERIFYING");
    
    let attempt = 0;
    const pollIntervals = [3000, 6000, 12000, 24000, 30000];
    const MAX_ATTEMPTS = 60; // Up to ~30 minutes of polling
    
    const pollStatus = async () => {
      try {
        const timestamp = Date.now();
        const res = await fetch(`/api/payments/status?sessionId=${bill?.sessionId}&t=${timestamp}`, { cache: "no-store" });
        const data = await res.json();
        
        if (data.status === "captured" || data.status === "paid") {
          setCurrentState("SUCCESS");
          return;
        }
        if (data.status === "expired") {
          setCurrentState("EXPIRED");
          return;
        }
        if (data.status === "cancelled") {
          setCurrentState("CANCELLED");
          return;
        }
        if (data.status === "failed") {
          setCurrentState("FAILED");
          return;
        }

        // Still pending
        if (attempt < MAX_ATTEMPTS) {
          const nextInterval = attempt < pollIntervals.length ? pollIntervals[attempt] : 30000;
          setTimeout(pollStatus, nextInterval);
          attempt++;
        } else {
          // Polling exhausted, remain in state to let them cancel or retry
          setCurrentState(prev => prev === "CASH_REQUESTED" ? "CASH_REQUESTED" : "PENDING_RECOVERY");
        }
      } catch (err) {
        if (attempt < MAX_ATTEMPTS) {
          const nextInterval = attempt < pollIntervals.length ? pollIntervals[attempt] : 30000;
          setTimeout(pollStatus, nextInterval);
          attempt++;
        } else {
          setCurrentState(prev => prev === "CASH_REQUESTED" ? "CASH_REQUESTED" : "PENDING_RECOVERY");
        }
      }
    };
    
    pollStatus();
  }, [bill?.sessionId]);

  const requestCancel = () => {
    setCurrentState("CONFIRM_CANCEL");
  };

  const abortCancel = () => {
    setCurrentState("PENDING_RECOVERY");
  };

  const confirmCancel = async () => {
    setCurrentState("CREATING_PAYMENT"); // Show loader
    try {
      if (activePaymentId && selectedPaymentMethod === "cash") {
        await fetch(`/api/payments/cash-cancel`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: activePaymentId, checkoutId: bill?.sessionId })
        });
      }
      setPaymentOrderId(null);
      setActivePaymentId(null);
      setCurrentState("IDLE"); // Reset completely
    } catch (err) {
      setCurrentState(selectedPaymentMethod === "cash" ? "CASH_REQUESTED" : "PENDING_RECOVERY");
    }
  };

  const retryPayment = () => {
    setErrorMessage(null);
    setCurrentState("IDLE");
  };

  const value: CheckoutContextValue = {
    bill,
    restaurantId,
    currentState,
    isDrawerOpen,
    isOffline,
    selectedPaymentMethod,
    paymentOrderId,
    activePaymentId,
    errorMessage,
    openCheckout,
    setBill,
    closeCheckout,
    selectPaymentMethod,
    initiatePayment,
    handleGatewayOpened,
    handleGatewayClosed,
    handleGatewayFailed,
    startVerification,
    requestCancel,
    abortCancel,
    confirmCancel,
    retryPayment,
  };

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}
