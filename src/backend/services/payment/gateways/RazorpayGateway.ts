import crypto from "crypto";
import { PaymentGateway, GatewayConfig } from "./PaymentGateway";

export class RazorpayGateway implements PaymentGateway {
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, string>): Promise<string> {
    if (this.config.mode === 'TEST' && this.config.keyId === "rzp_test_mock123") {
      return "order_mock_" + Math.random().toString(36).substring(2, 9);
    }
    
    const amountInSubunits = Math.round(amount * 100);

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        amount: amountInSubunits,
        currency,
        notes: metadata,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Razorpay create order failed: ${err.error?.description || "Unknown error"}`);
    }

    const data = await res.json();
    return data.id;
  }

  async fetchOrder(orderId: string): Promise<{ status: string; paymentId?: string }> {
    if (this.config.mode === 'TEST' && this.config.keyId === "rzp_test_mock123") {
      return { status: "paid", paymentId: "mock_payment_" + Math.random().toString(36).substring(2, 9) };
    }

    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64"),
      }
    });

    if (!res.ok) {
      throw new Error(`Razorpay fetch order failed: ${res.statusText}`);
    }

    const data = await res.json();
    return { status: data.status, paymentId: data.payments?.items?.[0]?.id };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    if (this.config.mode === 'TEST' && this.config.keySecret === "mock_secret") return true;

    // 1. Try Current Secret
    const currentSecret = this.config.webhookSecret || this.config.keySecret;
    const expectedCurrentSignature = crypto
      .createHmac("sha256", currentSecret)
      .update(payload)
      .digest("hex");

    if (expectedCurrentSignature === signature) {
      return true;
    }

    // 2. Try Previous Secret (Grace Period Fallback)
    if (this.config.previousValidUntil && this.config.previousValidUntil.getTime() > Date.now()) {
      const previousSecret = this.config.previousWebhookSecret || this.config.previousKeySecret;
      if (previousSecret) {
        const expectedPreviousSignature = crypto
          .createHmac("sha256", previousSecret)
          .update(payload)
          .digest("hex");
          
        if (expectedPreviousSignature === signature) {
          return true;
        }
      }
    }

    return false;
  }

  async fetchPayment(paymentId: string): Promise<{ status: string; amount: number; currency: string }> {
    if (paymentId.startsWith("pay_mock_")) {
      return { status: "captured", amount: 0, currency: "INR" }; // mock fallback
    }

    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64"),
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch Razorpay payment");
    }

    const data = await res.json();
    return {
      status: data.status,
      amount: data.amount / 100, // convert back to major units
      currency: data.currency,
    };
  }

  async cancelPaymentIntent(orderId: string): Promise<void> {
    return Promise.resolve();
  }

  async refundPayment(paymentId: string, amount?: number): Promise<string> {
    if (paymentId.startsWith("pay_mock_")) {
      return "rfnd_mock_" + Math.random().toString(36).substring(2, 9);
    }

    const body: Record<string, any> = {};
    if (amount) {
      body.amount = Math.round(amount * 100);
    }

    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64"),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error("Refund failed");
    }

    const data = await res.json();
    return data.id;
  }

  async testConnection(): Promise<{ merchantName?: string; status?: string; [key: string]: any }> {
    if (this.config.mode === 'TEST' && this.config.keyId === 'rzp_test_mock123') {
      return { merchantName: 'Mock Sandbox Merchant', status: 'ACTIVE' };
    }
    
    // We can call /v1/orders with amount 0 or just a generic authenticated fetch to Razorpay if possible.
    // Razorpay doesn't have a strict "whoami" endpoint for standard merchants, but /v1/customers or /v1/orders?count=1 works to verify auth.
    const res = await fetch("https://api.razorpay.com/v1/orders?count=1", {
      headers: {
        Authorization: "Basic " + Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64"),
      }
    });

    if (!res.ok) {
      throw new Error("Razorpay connection failed. Invalid Key ID or Secret.");
    }
    
    return { status: "ACTIVE", mode: this.config.keyId.startsWith("rzp_test_") ? "TEST" : "LIVE" };
  }

  supportsRefund(): boolean {
    return true;
  }

  supportsPartialRefund(): boolean {
    return true;
  }

  supportsCapture(): boolean {
    return true; // Razorpay supports two-step capture
  }
}

