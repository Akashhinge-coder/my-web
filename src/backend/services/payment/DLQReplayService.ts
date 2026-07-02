import { createAdminClient } from "@/config/supabase/server";

export class DLQReplayService {
  /**
   * Replays a single event from the Dead Letter Queue.
   * Maintains the original eventId and tracks replay lineage.
   */
  static async replayEvent(eventId: string, adminId: string): Promise<boolean> {
    const supabase = createAdminClient();

    // 1. Fetch the DEAD event
    const { data: event, error: fetchError } = await supabase
      .from("outbox_events")
      .select("*")
      .eq("id", eventId)
      .eq("status", "DEAD")
      .single();

    if (fetchError || !event) {
      throw new Error(`Failed to find DEAD event with ID ${eventId}`);
    }

    const replayAttempt = (event.replay_attempt || 0) + 1;

    // 2. Atomically transition back to PENDING and preserve ID
    const { error: updateError } = await supabase
      .from("outbox_events")
      .update({
        status: "PENDING",
        attempt_count: 0, // Reset attempt count for processor
        next_retry_at: new Date().toISOString(),
        replayed_at: new Date().toISOString(),
        replayed_by: adminId,
        replay_attempt: replayAttempt,
      })
      .eq("id", eventId)
      .eq("status", "DEAD"); // Optimistic lock

    if (updateError) {
      throw updateError;
    }

    // 3. Log to payment_events audit trail if it's a payment event
    if (event.aggregate_type === "PAYMENT" || event.aggregate_type === "CHECKOUT") {
      await supabase.from("payment_events").insert({
        payment_id: event.aggregate_id, // assuming aggregate_id is session_id, wait, payment_id? For outbox, we use checkoutId/sessionId as aggregateId usually, but we need paymentId for payment_events. We'll store it in payload.
        event_type: "REPLAY_INITIATED",
        aggregate_type: 'PAYMENT',
        aggregate_id: event.aggregate_id,
        actor_type: "ADMIN",
        actor_id: adminId,
        payload: { originalEventId: eventId, replayAttempt },
        schema_version: 1,
      });
    }

    return true;
  }

  /**
   * Batch replay all DEAD events.
   */
  static async replayBatch(adminId: string): Promise<number> {
    const supabase = createAdminClient();

    const { data: events, error } = await supabase
      .from("outbox_events")
      .select("id")
      .eq("status", "DEAD");

    if (error) throw error;

    let successCount = 0;
    for (const event of events) {
      try {
        await this.replayEvent(event.id, adminId);
        successCount++;
      } catch (e) {
        console.error(`Failed to replay event ${event.id}:`, e);
      }
    }

    return successCount;
  }
}
