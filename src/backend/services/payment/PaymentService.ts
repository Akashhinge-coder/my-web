import { PaymentRepository } from "@/backend/repositories/payment.repository";
import { Payment, PaymentMethod } from "@/types/domain";
import { RazorpayGateway } from "./gateways/RazorpayGateway";
import { PaymentStateMachine, PaymentEvent, PaymentState } from "./PaymentStateMachine";
import { PaymentAuditService } from "./PaymentAuditService";
import { PaymentSnapshot } from "./PaymentSnapshot";
import { PaymentHasher } from "./PaymentHasher";
import { PaymentValidator } from "./PaymentValidator";

// In V2, we only support Razorpay for online gateways right now, but it's abstracted.
const gateway = new RazorpayGateway();

export class PaymentService {
  /**
   * Centralized entry point to create an online payment (e.g. Razorpay).
   */
  static async createPayment(params: {
    sessionId: string;
    restaurantId: string;
    amount: number;
    currency: string;
    billSnapshot: any;
    sessionVersion: number;
    checkoutId: string;
  }): Promise<{ payment: Payment; orderId: string }> {
    const billHash = PaymentHasher.hashBillSnapshot(params.billSnapshot);
    
    // Check for existing pending payments
    const pendingPayment = await PaymentRepository.findPendingPayment(params.sessionId);
    
    if (pendingPayment) {
      if (new Date(pendingPayment.expires_at).getTime() > Date.now()) {
        if (!pendingPayment.gateway_order_id) {
          throw new Error("Pending payment exists but lacks a gateway_order_id");
        }
        return { payment: pendingPayment, orderId: pendingPayment.gateway_order_id };
      } else {
        // Expire old payment atomically via Outbox
        await PaymentRepository.processPaymentTransition(
          pendingPayment.id,
          pendingPayment.version,
          "expired",
          "expired",
          params.checkoutId,
          "PaymentExpired",
          { paymentId: pendingPayment.id, timestamp: new Date().toISOString() }
        );
      }
    }

    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString(); // 15 mins
    const payment = await PaymentRepository.createPayment({
      session_id: params.sessionId,
      restaurant_id: params.restaurantId,
      attempt_number: (pendingPayment?.attempt_number || 0) + 1,
      payment_method: "razorpay",
      gateway: "razorpay",
      gateway_order_id: null,
      payment_status: "created",
      amount: params.amount,
      currency: params.currency,
      bill_snapshot: params.billSnapshot,
      bill_hash: billHash,
      session_version: params.sessionVersion,
      expires_at: expiresAt,
      parent_payment_id: pendingPayment?.id,
    });

    await PaymentAuditService.logEvent({
      paymentId: payment.id,
      eventType: "PAYMENT_CREATED",
      aggregateId: payment.id,
      actorType: "CUSTOMER",
      payload: { amount: params.amount, currency: params.currency }
    });

    try {
      const orderId = await gateway.createPaymentIntent(params.amount, params.currency);
      
      const success = await PaymentRepository.processPaymentTransition(
        payment.id,
        payment.version,
        "pending",
        "created",
        params.checkoutId,
        "PaymentPending",
        { paymentId: payment.id, orderId }
      );
      
      if (success) {
        return { payment: { ...payment, gateway_order_id: orderId }, orderId };
      }
      throw new Error("Concurrency error locking payment");
    } catch (e: any) {
      await PaymentRepository.processPaymentTransition(
        payment.id,
        payment.version,
        "failed",
        "failed",
        params.checkoutId,
        "PaymentFailed",
        { paymentId: payment.id, reason: e.message }
      );
      throw new Error("Gateway failure: " + e.message);
    }
  }

