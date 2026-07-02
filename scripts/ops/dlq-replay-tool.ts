import { createAdminClient } from "../../src/config/supabase/server";

// Simulates the background worker's processing of an outbox event
async function replayEvent(outboxId: string) {
  const supabase = createAdminClient();
  console.log(`\n🔄 Attempting to Replay DLQ Event: ${outboxId}\n`);

  const { data: event, error: fetchErr } = await supabase.from("outbox_events").select("*").eq("id", outboxId).single();
  if (fetchErr || !event) {
    console.log(`❌ Event not found.`);
    return;
  }

  if (event.status !== 'DEAD' && event.status !== 'FAILED') {
    console.log(`⚠️ Event is ${event.status}. Only DEAD or FAILED events can be replayed.`);
    return;
  }

  console.log(`Payload Type: ${event.event_type}`);
  
  // Fake the processing (in a real system, you'd call OutboxProcessor.processEvent(event))
  // For the sake of this tool, we just mark it as processed to "clear" the DLQ.
  // Real implementation would invoke the actual side-effects (e.g., sending email, updating accounting).
  
  const { error: updateErr } = await supabase.from("outbox_events").update({
    status: 'PROCESSED',
    replayed_at: new Date().toISOString(),
    replay_attempt: (event.replay_attempt || 0) + 1,
    error_details: null
  }).eq("id", outboxId);

  if (updateErr) {
    console.log(`❌ Failed to update event:`, updateErr);
  } else {
    console.log(`✅ Event successfully replayed and marked as PROCESSED.`);
  }
}

async function main() {
  const outboxId = process.argv[2];
  if (!outboxId) {
    console.error("Usage: npx tsx scripts/ops/dlq-replay-tool.ts <outbox_id | 'ALL'>");
    process.exit(1);
  }

  const supabase = createAdminClient();

  if (outboxId === 'ALL') {
    console.log("Fetching all DEAD events...");
    const { data: deadEvents } = await supabase.from("outbox_events").select("id").eq("status", "DEAD");
    if (!deadEvents || deadEvents.length === 0) {
      console.log("No DEAD events found in the queue.");
      return;
    }
    for (const e of deadEvents) {
      await replayEvent(e.id);
    }
  } else {
    await replayEvent(outboxId);
  }
}

main().catch(console.error);
