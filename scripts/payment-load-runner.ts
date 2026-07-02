import { PaymentService } from "../src/backend/services/payment/PaymentService";
import { createAdminClient } from "../src/config/supabase/server";
import { randomUUID } from "crypto";

let TENANT_ID = "00000000-0000-0000-0000-000000000001";
let TABLE_ID = "00000000-0000-0000-0000-000000000003";
const NUM_REQUESTS = 100;

interface TestMetrics {
  latencies: number[];
  successCount: number;
  failureCount: number;
  startMs: number;
  endMs: number;
}

async function verifyIntegrity(supabase: any) {
  console.log("\n[Integrity Check] Verifying invariants...");
  
  // No captured payment without receipt
  const { data: noReceipts } = await supabase.from("payments")
    .select("id").eq("restaurant_id", TENANT_ID).eq("payment_status", "captured").is("receipt_number", null);
  if (noReceipts?.length > 0) throw new Error(`Found ${noReceipts.length} captured payments missing receipts!`);

  // No duplicate receipt numbers
  const { data: receipts } = await supabase.from("payments").select("receipt_number").eq("restaurant_id", TENANT_ID).not("receipt_number", "is", null);
  const uniqueReceipts = new Set(receipts?.map((r: any) => r.receipt_number));
  if (receipts && receipts.length !== uniqueReceipts.size) throw new Error("Duplicate receipt numbers detected!");

  // Exactly one payment row per session
  const { data: sessions } = await supabase.from("payments").select("session_id").eq("restaurant_id", TENANT_ID);
  const uniqueSessions = new Set(sessions?.map((s: any) => s.session_id));
  if (sessions && sessions.length !== uniqueSessions.size) throw new Error("Duplicate payment rows for the same session detected!");

  console.log("✅ All integrity checks passed.");
}

async function cleanupData(supabase: any) {
  console.log(`\n[Cleanup] Removing all test data for tenant ${TENANT_ID}...`);
  await supabase.from("payment_idempotency_keys").delete().like("hashed_key", "%"); // Ideally we'd scope this by tenant if we stored tenant on idempotency table
  await supabase.from("outbox_events").delete().eq("aggregate_type", "payment"); // Similarly scoping could be tighter
  await supabase.from("payment_events").delete().eq("actor_type", "CUSTOMER"); 
  await supabase.from("payments").delete().eq("restaurant_id", TENANT_ID);
  console.log("✅ Cleanup complete.");
}

async function runThroughputTest(supabase: any): Promise<TestMetrics> {
  console.log(`\n[Phase 3A] Launching ${NUM_REQUESTS} concurrent checkouts for ${TENANT_ID}...`);
  
  const metrics: TestMetrics = {
    latencies: [],
    successCount: 0,
    failureCount: 0,
    startMs: Date.now(),
    endMs: 0
  };

  const promises = [];

  for (let i = 0; i < NUM_REQUESTS; i++) {
    const sessionId = randomUUID();
    // Pre-seed the session in the DB to satisfy foreign keys
    const { error: sessionErr } = await supabase.from("sessions").insert({ id: sessionId, restaurant_id: TENANT_ID, table_id: TABLE_ID, status: "active" });
    if (sessionErr) console.error("Session Insert Error:", sessionErr);
    
    const p = (async () => {
      const s = Date.now();
      try {
        // 1. Create Payment
        const payment = await PaymentService.createPayment({
          sessionId,
          restaurantId: TENANT_ID,
          amount: 500,
          currency: "INR",
          billSnapshot: { items: [{ name: "Load Item", price: 500 }] },
          sessionVersion: 1,
          checkoutId: sessionId
        });
        
        // 2. Immediately fire valid webhook to capture
        await PaymentService.processWebhook(
          payment.orderId,
          `pay_load_${i}`,
          "mock_sig",
          "{}",
          500,
          "INR",
          "TRUSTED_GATEWAY_FETCH"
        );

        metrics.successCount++;
      } catch (e: any) {
        if (i === 0) console.error("Sample Error:", e.message || e);
        metrics.failureCount++;
      } finally {
        metrics.latencies.push(Date.now() - s);
      }
    })();
    promises.push(p);
  }

  await Promise.all(promises);
  metrics.endMs = Date.now();
  return metrics;
}

async function main() {
  const supabase = createAdminClient();
  
  // 1. Resolve a valid real tenant and table from the DB
  const { data: tables } = await supabase.from("restaurant_tables").select("id, restaurant_id").limit(1);
  if (tables && tables.length > 0) {
    TENANT_ID = tables[0].restaurant_id;
    TABLE_ID = tables[0].id;
  }
  
  await cleanupData(supabase); // Clean start

  const metrics = await runThroughputTest(supabase);
  
  metrics.latencies.sort((a, b) => a - b);
  const p95 = metrics.latencies[Math.floor(NUM_REQUESTS * 0.95)];
  const p99 = metrics.latencies[Math.floor(NUM_REQUESTS * 0.99)];
  const avg = metrics.latencies.reduce((a, b) => a + b, 0) / NUM_REQUESTS;
  const durationSec = (metrics.endMs - metrics.startMs) / 1000;

  console.log("\n=========================================");
  console.log("   PHASE 3A: LOAD TESTING RESULTS        ");
  console.log("=========================================");
  console.log(`Throughput:      ${(NUM_REQUESTS / durationSec).toFixed(2)} req/sec`);
  console.log(`Success Rate:    ${metrics.successCount}/${NUM_REQUESTS}`);
  console.log(`Failure Rate:    ${metrics.failureCount}/${NUM_REQUESTS}`);
  console.log(`Avg Latency:     ${avg.toFixed(2)}ms`);
  console.log(`P95 Latency:     ${p95}ms`);
  console.log(`P99 Latency:     ${p99}ms`);

  await verifyIntegrity(supabase);
  await cleanupData(supabase);

  if (metrics.failureCount > 0) {
    console.error(`\n❌ Load test failed with ${metrics.failureCount} errors.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Load test completed successfully!`);
    process.exit(0);
  }
}

main().catch(e => {
  console.error("Fatal Error in Load Runner:", e);
  process.exit(1);
});
