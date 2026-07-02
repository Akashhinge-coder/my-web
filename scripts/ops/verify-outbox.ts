import { createAdminClient } from "../../src/config/supabase/server";

async function main() {
  const outboxId = process.argv[2];
  if (!outboxId) {
    console.error("Usage: npx tsx scripts/ops/verify-outbox.ts <outbox_id>");
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log(`\n🔍 Verifying Outbox Event: ${outboxId}\n`);

  const { data: outbox } = await supabase.from("outbox_events").select("*").eq("id", outboxId).single();
  
  if (!outbox) {
    console.log(`❌ Outbox event ${outboxId} NOT FOUND.`);
    process.exit(1);
  }

  console.log(`[Status]: ${outbox.status}`);
  console.log(`[Type]: ${outbox.event_type}`);
  console.log(`[Aggregate ID]: ${outbox.aggregate_id}`);
  console.log(`[Created At]: ${outbox.created_at}`);
  console.log(`[Replay Attempt]: ${outbox.replay_attempt || 0}`);
  
  if (outbox.status === 'DEAD') {
    console.log(`⚠️ ERROR DETAILS:`);
    console.log(JSON.stringify(outbox.error_details, null, 2));
  }

  console.log("\n✅ Verification Complete.\n");
}

main().catch(console.error);
