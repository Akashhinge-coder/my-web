import { PaymentRepository } from "@/backend/repositories/payment.repository";
import { Payment, PaymentMethod } from "@/types/domain";
import { GatewayFactory } from "./GatewayFactory";
import { PaymentStateMachine, PaymentEvent, PaymentState } from "./PaymentStateMachine";
import { PaymentAuditService } from "./PaymentAuditService";
import { PaymentSnapshot } from "./PaymentSnapshot";
import { PaymentHasher } from "./PaymentHasher";
import { PaymentValidator } from "./PaymentValidator";
import { IdempotencyService } from "./IdempotencyService";
import { createAdminClient } from "@/config/supabase/server";

export type VerificationMode = "WEBHOOK_SIGNATURE" | "TRUSTED_GATEWAY_FETCH" | "MANUAL_STAFF" | "SYSTEM_RECOVERY";

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
    idempotencyKey?: string;
  }): Promise<{ payment: Payment; orderId: string; recovered?: boolean }> {
    if (params.idempotencyKey) {
      const lock = await IdempotencyService.checkOrLock(params.idempotencyKey);
      if (lock.locked && lock.cachedResponse?.status === 200) {
        return lock.cachedResponse.body; // Return identical previous response
      }
    }

    const billHash = PaymentHasher.hashBillSnapshot(params.billSnapshot);
    
    // Check for existing pending payments
    const pendingPayment = await PaymentRepository.findPendingPayment(params.sessionId);
    
    if (pendingPayment) {
      if (new Date(pendingPayment.expires_at).getTime() > Date.now()) {
        if (!pendingPayment.gateway_order_id) {
          console.warn("Found corrupted pending payment without gateway_order_id, expiring it immediately.");
          await PaymentRepository.processPaymentTransition(
            pendingPayment.id,
            pendingPayment.version,
            "expired",
            "expired",
            params.checkoutId,
            "PaymentExpired",
            { paymentId: pendingPayment.id, reason: "Corrupted state (missing gateway_order_id)" }
          );
        } else {
          return { payment: pendingPayment, orderId: pendingPayment.gateway_order_id, recovered: true };
        }
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

    const paymentReference = `PAY-${params.restaurantId.substring(0, 4)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = await PaymentRepository.createPayment({
      session_id: params.sessionId,
      restaurant_id: params.restaurantId,
      payment_reference: paymentReference,
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
      parent_payment_id: pendingPayment?.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins expiry
    });

    await PaymentAuditService.logEvent({
      paymentId: payment.id,
      eventType: "PAYMENT_CREATED",
      aggregateId: payment.id,
      actorType: "CUSTOMER",
      payload: { amount: params.amount, currency: params.currency, schemaVersion: 1, traceId: params.checkoutId }
    });

    try {
      const gateway = await GatewayFactory.getGateway(params.restaurantId, "razorpay");
      const orderId = await gateway.createPaymentIntent(params.amount, params.currency);
      
      await PaymentRepository.updateGatewayOrderId(payment.id, orderId);

      const success = await PaymentRepository.processPaymentTransition(
        payment.id,
        payment.version,
        "pending",
        "created",
        params.checkoutId,
        "PaymentPending",
        { paymentId: payment.id, orderId, schemaVersion: 1 }
      );
      
      if (success) {
        const responseBody = { payment: { ...payment, gateway_order_id: orderId }, orderId };
        if (params.idempotencyKey) {
          await IdempotencyService.saveResponse(params.idempotencyKey, 200, responseBody, { "Content-Type": "application/json" });
        }
        return responseBody;
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
        { paymentId: payment.id, reason: e.message, schemaVersion: 1 }
      );
      if (params.idempotencyKey) {
        await IdempotencyService.saveResponse(params.idempotencyKey, 500, { error: "Gateway failure: " + e.message }, { "Content-Type": "application/json" });
      }
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
    staffId: string | null;
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
    const paymentReference = `PAY-${params.restaurantId.substring(0, 4)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = await PaymentRepository.createPayment({
      session_id: params.sessionId,
      restaurant_id: params.restaurantId,
      payment_reference: paymentReference,
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

    const loyaltyAccountId = params.billSnapshot?.loyalty?.accountId;
    const loyaltyPointsToRedeem = params.billSnapshot?.loyalty?.pointsToRedeem;
    const loyaltyPointsToEarn = params.billSnapshot?.pricing?.loyaltyPointsEarned;

    const success = await PaymentRepository.processPaymentTransition(
      payment.id,
      payment.version,
      "captured",
      "success",
      params.checkoutId,
      "PaymentCaptured",
      { paymentId: payment.id, method: params.method, amount: params.amount, version: 1 },
      receiptSnapshot,
      receiptNumber,
      loyaltyAccountId,
      loyaltyPointsToRedeem,
      loyaltyPointsToEarn
    );

    if (!success) {
       throw new Error("Failed to atomically complete manual payment.");
    }
    
    await PaymentAuditService.logEvent({
      paymentId: payment.id,
      eventType: "MANUAL_PAYMENT_RECORDED",
      aggregateId: payment.id,
      actorType: "STAFF",
      actorId: params.staffId || undefined,
      payload: { method: params.method, amount: params.amount }
    });

    return true;
  }

  /**
   * Cash Request Flow (Customer Initiated)
   */
  static async requestCashPayment(params: {
    sessionId: string;
    restaurantId: string;
    amount: number;
    currency: string;
    billSnapshot: any;
    sessionVersion: number;
    checkoutId: string;
  }) {
    // 1. Idempotency: find active pending cash payment
    const existing = await PaymentRepository.findPendingPayment(params.sessionId);
    if (existing && existing.payment_method === "cash") {
      return existing; // return existing pending cash request
    }

    const billHash = PaymentHasher.hashBillSnapshot(params.billSnapshot);

    // Cancel pending online payments if any
    if (existing && existing.payment_method !== "cash") {
       await PaymentRepository.processPaymentTransition(
          existing.id,
          existing.version,
          "cancelled",
          "cancelled",
          params.checkoutId,
          "PaymentCancelled",
          { reason: "Cash request took precedence" }
       );
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
    const paymentReference = `PAY-${params.restaurantId.substring(0, 4)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = await PaymentRepository.createPayment({
      session_id: params.sessionId,
      restaurant_id: params.restaurantId,
      payment_reference: paymentReference,
      attempt_number: (existing?.attempt_number || 0) + 1,
      payment_method: "cash",
      gateway: null,
      gateway_order_id: null,
      payment_status: "pending", 
      amount: params.amount,
      currency: params.currency,
      bill_snapshot: params.billSnapshot,
      bill_hash: billHash,
      session_version: params.sessionVersion,
      expires_at: expiresAt,
      parent_payment_id: existing?.id,
    });

    // We store AWAITING_STAFF in gateway_status to track it easily without altering enum
    await PaymentRepository.updateGatewayOrderId(payment.id, "AWAITING_STAFF");

    await PaymentRepository.processPaymentTransition(
      payment.id,
      payment.version,
      "pending",
      "AWAITING_STAFF",
      params.checkoutId,
      "CashPaymentRequested",
      { paymentId: payment.id, amount: params.amount, schemaVersion: 1 }
    );
    
    return payment;
  }

  /**
   * Cash Confirmation Flow (Staff Initiated)
   */
  static async confirmCashPayment(params: {
    paymentId: string;
    staffId: string;
    checkoutId: string;
  }) {
    const supabase = createAdminClient();
    const { data: payment, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", params.paymentId)
      .single();

    if (error || !payment) throw new Error("Payment not found");

    if (payment.payment_status !== "pending") {
      throw new Error(`Cannot confirm payment in ${payment.payment_status} state`);
    }

    const receiptNumber = `INV-${payment.restaurant_id.substring(0,6)}-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`;
    const receiptSnapshot = PaymentSnapshot.generateReceiptSnapshot(payment.bill_snapshot, "cash", undefined, receiptNumber);

    const loyaltyAccountId = payment.bill_snapshot?.loyalty?.accountId;
    const loyaltyPointsToRedeem = payment.bill_snapshot?.loyalty?.pointsToRedeem;
    const loyaltyPointsToEarn = payment.bill_snapshot?.pricing?.loyaltyPointsEarned;

    const success = await PaymentRepository.processPaymentTransition(
      payment.id,
      payment.version,
      "captured",
      "success",
      params.checkoutId,
      "PaymentCaptured", // Standard capture event
      { paymentId: payment.id, method: "cash", amount: payment.amount, version: 1 },
      receiptSnapshot,
      receiptNumber,
      loyaltyAccountId,
      loyaltyPointsToRedeem,
      loyaltyPointsToEarn
    );

    if (!success) {
       throw new Error("Failed to atomically confirm cash payment.");
    }

    // Secondary event for cash collection audit trail
    await PaymentAuditService.logEvent({
      paymentId: payment.id,
      eventType: "CashPaymentCollected",
      aggregateId: params.checkoutId,
      actorType: "STAFF",
      actorId: params.staffId,
      payload: { amount: payment.amount }
    });

    return true;
  }

  /**
   * Webhook or Reconciled processing
   */
  static async processWebhook(
    gatewayOrderId: string,
    gatewayPaymentId: string,
    gatewayEventId: string,
    signature: string,
    payload: string,
    amount: number,
    currency: string,
    verificationMode: VerificationMode = "WEBHOOK_SIGNATURE"
  ): Promise<boolean> {
    const payment = await PaymentRepository.findPaymentByGatewayOrderId(gatewayOrderId);

    if (!payment) {
      console.warn(`Webhook received for unknown order_id: ${gatewayOrderId}`);
      return false;
    }

    // 1. Database-Level Replay Protection
    // Attempt to insert the webhook event ID into our logs.
    // If it violates the UNIQUE(provider, gateway_event_id) constraint, it's a duplicate.
    try {
      const { error: replayError } = await createAdminClient()
        .from('payment_webhook_logs')
        .insert({
          provider: 'razorpay',
          gateway_event_id: gatewayEventId,
          payment_id: payment.id
        });
      
      if (replayError && replayError.code === '23505') { // Postgres unique_violation
        console.info(`[WebhookReplay] Ignored duplicate webhook delivery for event: ${gatewayEventId}`);
        return true; // Return true so gateway considers it acknowledged
      } else if (replayError) {
        throw new Error(`Failed to log webhook event: ${replayError.message}`);
      }
    } catch (e: any) {
      if (e.message.includes('unique constraint') || e.code === '23505') {
        console.info(`[WebhookReplay] Ignored duplicate webhook delivery for event: ${gatewayEventId}`);
        return true;
      }
      throw e;
    }

    if (verificationMode === "WEBHOOK_SIGNATURE") {
      const gateway = await GatewayFactory.getGateway(payment.restaurant_id, "razorpay");
      if (!gateway.verifyWebhook(payload, signature)) {
        throw new Error("Invalid webhook signature");
      }
    }

    if (payment.payment_status === "captured") {
      return true; // Idempotent success
    }

    PaymentValidator.validateForCompletion(payment.payment_status, payment.expires_at, payment.bill_snapshot, payment.bill_hash);
    PaymentValidator.validateWebhookPayload(payment.amount, payment.currency, amount, currency);

    const receiptNumber = `INV-${payment.restaurant_id.substring(0,6)}-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`;
    const receiptSnapshot = PaymentSnapshot.generateReceiptSnapshot(payment.bill_snapshot, "razorpay", gatewayPaymentId, receiptNumber);

    const loyaltyAccountId = payment.bill_snapshot?.loyalty?.accountId;
    const loyaltyPointsToRedeem = payment.bill_snapshot?.loyalty?.pointsToRedeem;
    const loyaltyPointsToEarn = payment.bill_snapshot?.pricing?.loyaltyPointsEarned;

    const success = await PaymentRepository.processPaymentTransition(
      payment.id,
      payment.version,
      "captured",
      "captured",
      payment.session_id, // using session_id as proxy for checkout_id since we don't have it here directly without a lookup, but for now it's okay
      "PaymentCaptured",
      { paymentId: payment.id, method: "razorpay", gatewayPaymentId, version: 1 },
      receiptSnapshot,
      receiptNumber,
      loyaltyAccountId,
      loyaltyPointsToRedeem,
      loyaltyPointsToEarn
    );

    if (success) {
      await PaymentAuditService.logEvent({
        paymentId: payment.id,
        eventType: "PAYMENT_CAPTURED",
        aggregateId: payment.id,
        actorType: verificationMode === "TRUSTED_GATEWAY_FETCH" ? "SYSTEM" : "WEBHOOK",
        payload: { gatewayPaymentId, amount, schemaVersion: 1, traceId: payment.session_id }
      });
    }

    return success;
  }
}
