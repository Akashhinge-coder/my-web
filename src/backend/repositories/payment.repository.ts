import { createAdminClient } from "@/config/supabase/server";
import { Payment, PaymentWebhookLog, PaymentMethod } from "@/types/domain";
import { PaymentState } from "@/backend/services/payment/PaymentStateMachine";

export class PaymentRepository {
  /**
   * Creates a new payment record.
   */
  static async createPayment(data: {
    session_id: string;
    restaurant_id: string;
    payment_reference: string;
    attempt_number: number;
    payment_method: PaymentMethod;
    gateway: string | null;
    gateway_order_id: string | null;
    payment_status: PaymentState;
    amount: number;
    currency: string;
    bill_snapshot: any;
    bill_hash: string;
    session_version: number;
    expires_at: string;
    parent_payment_id?: string;
  }): Promise<Payment> {
    const supabase = createAdminClient();
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        ...data,
      })
      .select()
      .single();

    if (error) throw error;
    return payment as Payment;
  }

  /**
   * Finds the most recent pending payment for a session.
   */
  static async findPendingPayment(sessionId: string): Promise<Payment | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as Payment | null;
  }

  /**
   * Completes a payment atomically and inserts an outbox event.
   */
  static async processPaymentTransition(
    paymentId: string,
    expectedVersion: number,
    status: PaymentState,
    gatewayStatus: string | null,
    outboxAggregateId: string,
    outboxEventType: string,
    outboxPayload: any,
    receiptSnapshot?: any,
    receiptNumber?: string
  ): Promise<boolean> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("process_payment_transition", {
      p_payment_id: paymentId,
      p_expected_version: expectedVersion,
      p_payment_status: status,
      p_gateway_status: gatewayStatus,
      p_receipt_snapshot: receiptSnapshot || null,
      p_receipt_number: receiptNumber || null,
      p_outbox_aggregate_id: outboxAggregateId,
      p_outbox_event_type: outboxEventType,
      p_outbox_payload: outboxPayload,
    });

    if (error) throw error;
    return data as boolean;
  }

  /**
   * Log webhook event for auditing.
   */
  static async logWebhookEvent(log: any): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("payment_webhook_logs").insert(log);
    
    // Ignore duplicate key errors if gateway_event_id already exists
    if (error && error.code !== '23505') { 
      throw error;
    }
  }

  /**
   * Finds a payment by its gateway order ID.
   */
  static async findPaymentByGatewayOrderId(gatewayOrderId: string): Promise<Payment | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("gateway_order_id", gatewayOrderId)
      .maybeSingle();

    if (error) throw error;
    return data as Payment | null;
  }

  static async updateGatewayOrderId(paymentId: string, gatewayOrderId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("payments")
      .update({ gateway_order_id: gatewayOrderId })
      .eq("id", paymentId);

    if (error) throw error;
  }
}
