"use client";

import { useEffect, useState } from "react";
import { useCheckout } from "./CheckoutContext";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function GatewayLauncher() {
  const { 
    currentState, 
    bill, 
    paymentOrderId, 
    selectedPaymentMethod,
    handleGatewayOpened, 
    handleGatewayClosed,
    handleGatewayFailed,
    startVerification
  } = useCheckout();

  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Only load the script if we might need it
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => setRazorpayLoaded(true);
      document.body.appendChild(script);
    } else {
      setRazorpayLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (currentState === "READY_FOR_GATEWAY" && razorpayLoaded && paymentOrderId && bill) {
      launchGateway();
    }
  }, [currentState, razorpayLoaded, paymentOrderId, bill]);

  const launchGateway = () => {
    if (!window.Razorpay) return;

    handleGatewayOpened();

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mock123";

    if (razorpayKey === "rzp_test_mock123") {
      // Mock flow
      console.log("Mock Razorpay Key detected. Opening Mock Simulator...");
      const scenario = window.prompt(
        "MOCK SCENARIO SELECTOR\n\n" +
        "1: Success (Instant)\n" +
        "2: Success (Delayed Webhook - 10s)\n" +
        "3: Failed (Gateway Rejection)\n" +
        "4: Cancelled (User closed popup)\n" +
        "5: Stuck (Pending Recovery)\n" +
        "6: Network Offline Simulation\n" +
        "7: Gateway Timeout Simulation\n\n" +
        "Enter a number:"
      );

      switch (scenario) {
        case "1": // Success Instant
          setTimeout(() => startVerification(), 500);
          fetch("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify({ razorpay_order_id: paymentOrderId, razorpay_payment_id: "mock_" + Date.now(), amount: bill!.pricing.grandTotal, currency: "INR" })
          });
          break;
        
        case "2": // Delayed Webhook
          setTimeout(() => startVerification(), 500);
          // The backend mock `/api/payments/verify` would need to sleep if we implemented it there, 
          // but for frontend purposes, the verifier will poll and eventually succeed if we delay the verify call
          setTimeout(() => {
             fetch("/api/payments/verify", {
               method: "POST",
               body: JSON.stringify({ razorpay_order_id: paymentOrderId, razorpay_payment_id: "mock_" + Date.now(), amount: bill!.pricing.grandTotal, currency: "INR" })
             });
          }, 8000); 
          break;
          
        case "3": // Failed
          setTimeout(() => handleGatewayFailed("Payment declined by test bank."), 1000);
          break;
          
        case "4": // Cancelled
          setTimeout(() => handleGatewayClosed(), 500);
          break;
          
        case "5": // Stuck (Pending Recovery)
          // Simulate the user abruptly refreshing the page
          window.location.reload();
          break;
          
        case "6": // Network Offline
          alert("Turn off your Wi-Fi/Network in DevTools to test offline mode.");
          break;
          
        case "7": // Gateway Timeout
          setTimeout(() => handleGatewayFailed("Gateway connection timed out."), 5000);
          break;
          
        default:
          handleGatewayClosed();
      }
      return;
    }

    const options: any = {
      key: razorpayKey,
      amount: Math.round(bill!.pricing.grandTotal * 100),
      currency: "INR",
      name: bill!.restaurant.name,
      description: `Payment for Table ${bill!.table.table_number}`,
      order_id: paymentOrderId,
      handler: function (response: any) {
        // User completed payment in gateway, start verification
        startVerification();
      },
      modal: {
        ondismiss: function() {
          // User closed the popup manually
          handleGatewayClosed();
        }
      },
      theme: {
        color: "#E8A85F",
      },
    };

    // Explicitly configure Razorpay based on user's selection in our UI
    if (selectedPaymentMethod === "upi") {
      options.prefill = { method: "upi" };
    } else if (selectedPaymentMethod === "card") {
      options.prefill = { method: "card" };
    }

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
       handleGatewayFailed(response.error.description || "Payment failed");
    });
    rzp.open();
  };

  return null; // This component doesn't render anything visible
}
