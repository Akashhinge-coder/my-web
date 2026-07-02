import { createAdminClient } from "../../src/config/supabase/server";

async function main() {
  const supabase = createAdminClient();
  console.log(`\n🧹 Sweeping Stale Payments...\n`);

  // Find payments that are pending and their expires_at has passed
  const { data: stalePayments } = await supabase
    .from("payments")
    .select("id, expires_at")
    .eq("payment_status", "pending")
    .lt("expires_at", new Date().toISOString());

  if (!stalePayments || stalePayments.length === 0) {
    console.log(`✅ No stale payments found.`);
    return;
  }

  console.log(`Found ${stalePayments.length} stale payments. Expiring them...`);

  for (const payment of stalePayments) {
    console.log(`Expiring payment ${payment.id}...`);
    // In real system, this would call PaymentService.expirePayment()
    await supabase.from("payments").update({ payment_status: 'expired' }).eq("id", payment.id);
    
    await supabase.from("payment_events").insert({
      aggregate_id: payment.id,
      aggregate_type: 'payment',
      event_type: 'PAYMENT_EXPIRED',
      actor_type: 'SYSTEM',
      payload: { reason: "Stale Sweep", timestamp: new Date().toISOString() }
    });
  }

  console.log(`\n✅ Sweep Complete.\n`);
}

main().catch(console.error);
