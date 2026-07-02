import { createAdminClient } from "@/config/supabase/server";
import { CheckoutService } from "./CheckoutService";

export class OutboxProcessor {
  /**
   * Processes pending outbox events sequentially.
   * In a real clustered environment, this would use FOR UPDATE SKIP LOCKED to process batches concurrently.
   */
  static async processBatch(batchSize: number = 50) {
    const supabase = createAdminClient();

    // For Supabase REST API, we can't easily do SKIP LOCKED, so we fetch pending and try to process them.
    // Real robust queueing would use pg-boss or an Edge Function cron with direct SQL, but we simulate it here.
    const { data: events, error: fetchError } = await supabase
      .from("outbox_events")
      .select("*")
      .eq("status", "PENDING")
      .lte("next_retry_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (fetchError || !events) {
      console.error("Outbox fetch error:", fetchError);
      return;
    }

    for (const event of events) {
      try {
        if (event.event_type === "PaymentCaptured") {
          const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
          
          await CheckoutService.completeCheckout(
            event.aggregate_id, // For checkouts, aggregate_id was set to session_id / checkout_id
            payload.paymentId,
            payload.method,
            payload.amount
          );
        }

        // Mark processed
        await supabase
          .from("outbox_events")
          .update({
            status: "PROCESSED",
            processed_at: new Date().toISOString(),
          })
          .eq("id", event.id);
      } catch (err: any) {
        console.error(`[Outbox] Error processing event ${event.id}:`, err);
        
        const nextAttempt = event.attempt_count + 1;
        const maxRetries = 5;
        
        if (nextAttempt >= maxRetries) {
          console.warn(`[Outbox] Event ${event.id} reached max retries. Moving to DEAD.`);
          await supabase
            .from("outbox_events")
            .update({
              status: "DEAD",
              attempt_count: nextAttempt,
              last_error: err.message,
              error_details: { stack: err.stack, time: new Date().toISOString() }
            })
            .eq("id", event.id);
        } else {
          // Exponential backoff
          const delaySeconds = Math.pow(2, nextAttempt) * 10;
          const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

          await supabase
            .from("outbox_events")
            .update({
              status: "PENDING",
              attempt_count: nextAttempt,
              next_retry_at: nextRetryAt,
              last_error: err.message,
            })
            .eq("id", event.id);
        }
      }
    }
  }
}
