import { createAdminClient } from "@/config/supabase/server";
import { PaymentService } from "./PaymentService";
import { RazorpayGateway } from "./gateways/RazorpayGateway";

const gateway = new RazorpayGateway();
const MAX_RECONCILIATION_ATTEMPTS = 3;

export class PaymentReconciliationJob {
  /**
   * Finds pending payments that may have missed their webhook and checks their status.
   */
  static async run(): Promise<number> {
    const supabase = createAdminClient();

    // Find pending payments that were created > 3 minutes ago
    // and are not yet expired, and haven't exceeded reconciliation attempts
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_status", "pending")
      .lt("created_at", threeMinutesAgo)
      .gt("expires_at", now)
      .lt("reconciliation_attempts", MAX_RECONCILIATION_ATTEMPTS)
      .not("gateway_order_id", "is", null)
      .or(`last_reconciliation_at.is.null,last_reconciliation_at.lt.${fiveMinutesAgo}`);

    if (error) {
      console.error("Failed to fetch payments for reconciliation:", error);
      return 0;
    }

    let recoveredCount = 0;

    for (const payment of payments) {
      try {
        // Increment attempt counter to avoid hammering
        await supabase
          .from("payments")
          .update({
            reconciliation_attempts: payment.reconciliation_attempts + 1,
            last_reconciliation_at: now
          })
          .eq("id", payment.id);

        if (!payment.gateway_order_id) continue;

        // Fetch actual status from Gateway
        const orderInfo = await gateway.fetchOrder(payment.gateway_order_id);
        
        if (orderInfo.status === "paid") {
          console.log(`[Reconciliation] Recovered paid order ${payment.gateway_order_id}`);
          
          // Re-trigger the webhook logic securely
          const success = await PaymentService.processWebhook(
            payment.gateway_order_id,
            orderInfo.paymentId || "reconciled_mock",
            "mock_signature", 
            "{}",
            payment.amount,
            payment.currency,
            "TRUSTED_GATEWAY_FETCH"
          );
          
          if (success) recoveredCount++;
        }
      } catch (e) {
        console.error(`[Reconciliation] Failed to reconcile payment ${payment.id}:`, e);
      }
    }

    return recoveredCount;
  }
}
