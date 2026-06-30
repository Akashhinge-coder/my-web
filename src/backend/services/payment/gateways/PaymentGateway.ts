export interface PaymentGateway {
  /**
   * Creates a payment intent/order on the gateway's side.
   * @param amount Amount in major currency units (e.g. 100.50 INR)
   * @param currency Currency code (e.g. INR)
   * @param metadata Additional metadata for the gateway
   * @returns The gateway's native order ID (e.g. order_xxx)
   */
  createPaymentIntent(amount: number, currency: string, metadata?: Record<string, string>): Promise<string>;

  /**
   * Verifies the cryptographic signature of an incoming webhook payload.
   * @param payload The raw JSON payload string
   * @param signature The signature header from the gateway
   * @returns boolean true if signature is valid
   */
  verifyWebhook(payload: string, signature: string): boolean;

  /**
   * Fetches the current status of a payment directly from the gateway.
   * @param paymentId The gateway's payment ID
   */
  fetchPayment(paymentId: string): Promise<{ status: string; amount: number; currency: string }>;

  /**
   * Cancels a pending payment intent.
   * @param orderId The gateway's order ID
   */
  cancelPaymentIntent(orderId: string): Promise<void>;

  /**
   * Initiates a refund for a captured payment.
   * @param paymentId The gateway's payment ID
   * @param amount Optional partial amount. If undefined, full refund.
   */
  refundPayment(paymentId: string, amount?: number): Promise<string>;
}
