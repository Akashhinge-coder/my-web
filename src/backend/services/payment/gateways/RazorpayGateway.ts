import crypto from "crypto";
import { PaymentGateway } from "./PaymentGateway";

export class RazorpayGateway implements PaymentGateway {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mock123";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "mock_secret";
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, string>): Promise<string> {
    if (this.keyId === "rzp_test_mock123") {
      return "order_mock_" + Math.random().toString(36).substring(2, 9);
    }
    
    // Convert to minor units (paise)
    const amountInSubunits = Math.round(amount * 100);

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64"),
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

  verifyWebhook(payload: string, signature: string): boolean {
    if (this.keySecret === "mock_secret") return true;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || this.keySecret)
      .update(payload)
      .digest("hex");

    return expectedSignature === signature;
  }

  async fetchPayment(paymentId: string): Promise<{ status: string; amount: number; currency: string }> {
    if (paymentId.startsWith("pay_mock_")) {
      return { status: "captured", amount: 0, currency: "INR" }; // mock fallback
    }

    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64"),
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
    // Razorpay orders cannot be explicitly cancelled via API in most cases, they just expire.
    // However, if we need to implement it, we would do it here.
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
        Authorization: "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64"),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error("Refund failed");
    }

    const data = await res.json();
    return data.id;
  }
}
