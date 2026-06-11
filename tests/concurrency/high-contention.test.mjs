import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// 1. Parse .env.local
const envPath = path.resolve(".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ Missing .env.local file. Run this script from the workspace root.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
  if (match) {
    let value = match[2]?.trim() || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const BASE_URL = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const report = {
  timestamp: new Date().toISOString(),
  passed: 0,
  failed: 0,
  tests: {},
};

function logResult(testKey, name, status, notes = "", details = null) {
  const emoji = status === "PASS" ? "✅" : "❌";
  console.log(`  ${emoji} [${testKey.toUpperCase()}] ${name} -> ${status}${notes ? " (" + notes + ")" : ""}`);
  report.tests[testKey] = { name, status, notes, details };
  if (status === "PASS") report.passed++;
  else report.failed++;
}

async function run() {
  console.log("\n⚡ STARTING P0-CONCURRENCY REGRESSION TEST SUITE ⚡");
  console.log(`🔗 Application URL: ${BASE_URL}\n`);

  let adminCookie = "";
  let demoRestaurantId = null;
  let testTable = null;
  let testDish = null;

  const sessionsToCleanup = [];
  const categoriesToCleanup = [];
  const dishesToCleanup = [];

  try {
    // -------------------------------------------------------------
    // AUTHENTICATE ADMIN & DETECT COOKIE FORMAT
    // -------------------------------------------------------------
    const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
      email: "demo@menuara.com",
      password: "MenuaraDemo2024!",
    });
    if (authErr) throw new Error(`Failed to authenticate admin: ${authErr.message}`);

    const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase/);
    const projectId = match ? match[1] : "";
    const access_token = authData.session.access_token;
    const refresh_token = authData.session.refresh_token;
    const expires_at = authData.session.expires_at;

    const arrayVal = JSON.stringify([access_token, refresh_token, null, null, null]);
    const objectVal = JSON.stringify({ access_token, refresh_token, expires_at });

    const formats = [
      { name: `sb-${projectId}-auth-token.0`, val: arrayVal },
      { name: `sb-${projectId}-auth-token.0`, val: objectVal },
    ];

    for (const format of formats) {
      const cookieCandidate = `${format.name}=${encodeURIComponent(format.val)}`;
      const res = await fetch(`${BASE_URL}/api/v1/auth/session`, {
        headers: { "Cookie": cookieCandidate }
      });
      let body = null;
      try { body = await res.json(); } catch {}
      if (res.status === 200 && body?.data?.authenticated === true) {
        adminCookie = cookieCandidate;
        break;
      }
    }
    if (!adminCookie) throw new Error("Failed admin auth cookie test");

    // Retrieve demo restaurant and table
    const { data: rest } = await sb.from("restaurants").select("id").eq("slug", "menuara-demo").single();
    demoRestaurantId = rest.id;

    const { data: tables } = await sb.from("restaurant_tables").select("*").eq("restaurant_id", demoRestaurantId);
    testTable = tables.find(t => t.table_number === "T3") || tables[0];

    // Ensure we have at least 1 available dish
    let { data: dishes } = await sb.from("dishes").select("*").eq("restaurant_id", demoRestaurantId).eq("is_available", true);
    if (!dishes || dishes.length === 0) {
      // Seed a temp dish
      const { data: cat } = await sb.from("categories").insert({ restaurant_id: demoRestaurantId, name: "Temp Concurrency Cat" }).select("id").single();
      categoriesToCleanup.push(cat.id);
      const { data: dish } = await sb.from("dishes").insert({ restaurant_id: demoRestaurantId, category_id: cat.id, name: "Temp Concurrency Dish", price: 100, is_available: true }).select("*").single();
      dishesToCleanup.push(dish.id);
      testDish = dish;
    } else {
      testDish = dishes[0];
    }

    console.log(`📍 Test Target Restaurant: ${demoRestaurantId}, Table: ${testTable.table_number}, Dish: ${testDish.name}\n`);

    // Helper fetch
    async function apiFetch(path, options = {}, authRole = "none", customToken = "", extraHeaders = {}) {
      const headers = { ...options.headers, ...extraHeaders };
      if (authRole === "admin") {
        headers["Cookie"] = adminCookie;
      } else if (authRole === "customer" && customToken) {
        headers["Cookie"] = `session_token=${customToken}`;
      }
      if (options.body && typeof options.body === "object") {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
      }
      const start = performance.now();
      const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      const duration = performance.now() - start;
      let body = null;
      try { body = await res.json(); } catch {}
      return { status: res.status, body, duration };
    }

    // Helper to bootstrap fresh isolated session
    async function bootstrapSession() {
      // Force close any existing sessions and release table
      await sb.from("sessions").update({ status: "closed", closed_at: new Date().toISOString() }).eq("table_id", testTable.id).eq("status", "active");
      await sb.from("restaurant_tables").update({ status: "available", current_session_id: null }).eq("id", testTable.id);

      const qrToken = testTable.qr_token || "00000000-0000-0000-0000-000000000003";
      if (!testTable.qr_token) {
        await sb.from("restaurant_tables").update({ qr_token: qrToken }).eq("id", testTable.id);
      }
      const res = await apiFetch(`/api/v1/sessions/bootstrap`, {
        method: "POST",
        body: { tableId: testTable.id, qrToken },
      });
      if (res.status !== 200 || !res.body?.data?.sessionId) {
        throw new Error(`Failed to bootstrap session: ${JSON.stringify(res.body)}`);
      }
      const { sessionId, sessionToken } = res.body.data;
      sessionsToCleanup.push(sessionId);
      return { sessionId, sessionToken };
    }

    // Assert session total matches sum of orders
    async function assertReconciliation(sessionId) {
      const { data: orders } = await sb.from("orders").select("grand_total").eq("session_id", sessionId);
      const { data: session } = await sb.from("sessions").select("total_amount").eq("id", sessionId).single();
      const expectedTotal = orders.reduce((sum, o) => sum + Number(o.grand_total), 0);
      const actualTotal = Number(session.total_amount);
      if (actualTotal !== expectedTotal) {
        throw new Error(`Reconciliation failure: session total = ${actualTotal}, orders sum = ${expectedTotal}`);
      }
      return expectedTotal;
    }

    // -------------------------------------------------------------
    // ISSUE 1: Atomic session total updates under concurrency
    // -------------------------------------------------------------
    console.log("── Verify Issue 1: Atomic increment safety ────────────────");
    const session1 = await bootstrapSession();
    const orderPayload = {
      tableId: testTable.id,
      sessionId: session1.sessionId,
      items: [{ dishId: testDish.id, quantity: 1 }],
    };

    // Fire 50 concurrent orders
    console.log("  ⏳ Dispatching 50 concurrent orders...");
    const reqs = Array.from({ length: 50 }, () =>
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: orderPayload }, "customer", session1.sessionToken)
    );
    const responses = await Promise.all(reqs);

    const successfulOrders = responses.filter(r => r.status === 201).length;
    let reconciledTotal = 0;
    let reconciled = false;
    let reconciliationErrorMsg = "";

    try {
      reconciledTotal = await assertReconciliation(session1.sessionId);
      reconciled = true;
    } catch (err) {
      reconciliationErrorMsg = err.message;
    }

    // Performance threshold checks
    const placeDurations = responses.map(r => r.duration);
    const placeAvg = placeDurations.reduce((s, x) => s + x, 0) / placeDurations.length;
    const perfPlacePass = placeAvg < 500;

    console.log(`  📊 Session 1 total updates: successful orders = ${successfulOrders}, session total = ${reconciledTotal}, avg latency = ${placeAvg.toFixed(1)}ms`);

    if (reconciled && successfulOrders === 50) {
      logResult("test_concurrent_session_total_updates", "Concurrent Session Total Updates", "PASS", `Average Place Latency: ${placeAvg.toFixed(1)}ms (${perfPlacePass ? "PASS" : "FAIL" < "500ms"})`);
    } else {
      logResult("test_concurrent_session_total_updates", "Concurrent Session Total Updates", "FAIL", `Successful: ${successfulOrders}/50, Error: ${reconciliationErrorMsg}`);
    }
    console.log();

    // -------------------------------------------------------------
    // ISSUE 2: Order Idempotency
    // -------------------------------------------------------------
    console.log("── Verify Issue 2: Order Idempotency ─────────────────────");
    
    // test_duplicate_order_same_key
    const session2a = await bootstrapSession();
    const idempotencyKeyA = crypto.randomUUID();
    const payloadSameKey = {
      tableId: testTable.id,
      sessionId: session2a.sessionId,
      items: [{ dishId: testDish.id, quantity: 1 }],
    };

    const doubleReqs = [
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payloadSameKey }, "customer", session2a.sessionToken, { "Idempotency-Key": idempotencyKeyA }),
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payloadSameKey }, "customer", session2a.sessionToken, { "Idempotency-Key": idempotencyKeyA }),
    ];
    const doubleRes = await Promise.all(doubleReqs);
    const sameKeyCodes = doubleRes.map(r => r.status);
    const sameKeyDurations = doubleRes.map(r => r.duration);

    const { data: ordersSameKey } = await sb.from("orders").select("*").eq("session_id", session2a.sessionId);
    const sameKeyReconciled = ordersSameKey.length === 1;

    // Performance Acceptance Criteria for replay
    const replayDuration = doubleRes[1].duration;
    const perfReplayPass = replayDuration < 150;

    if (sameKeyReconciled && sameKeyCodes.includes(201) && (sameKeyCodes.includes(200) || sameKeyCodes.includes(201))) {
      logResult("test_duplicate_order_same_key", "Duplicate Order Same Key", "PASS", `Orders: ${ordersSameKey.length}, Replay: ${replayDuration.toFixed(1)}ms (${perfReplayPass ? "PASS" : "FAIL" < "150ms"})`);
    } else {
      logResult("test_duplicate_order_same_key", "Duplicate Order Same Key", "FAIL", `Orders: ${ordersSameKey.length}, Statuses: [${sameKeyCodes.join(",")}]`);
    }

    // test_duplicate_order_different_key
    const session2b = await bootstrapSession();
    const idempotencyKeyB1 = crypto.randomUUID();
    const idempotencyKeyB2 = crypto.randomUUID();
    const payloadDiffKeys = {
      tableId: testTable.id,
      sessionId: session2b.sessionId,
      items: [{ dishId: testDish.id, quantity: 1 }],
    };

    const diffReqs = [
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payloadDiffKeys }, "customer", session2b.sessionToken, { "Idempotency-Key": idempotencyKeyB1 }),
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payloadDiffKeys }, "customer", session2b.sessionToken, { "Idempotency-Key": idempotencyKeyB2 }),
    ];
    const diffRes = await Promise.all(diffReqs);
    const { data: ordersDiffKey } = await sb.from("orders").select("*").eq("session_id", session2b.sessionId);
    
    if (ordersDiffKey.length === 2 && diffRes.every(r => r.status === 201)) {
      logResult("test_duplicate_order_different_key", "Duplicate Order Different Key", "PASS", "Two separate orders created");
    } else {
      logResult("test_duplicate_order_different_key", "Duplicate Order Different Key", "FAIL", `Orders created: ${ordersDiffKey.length}`);
    }

    // test_retry_after_timeout (same key + same payload, sent sequentially)
    const session2c = await bootstrapSession();
    const idempotencyKeyC = crypto.randomUUID();
    const payloadRetry = {
      tableId: testTable.id,
      sessionId: session2c.sessionId,
      items: [{ dishId: testDish.id, quantity: 2 }],
    };

    const firstTry = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payloadRetry }, "customer", session2c.sessionToken, { "Idempotency-Key": idempotencyKeyC });
    const secondTry = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payloadRetry }, "customer", session2c.sessionToken, { "Idempotency-Key": idempotencyKeyC });

    const { data: ordersRetry } = await sb.from("orders").select("*").eq("session_id", session2c.sessionId);
    const retrySuccessful = ordersRetry.length === 1 && firstTry.status === 201 && secondTry.status === 200;

    if (retrySuccessful) {
      logResult("test_retry_after_timeout", "Retry Safety after Timeout", "PASS", "Original order returned, no duplicate created");
    } else {
      logResult("test_retry_after_timeout", "Retry Safety after Timeout", "FAIL", `Orders: ${ordersRetry.length}, First status: ${firstTry.status}, Second status: ${secondTry.status}`);
    }

    // Same key + different payload returns 409 Conflict check
    const session2d = await bootstrapSession();
    const idempotencyKeyD = crypto.randomUUID();
    const payloadD1 = { tableId: testTable.id, sessionId: session2d.sessionId, items: [{ dishId: testDish.id, quantity: 1 }] };
    const payloadD2 = { tableId: testTable.id, sessionId: session2d.sessionId, items: [{ dishId: testDish.id, quantity: 2 }] };

    const firstTryD = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payloadD1 }, "customer", session2d.sessionToken, { "Idempotency-Key": idempotencyKeyD });
    const secondTryD = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payloadD2 }, "customer", session2d.sessionToken, { "Idempotency-Key": idempotencyKeyD });

    if (firstTryD.status === 201 && secondTryD.status === 409) {
      logResult("test_key_conflict_different_payload", "Idempotency Key Conflict Different Payload", "PASS", "Conflict rejected with 409");
    } else {
      logResult("test_key_conflict_different_payload", "Idempotency Key Conflict Different Payload", "FAIL", `Statuses: First=${firstTryD.status}, Second=${secondTryD.status}`);
    }
    console.log();

    // -------------------------------------------------------------
    // ISSUE 3: Payment Double Submission
    // -------------------------------------------------------------
    console.log("── Verify Issue 3: Payment Double Submit ─────────────────");
    const session3 = await bootstrapSession();
    const t3_order = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
      method: "POST",
      body: { tableId: testTable.id, sessionId: session3.sessionId, items: [{ dishId: testDish.id, quantity: 1 }] }
    }, "customer", session3.sessionToken);

    const orderGrandTotal = Number(t3_order.body?.data?.order?.grand_total || 0);

    const payReqs = [
      apiFetch(`/api/v1/billing`, { method: "POST", body: { sessionId: session3.sessionId, method: "cash", amountPaid: orderGrandTotal } }, "admin"),
      apiFetch(`/api/v1/billing`, { method: "POST", body: { sessionId: session3.sessionId, method: "cash", amountPaid: orderGrandTotal } }, "admin"),
    ];

    const payRes = await Promise.all(payReqs);
    const payStatusCodes = payRes.map(r => r.status);
    const payDurations = payRes.map(r => r.duration);

    const { data: t3_payments } = await sb.from("payments").select("*").eq("session_id", session3.sessionId);
    const { data: t3_invoices } = await sb.from("invoices").select("*").in("payment_id", t3_payments.map(p => p.id));
    const { data: t3_session } = await sb.from("sessions").select("*").eq("id", session3.sessionId).single();
    const { data: t3_table } = await sb.from("restaurant_tables").select("*").eq("id", testTable.id).single();

    const payAvg = payDurations.reduce((s, x) => s + x, 0) / payDurations.length;
    const perfPayPass = payAvg < 500;

    const singleBillingOk = t3_payments.length === 1 && t3_invoices.length === 1 && t3_session.status === "closed" && t3_table.status === "available";
    const oneConflictCode = payStatusCodes.includes(409);

    if (singleBillingOk && oneConflictCode) {
      logResult("test_concurrent_payment_confirmation", "Payment Double Submit Protection", "PASS", `Payments: 1, Invoices: 1, Conflict status: 409, Latency: ${payAvg.toFixed(1)}ms (${perfPayPass ? "PASS" : "FAIL" < "500ms"})`);
    } else {
      logResult("test_concurrent_payment_confirmation", "Payment Double Submit Protection", "FAIL", `Payments: ${t3_payments.length}, Invoices: ${t3_invoices.length}, Codes: [${payStatusCodes.join(",")}]`);
    }
    console.log();

    // -------------------------------------------------------------
    // ISSUE 4: Database Consistency Invariants
    // -------------------------------------------------------------
    console.log("── Verify Issue 4: Database Invariants ───────────────────");

    // verifyFinancialIntegrity
    const { data: activeSessions } = await sb.from("sessions").select("id, total_amount").eq("status", "active");
    let financialIntegrityPass = true;
    for (const s of activeSessions || []) {
      const { data: sOrders } = await sb.from("orders").select("grand_total").eq("session_id", s.id);
      const expected = sOrders.reduce((sum, o) => sum + Number(o.grand_total), 0);
      if (Number(s.total_amount) !== expected) {
        financialIntegrityPass = false;
        break;
      }
    }
    logResult("verify_financial_integrity", "Database Invariant: verifyFinancialIntegrity", financialIntegrityPass ? "PASS" : "FAIL");

    // verifyNoDuplicatePayments
    const { data: allSessions } = await sb.from("sessions").select("id");
    let duplicatePaymentsPass = true;
    for (const s of allSessions || []) {
      const { data: sPayments } = await sb.from("payments").select("id").eq("session_id", s.id);
      if (sPayments.length > 1) {
        duplicatePaymentsPass = false;
        break;
      }
    }
    logResult("verify_no_duplicate_payments", "Database Invariant: verifyNoDuplicatePayments (max 1 payment/session)", duplicatePaymentsPass ? "PASS" : "FAIL");

    // verifyNoDuplicateInvoices (Invoice duplication protection: COUNT(invoices) <= 1 per session)
    let duplicateInvoicesPass = true;
    for (const s of allSessions || []) {
      const { data: sPayments } = await sb.from("payments").select("id").eq("session_id", s.id);
      if (sPayments.length > 0) {
        const { data: sInvoices } = await sb.from("invoices").select("id").in("payment_id", sPayments.map(p => p.id));
        if (sInvoices.length > 1) {
          duplicateInvoicesPass = false;
          break;
        }
      }
    }
    logResult("verify_no_duplicate_invoices", "Database Invariant: verifyNoDuplicateInvoices (max 1 invoice/session)", duplicateInvoicesPass ? "PASS" : "FAIL");

    // verifyNoOrphans
    const { data: orphanOrders } = await sb.from("orders").select("id, session_id");
    const { data: orphanPayments } = await sb.from("payments").select("id, session_id");
    const { data: orphanInvoices } = await sb.from("invoices").select("id, payment_id");

    const ordersOrphansCount = orphanOrders.filter(o => !o.session_id).length;
    const paymentsOrphansCount = orphanPayments.filter(p => !p.session_id).length;
    const invoicesOrphansCount = orphanInvoices.filter(i => !i.payment_id).length;
    const orphansPass = ordersOrphansCount === 0 && paymentsOrphansCount === 0 && invoicesOrphansCount === 0;

    logResult("verify_no_orphans", "Database Invariant: verifyNoOrphans", orphansPass ? "PASS" : "FAIL", `Orphans: Orders=${ordersOrphansCount}, Payments=${paymentsOrphansCount}, Invoices=${invoicesOrphansCount}`);

    // verifyTableStateConsistency
    const { data: activeSessionsSet } = await sb.from("sessions").select("id").eq("status", "active");
    const activeSessionIds = new Set(activeSessionsSet.map(s => s.id));
    const { data: inconsistentTables } = await sb.from("restaurant_tables").select("id, table_number, current_session_id, status");
    const tableConsistencyFailures = inconsistentTables.filter(t => t.current_session_id && !activeSessionIds.has(t.current_session_id)).length;

    logResult("verify_table_state_consistency", "Database Invariant: verifyTableStateConsistency (closed session released table)", tableConsistencyFailures === 0 ? "PASS" : "FAIL", `Dangling lock tables count: ${tableConsistencyFailures}`);
    console.log();

    // -------------------------------------------------------------
    // ISSUE 5: HIGH CONTENTION STRESS SUITE (50 concurrent orders)
    // -------------------------------------------------------------
    console.log("── Verify Issue 5: High Contention Stress Suite ──────────");
    const sessionStress = await bootstrapSession();
    const stressPayload = {
      tableId: testTable.id,
      sessionId: sessionStress.sessionId,
      items: [{ dishId: testDish.id, quantity: 1 }],
    };

    console.log("  ⏳ Dispatching 50 concurrent ordering requests...");
    const stressReqs = Array.from({ length: 50 }, () =>
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: stressPayload }, "customer", sessionStress.sessionToken)
    );
    const stressRes = await Promise.all(stressReqs);

    const stressErrors = stressRes.filter(r => r.status >= 500).length;
    const stressSuccesses = stressRes.filter(r => r.status === 201).length;

    let stressReconciled = false;
    let stressTotal = 0;
    try {
      stressTotal = await assertReconciliation(sessionStress.sessionId);
      stressReconciled = true;
    } catch {}

    const stressInvariants = stressErrors === 0 && stressSuccesses === 50 && stressReconciled;

    if (stressInvariants) {
      logResult("high_contention_stress_test", "High Contention Stress Test (50 Requests)", "PASS", `0 server errors, session total reconciled exactly (${stressTotal})`);
    } else {
      logResult("high_contention_stress_test", "High Contention Stress Test (50 Requests)", "FAIL", `Errors: ${stressErrors}, Success: ${stressSuccesses}, Reconciled: ${stressReconciled}`);
    }
    console.log();

  } catch (err) {
    console.error("\n❌ CRITICAL REGRESSION TEST FAILURE:", err.message);
    process.exit(1);
  } finally {
    // -------------------------------------------------------------
    // CLEANUP & HYGIENE
    // -------------------------------------------------------------
    console.log("🧹 Running DB Cleanup & Hygiene...");
    try {
      if (sessionsToCleanup.length > 0) {
        const { data: orders } = await sb.from("orders").select("id").in("session_id", sessionsToCleanup);
        const orderIds = (orders || []).map(o => o.id);
        
        if (orderIds.length > 0) {
          await sb.from("order_items").delete().in("order_id", orderIds);
          await sb.from("orders").delete().in("id", orderIds);
        }

        const { data: payments } = await sb.from("payments").select("id").in("session_id", sessionsToCleanup);
        const paymentIds = (payments || []).map(p => p.id);
        if (paymentIds.length > 0) {
          await sb.from("invoices").delete().in("payment_id", paymentIds);
          await sb.from("payments").delete().in("session_id", sessionsToCleanup);
        }

        // Clean idempotency keys
        await sb.from("idempotency_keys").delete().in("session_id", sessionsToCleanup);

        await sb.from("sessions").delete().in("id", sessionsToCleanup);
        console.log(`  - Deleted ${sessionsToCleanup.length} test sessions, orders, and payments.`);
      }

      for (const catId of categoriesToCleanup) {
        await sb.from("categories").delete().eq("id", catId);
      }
      for (const dishId of dishesToCleanup) {
        await sb.from("dishes").delete().eq("id", dishId);
      }

      if (testTable) {
        await sb.from("restaurant_tables").update({ status: "available", current_session_id: null }).eq("id", testTable.id);
        console.log(`  - Released table ${testTable.table_number}`);
      }

      console.log("✅ DB Cleanup Complete!\n");
    } catch (cleanupErr) {
      console.error("⚠️ Cleanup Error:", cleanupErr.message);
    }

    const totalTests = Object.keys(report.tests).length;
    console.log("============================================================");
    console.log(`CONCURRENCY AUDIT RESULT: ${report.failed === 0 ? "PASS" : "FAIL"}`);
    console.log(`PASSED TESTS: ${report.passed}/${totalTests}`);
    console.log(`FAILED TESTS: ${report.failed}/${totalTests}`);
    console.log("============================================================\n");
    
    if (report.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

run().catch(console.error);
