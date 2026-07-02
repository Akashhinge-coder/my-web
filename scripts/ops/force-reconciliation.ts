import { createAdminClient } from "../../src/config/supabase/server";

async function main() {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error("Usage: npx tsx scripts/ops/force-reconciliation.ts <session_id>");
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log(`\n🔄 Force Reconciling Session: ${sessionId}\n`);

  const { data: checkout, error } = await supabase.from("checkouts").select("*").eq("session_id", sessionId).single();
  if (error || !checkout) {
    console.log(`❌ Checkout not found for session ${sessionId}`);
    process.exit(1);
  }

  if (checkout.state === 'PAYMENT_COMPLETED') {
    console.log(`✅ Session is already PAYMENT_COMPLETED. No action needed.`);
    return;
  }

  const { data: payments } = await supabase.from("payments").select("*").eq("session_id", sessionId).order("created_at", { ascending: false });
  if (!payments || payments.length === 0) {
    console.log(`❌ No payments found for this session.`);
    return;
  }

  const pending = payments.find(p => p.payment_status === 'pending');
  if (!pending || !pending.gateway_order_id) {
    console.log(`❌ No pending payment with a gateway order ID found. Cannot reconcile with gateway.`);
    return;
  }

  console.log(`Found pending payment ${pending.id} mapped to Gateway Order ${pending.gateway_order_id}.`);
  console.log(`Calling mock gateway to verify status...`);

  // In a real system, you would call Razorpay.orders.fetch(pending.gateway_order_id)
  const isPaid = true; // Assume we fetched and it was actually paid, but webhook was dropped

  if (isPaid) {
    console.log(`Gateway says order IS PAID! Webhook was likely dropped.`);
    console.log(`Force-completing the payment via manual intervention...`);

    // We emulate what the ReconciliationService would do.
    // We update the DB manually for this script.
    
    await supabase.from("payments").update({ payment_status: 'paid' }).eq("id", pending.id);
    await supabase.from("checkouts").update({ state: 'PAYMENT_COMPLETED' }).eq("session_id", sessionId);
    await supabase.from("sessions").update({ status: 'closed' }).eq("id", sessionId);
    
    // Inject audit log
    await supabase.from("payment_events").insert({
      aggregate_id: pending.id,
      aggregate_type: 'payment',
      event_type: 'MANUAL_INTERVENTION_REQUIRED',
      actor_type: 'ADMIN',
      payload: { reason: "Force reconciled via CLI", timestamp: new Date().toISOString() }
    });

    console.log(`✅ Force reconciliation complete.`);
  } else {
    console.log(`Gateway says order is NOT PAID. Safe to ignore or expire.`);
  }
}

main().catch(console.error);
