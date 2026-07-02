import { createAdminClient } from "../../src/config/supabase/server";

async function main() {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error("Usage: npx tsx scripts/ops/verify-checkout.ts <session_id>");
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log(`\n🔍 Verifying Checkout Integrity for Session: ${sessionId}\n`);

  // 1. Session Status
  const { data: session } = await supabase.from("sessions").select("status").eq("id", sessionId).single();
  console.log(`[1] Session State: ${session ? session.status : 'NOT FOUND'}`);

  // 2. Checkout State
  const { data: checkout } = await supabase.from("checkouts").select("state, active_payment_id").eq("session_id", sessionId).single();
  console.log(`[2] Checkout State: ${checkout ? checkout.state : 'NOT FOUND'}`);

  // 3. Payments
  const { data: payments } = await supabase.from("payments").select("id, payment_status, gateway_order_id").eq("session_id", sessionId);
  if (!payments || payments.length === 0) {
    console.log(`[3] Payments: NONE`);
  } else {
    payments.forEach(p => {
      console.log(`[3] Payment [${p.id}]: Status = ${p.payment_status}, Gateway Order = ${p.gateway_order_id}`);
      if (checkout && p.id === checkout.active_payment_id) console.log(`    ↳ (ACTIVE CHECKOUT PAYMENT)`);
    });
  }

  // 4. Outbox
  const paymentIds = payments?.map(p => p.id) || [];
  if (paymentIds.length > 0) {
    const { data: outbox } = await supabase.from("outbox_events").select("id, status, event_type").in("aggregate_id", paymentIds);
    if (!outbox || outbox.length === 0) {
      console.log(`[4] Outbox: NONE`);
    } else {
      outbox.forEach(o => console.log(`[4] Outbox [${o.id}]: Type = ${o.event_type}, Status = ${o.status}`));
    }
  }

  console.log("\n✅ Verification Complete.\n");
}

main().catch(console.error);
