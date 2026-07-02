import { createAdminClient } from "../../src/config/supabase/server";

async function main() {
  const paymentId = process.argv[2];
  if (!paymentId) {
    console.error("Usage: npx tsx scripts/ops/verify-payment.ts <payment_id>");
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log(`\n🔍 Verifying Payment Integrity: ${paymentId}\n`);

  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment) {
    console.log(`❌ Payment ${paymentId} NOT FOUND.`);
    process.exit(1);
  }

  console.log(`[Status]: ${payment.payment_status}`);
  console.log(`[Amount]: ${payment.currency} ${payment.amount}`);
  console.log(`[Gateway Order]: ${payment.gateway_order_id || 'NONE'}`);
  console.log(`[Receipt Number]: ${payment.receipt_number || 'NONE'}`);
  console.log(`[Session ID]: ${payment.session_id}`);

  // Find associated events
  const { data: events } = await supabase.from("payment_events").select("event_type, actor_type, created_at").eq("aggregate_id", paymentId).order("created_at", { ascending: true });
  
  if (events && events.length > 0) {
    console.log(`\n[Audit Trail]:`);
    events.forEach(e => console.log(`  - [${new Date(e.created_at).toISOString()}] ${e.event_type} (by ${e.actor_type})`));
  } else {
    console.log(`\n[Audit Trail]: NONE (Warning: Possible data corruption)`);
  }

  console.log("\n✅ Verification Complete.\n");
}

main().catch(console.error);
