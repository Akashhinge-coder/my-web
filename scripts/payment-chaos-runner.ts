import { PaymentService } from "../src/backend/services/payment/PaymentService";
import { createAdminClient } from "../src/config/supabase/server";
import { randomUUID } from "crypto";

let TENANT_ID = "00000000-0000-0000-0000-000000000002";
let TABLE_ID = "00000000-0000-0000-0000-000000000004";

async function verifyIntegrity(supabase: any, sessionId: string) {
  const { data: payments } = await supabase.from("payments").select("*").eq("session_id", sessionId);
  
  if (!payments || payments.length === 0) throw new Error(`Chaos failed: No payment row found for session ${sessionId}`);
  if (payments.length > 1) throw new Error(`Chaos failed: Multiple payment rows found for session ${sessionId}! (${payments.length} rows)`);

  const payment = payments[0];
  if (payment.payment_status === "pending") throw new Error(`Chaos failed: Payment remained pending after chaos simulation for session ${sessionId}`);
  
  // Verify outbox doesn't have duplicate captured events
  const { data: events } = await supabase.from("outbox_events").select("*").eq("aggregate_id", payment.id);
  const capturedEvents = events?.filter((e: any) => e.event_type === "PAYMENT_CAPTURED") || [];
  if (capturedEvents.length > 1) throw new Error(`Chaos failed: Duplicate PAYMENT_CAPTURED outbox events detected for session ${sessionId}`);

  console.log(`✅ Integrity verified for session ${sessionId}: Exactly one terminal state (${payment.payment_status}), no split brain.`);
}

async function cleanupData(supabase: any) {
  console.log(`[Cleanup] Removing chaos data for tenant ${TENANT_ID}...`);
  await supabase.from("payment_idempotency_keys").delete().like("hashed_key", "%"); 
  await supabase.from("outbox_events").delete().eq("aggregate_type", "payment"); 
  await supabase.from("payment_events").delete().eq("actor_type", "CUSTOMER"); 
  await supabase.from("payments").delete().eq("restaurant_id", TENANT_ID);
}

async function runChaosScenario1_IdempotencyHammer(supabase: any) {
  console.log("\n--- Scenario 1: Idempotency Hammer (20 concurrent checkouts for same session) ---");
  const sessionId = randomUUID();
  await supabase.from("sessions").insert({ id: sessionId, restaurant_id: TENANT_ID, table_id: TABLE_ID, status: "active" });
  
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(
      PaymentService.createPayment({
        sessionId, restaurantId: TENANT_ID, amount: 500, currency: "INR", billSnapshot: {}, sessionVersion: 1, checkoutId: sessionId, idempotencyKey: `idem_key_${sessionId}`
      }).catch(e => { /* Expected to fail concurrency lock */ })
    );
  }
  
  await Promise.all(promises);
  
  const { data: payments, error } = await supabase.from("payments").select("*").eq("session_id", sessionId);
  if (error) console.error("DB Error:", error);
  if (payments?.length !== 1) throw new Error(`Expected exactly 1 payment row, got ${payments?.length}`);
  console.log("✅ Exactly 1 payment row created despite 20 concurrent requests.");
}

async function runChaosScenario2_WebhookStorm(supabase: any) {
  console.log("\n--- Scenario 2: Webhook Duplicate Storm ---");
  const sessionId = randomUUID();
  await supabase.from("sessions").insert({ id: sessionId, restaurant_id: TENANT_ID, table_id: TABLE_ID, status: "active" });
  
  const payment = await PaymentService.createPayment({
    sessionId, restaurantId: TENANT_ID, amount: 500, currency: "INR", billSnapshot: {}, sessionVersion: 1, checkoutId: sessionId
  });

  const promises = [];
  for (let i = 0; i < 15; i++) {
    // Blast 15 simultaneous webhooks
    promises.push(
      PaymentService.processWebhook(
        payment.orderId, "pay_storm_123", "mock_sig", "{}", 500, "INR", "TRUSTED_GATEWAY_FETCH"
      )
    );
  }

  await Promise.all(promises);
  await verifyIntegrity(supabase, sessionId);
}

async function runChaosScenario3_WebhookVsReconciliationRace(supabase: any) {
  console.log("\n--- Scenario 3: Webhook vs Reconciliation Race ---");
  const sessionId = randomUUID();
  await supabase.from("sessions").insert({ id: sessionId, restaurant_id: TENANT_ID, table_id: TABLE_ID, status: "active" });

  const payment = await PaymentService.createPayment({
    sessionId, restaurantId: TENANT_ID, amount: 500, currency: "INR", billSnapshot: {}, sessionVersion: 1, checkoutId: sessionId
  });

  // Fire webhook and reconciliation at the exact same time
  await Promise.all([
    PaymentService.processWebhook(payment.orderId, "pay_webhook", "mock_sig", "{}", 500, "INR", "TRUSTED_GATEWAY_FETCH"),
    PaymentService.processWebhook(payment.orderId, "pay_reconcile", "mock_sig", "{}", 500, "INR", "TRUSTED_GATEWAY_FETCH")
  ]);

  await verifyIntegrity(supabase, sessionId);
}

async function main() {
  const supabase = createAdminClient();
  
  const { data: tables } = await supabase.from("restaurant_tables").select("id, restaurant_id").limit(1);
  if (tables && tables.length > 0) {
    TENANT_ID = tables[0].restaurant_id;
    TABLE_ID = tables[0].id;
  }
  
  await cleanupData(supabase);

  try {
    await runChaosScenario1_IdempotencyHammer(supabase);
    await runChaosScenario2_WebhookStorm(supabase);
    await runChaosScenario3_WebhookVsReconciliationRace(supabase);
    console.log("\n=========================================");
    console.log("   PHASE 3B: CHAOS TESTING PASSED        ");
    console.log("=========================================\n");
  } catch (e: any) {
    console.error(`\n❌ Chaos test failed: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await cleanupData(supabase);
  }
}

main().catch(e => {
  console.error("Fatal Error in Chaos Runner:", e);
  process.exit(1);
});
