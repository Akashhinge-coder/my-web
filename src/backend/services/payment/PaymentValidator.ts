import { PaymentHasher } from "./PaymentHasher";
import { ValidationError } from "@/backend/errors/ValidationError";
import { PaymentState } from "./PaymentStateMachine";

export class PaymentValidator {
  /**
   * Validates if a webhook payload matches the internal database records
   * @param expectedAmount The amount stored in our database
   * @param expectedCurrency The currency stored in our database
   * @param receivedAmount The amount received in the webhook (must be in major units, e.g., INR not paise)
   * @param receivedCurrency The currency received in the webhook
   */
  static validateWebhookPayload(
    expectedAmount: number,
    expectedCurrency: string,
    receivedAmount: number,
    receivedCurrency: string
  ): void {
    if (expectedCurrency.toUpperCase() !== receivedCurrency.toUpperCase()) {
      throw new ValidationError(`Currency mismatch: Expected ${expectedCurrency}, got ${receivedCurrency}`);
    }

    // Webhooks might use minor units (like Razorpay). 
    // This assumes the gateway abstraction has already normalized the receivedAmount to major units.
    if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
      throw new ValidationError(`Amount mismatch: Expected ${expectedAmount}, got ${receivedAmount}`);
    }
  }

  /**
   * Validates if a payment is allowed to be completed (captured/paid)
   * @param status Current payment status
   * @param expiresAt Payment expiration timestamp
   * @param billSnapshot The bill snapshot JSON
   * @param billHash The SHA256 hash generated at creation
   */
  static validateForCompletion(
    status: string,
    expiresAt: string | Date,
    billSnapshot: any,
    billHash: string
  ): void {
    if (status !== "pending" && status !== "created" && status !== "authorized") {
      throw new ValidationError(`Cannot complete payment in status: ${status}`);
    }

    if (new Date(expiresAt) < new Date()) {
      throw new ValidationError("Payment has expired");
    }

    if (!PaymentHasher.verifyBillSnapshot(billSnapshot, billHash)) {
      throw new ValidationError("Bill integrity check failed: Snapshot hash mismatch");
    }
  }
}