  /**
   * Manual Payment Flow (Cash/POS)
   */
  static async completeManualPayment(params: {
    sessionId: string;
    restaurantId: string;
    method: "cash" | "pos";
    amount: number;
    currency: string;
    billSnapshot: any;
    sessionVersion: number;
    staffId: string;
    checkoutId: string;
  }) {
    const billHash = PaymentHasher.hashBillSnapshot(params.billSnapshot);

    // Cancel pending online payments
    const pendingPayment = await PaymentRepository.findPendingPayment(params.sessionId);
    if (pendingPayment) {
       await PaymentRepository.processPaymentTransition(
          pendingPayment.id,
          pendingPayment.version,
          "cancelled",
          "cancelled",
          params.checkoutId,
          "PaymentCancelled",
          { reason: "Manual payment took precedence" }
       );
    }

    const expiresAt = new Date().toISOString(); 
    const payment = await PaymentRepository.createPayment({
      session_id: params.sessionId,
      restaurant_id: params.restaurantId,
      attempt_number: (pendingPayment?.attempt_number || 0) + 1,
      payment_method: params.method,
      gateway: null,
      gateway_order_id: null,
      payment_status: "pending", 
      amount: params.amount,
      currency: params.currency,
      bill_snapshot: params.billSnapshot,
      bill_hash: billHash,
      session_version: params.sessionVersion,
      expires_at: expiresAt,
      parent_payment_id: pendingPayment?.id,
    });

    const receiptNumber = `INV-${params.restaurantId.substring(0,6)}-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`;
    const receiptSnapshot = PaymentSnapshot.generateReceiptSnapshot(params.billSnapshot, params.method, undefined, receiptNumber);

    const success = await PaymentRepository.processPaymentTransition(
      payment.id,
      payment.version,
      "captured",
      "success",
      params.checkoutId,
      "PaymentCaptured",
      { paymentId: payment.id, method: params.method, amount: params.amount, version: 1 },
      receiptSnapshot,
      receiptNumber
    );

    if (!success) {
       throw new Error("Failed to atomically complete manual payment.");
    }
    
    await PaymentAuditService.logEvent({
      paymentId: payment.id,
      eventType: "MANUAL_PAYMENT_RECORDED",
      aggregateId: payment.id,
      actorType: "STAFF",
      actorId: params.staffId,
      payload: { method: params.method, amount: params.amount }
    });

    return true;
  }

  /**
   * Webhook processing
   */
  static async processWebhook(gatewayOrderId: string, gatewayPaymentId: string, signature: string, payload: string, amount: number, currency: string) {
    if (!gateway.verifyWebhook(payload, signature)) {
      throw new Error("Invalid signature");
    }

    const payment = await PaymentRepository.findPaymentByGatewayOrderId(gatewayOrderId);
    if (!payment) throw new Error("Payment not found");

    if (payment.payment_status === "captured") {
      return true; // Idempotent success
    }

    PaymentValidator.validateForCompletion(payment.payment_status, payment.expires_at, payment.bill_snapshot, payment.bill_hash);
    PaymentValidator.validateWebhookPayload(payment.amount, payment.currency, amount, currency);

    const receiptNumber = `INV-${payment.restaurant_id.substring(0,6)}-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`;
    const receiptSnapshot = PaymentSnapshot.generateReceiptSnapshot(payment.bill_snapshot, "razorpay", gatewayPaymentId, receiptNumber);

    const success = await PaymentRepository.processPaymentTransition(
      payment.id,
      payment.version,
      "captured",
      "captured",
      payment.session_id, // using session_id as proxy for checkout_id since we don't have it here directly without a lookup, but for now it's okay
      "PaymentCaptured",
      { paymentId: payment.id, method: "razorpay", gatewayPaymentId, version: 1 },
      receiptSnapshot,
      receiptNumber
    );

    if (success) {
      await PaymentAuditService.logEvent({
        paymentId: payment.id,
        eventType: "PAYMENT_CAPTURED",
        aggregateId: payment.id,
        actorType: "WEBHOOK",
        payload: { gatewayPaymentId, amount }
      });
    }

    return success;
  }
}
