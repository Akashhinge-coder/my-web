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
  verdict: "PENDING",
  passed: 0,
  failed: 0,
  tests: {},
};

function logTestResult(testKey, name, status, notes = "", details = null) {
  const emoji = status === "PASS" ? "✅" : status === "WARN" ? "⚠️" : "❌";
  console.log(`  ${emoji} [${testKey.toUpperCase()}] ${name} -> ${status}${notes ? " (" + notes + ")" : ""}`);
  report.tests[testKey] = { name, status, notes, details };
  if (status === "PASS") report.passed++;
  else report.failed++;
}

async function run() {
  console.log("\n⚡ STARTING P1-CONCURRENCY & FAILURE RECOVERY AUDIT ⚡");
  console.log(`🔗 Application URL: ${BASE_URL}\n`);

  let adminCookie = "";
  let demoRestaurantId = null;
  let testTable = null;
  let testDish = null;
  let testDish2 = null;

  // Trackers for general cleanup
  const sessionsToCleanup = [];
  const categoriesToCleanup = [];
  const dishesToCleanup = [];

  try {
    // -------------------------------------------------------------
    // AUTHENTICATE ADMIN & DETECT COOKIE FORMAT
    // -------------------------------------------------------------
    console.log("🔑 Authenticating Admin...");
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

    // Fetch details
    const { data: rest } = await sb.from("restaurants").select("id").eq("slug", "menuara-demo").single();
    demoRestaurantId = rest.id;

    const { data: tables } = await sb.from("restaurant_tables").select("*").eq("restaurant_id", demoRestaurantId);
    testTable = tables.find(t => t.table_number === "T3") || tables[0];

    // Check available dishes
    let { data: dishes } = await sb.from("dishes").select("*").eq("restaurant_id", demoRestaurantId).eq("is_available", true);
    
    if (!dishes || dishes.length < 2) {
      console.log("  ⚠️ Less than 2 available dishes found in DB. Dynamically seeding temporary dishes for the audit...");
      
      let catId;
      const { data: existingCat } = await sb.from("categories").select("id").eq("restaurant_id", demoRestaurantId).eq("name", "Audit Seed Category").maybeSingle();
      if (existingCat) {
        catId = existingCat.id;
      } else {
        const { data: newCat, error: catErr } = await sb.from("categories").insert({
          restaurant_id: demoRestaurantId,
          name: "Audit Seed Category",
          sort_order: 1
        }).select("id").single();
        if (catErr) throw new Error(`Failed to create temp category: ${catErr.message}`);
        catId = newCat.id;
        categoriesToCleanup.push(catId);
      }

      const dishInserts = [
        { restaurant_id: demoRestaurantId, category_id: catId, name: "Audit Seed Dish 1", price: 100, is_available: true },
        { restaurant_id: demoRestaurantId, category_id: catId, name: "Audit Seed Dish 2", price: 150, is_available: true },
      ];
      
      const { data: newDishes, error: dishErr } = await sb.from("dishes").insert(dishInserts).select("*");
      if (dishErr) throw new Error(`Failed to create temp dishes: ${dishErr.message}`);
      
      newDishes.forEach(d => dishesToCleanup.push(d.id));
      dishes = newDishes;
    }

    testDish = dishes[0];
    testDish2 = dishes[1];
    console.log(`📍 Testing with Table: ${testTable.table_number}, Dish 1: ${testDish.name}, Dish 2: ${testDish2.name}\n`);

    // Helper fetch function
    async function apiFetch(path, options = {}, authRole = "none", customToken = "") {
      const headers = { ...options.headers };
      if (authRole === "admin") {
        headers["Cookie"] = adminCookie;
      } else if (authRole === "customer" && customToken) {
        headers["Cookie"] = `session_token=${customToken}`;
      }
      if (options.body && typeof options.body === "object") {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
      }
      const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      let body = null;
      try { body = await res.json(); } catch {}
      return { status: res.status, body };
    }

    // Helper to bootstrap a fresh active session
    async function bootstrapSession() {
      // Force close any existing active sessions for this table
      await sb.from("sessions").update({ status: "closed", closed_at: new Date().toISOString() }).eq("table_id", testTable.id).eq("status", "active");

      // Force release any existing session/table lock first to ensure complete isolation
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

    // =============================================================
    // TEST 1 — Duplicate Order Submission & Idempotency
    // =============================================================
    console.log("── TEST 1: Duplicate Order Submission ────────────────────");
    const session1 = await bootstrapSession();

    // Fire duplicate orders simultaneously
    const orderPayload = {
      tableId: testTable.id,
      sessionId: session1.sessionId,
      items: [{ dishId: testDish.id, quantity: 2 }],
    };

    const t1_key = crypto.randomUUID();
    const t1_reqs = [
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: orderPayload, headers: { "Idempotency-Key": t1_key } }, "customer", session1.sessionToken),
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: orderPayload, headers: { "Idempotency-Key": t1_key } }, "customer", session1.sessionToken),
    ];

    const t1_res = await Promise.all(t1_reqs);
    
    // Check DB state
    const { data: t1_orders } = await sb.from("orders").select("*").eq("session_id", session1.sessionId);
    const { data: t1_session } = await sb.from("sessions").select("*").eq("id", session1.sessionId).single();

    console.log(`  📊 Duplicate Submit: Orders Created = ${t1_orders.length}, Session Total = ${t1_session.total_amount}`);
    
    if (t1_orders.length === 1) {
      logTestResult("test1_duplicate_order", "Duplicate Order Submission", "PASS", "Exactly 1 order created", t1_res);
    } else {
      const expectedTotal = Number(t1_orders.reduce((sum, o) => sum + Number(o.grand_total), 0));
      const drift = Number(t1_session.total_amount) !== expectedTotal;
      logTestResult("test1_duplicate_order", "Duplicate Order Submission", "WARN", 
                    `Duplicates allowed (${t1_orders.length} orders created). Drift: ${drift ? "YES" : "NO"}`, t1_res);
    }
    console.log();

    // =============================================================
    // TEST 2 — Payment Double Submit
    // =============================================================
    console.log("── TEST 2: Payment Double Submit ────────────────────────");
    const session2 = await bootstrapSession();
    const t2_order = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
      method: "POST",
      body: { tableId: testTable.id, sessionId: session2.sessionId, items: [{ dishId: testDish.id, quantity: 1 }] }
    }, "customer", session2.sessionToken);

    const orderGrandTotal = Number(t2_order.body?.data?.order?.grand_total || 0);

    const t2_reqs = [
      apiFetch(`/api/v1/billing`, { method: "POST", body: { sessionId: session2.sessionId, method: "cash", amountPaid: orderGrandTotal } }, "admin"),
      apiFetch(`/api/v1/billing`, { method: "POST", body: { sessionId: session2.sessionId, method: "cash", amountPaid: orderGrandTotal } }, "admin"),
    ];

    const t2_res = await Promise.all(t2_reqs);

    const { data: t2_payments } = await sb.from("payments").select("*").eq("session_id", session2.sessionId);
    const { data: t2_invoices } = await sb.from("invoices").select("*").in("payment_id", t2_payments.map(p => p.id));
    const { data: t2_session } = await sb.from("sessions").select("*").eq("id", session2.sessionId).single();
    const { data: t2_table } = await sb.from("restaurant_tables").select("*").eq("id", testTable.id).single();

    console.log(`  📊 Double Payment: Payments = ${t2_payments.length}, Invoices = ${t2_invoices.length}, Session = ${t2_session.status}`);

    if (t2_payments.length === 1 && t2_invoices.length === 1 && t2_session.status === "closed" && t2_table.status === "available") {
      logTestResult("test2_double_payment", "Payment Double Submit Protection", "PASS", "Only 1 payment/invoice created, session closed, table released", t2_res);
    } else {
      logTestResult("test2_double_payment", "Payment Double Submit Protection", "WARN", 
                    `Failures: Payments=${t2_payments.length}, Invoices=${t2_invoices.length}`, t2_res);
    }
    console.log();

    // =============================================================
    // TEST 3 — Multi-Tab Ordering & Financial Consistency
    // =============================================================
    console.log("── TEST 3: Multi-Tab Ordering ───────────────────────────");
    const session3 = await bootstrapSession();

    const t3_reqs = [
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
        method: "POST",
        body: { tableId: testTable.id, sessionId: session3.sessionId, items: [{ dishId: testDish.id, quantity: 1 }] }
      }, "customer", session3.sessionToken),
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
        method: "POST",
        body: { tableId: testTable.id, sessionId: session3.sessionId, items: [{ dishId: testDish2.id, quantity: 1 }] }
      }, "customer", session3.sessionToken),
    ];

    const t3_res = await Promise.all(t3_reqs);

    const { data: t3_orders } = await sb.from("orders").select("grand_total").eq("session_id", session3.sessionId);
    const { data: t3_session } = await sb.from("sessions").select("total_amount").eq("id", session3.sessionId).single();

    const sumOrders = t3_orders.reduce((sum, o) => sum + Number(o.grand_total), 0);
    const reconciled = Number(t3_session.total_amount) === sumOrders;

    console.log(`  📊 Multi-Tab: Orders Count = ${t3_orders.length}, Sum Grand Totals = ${sumOrders}, Session Total = ${t3_session.total_amount}`);

    if (reconciled && t3_orders.length === 2) {
      logTestResult("test3_multi_tab", "Multi-Tab Ordering Financial Reconcile", "PASS", "Session total matches sum of orders", t3_res);
    } else {
      logTestResult("test3_multi_tab", "Multi-Tab Ordering Financial Reconcile", "FAIL", 
                    `Financial drift detected: Session Total=${t3_session.total_amount}, Orders Sum=${sumOrders}`, t3_res);
    }
    console.log();

    // =============================================================
    // TEST 4 — Session Closure Race
    // =============================================================
    console.log("── TEST 4: Session Closure Race ─────────────────────────");
    const session4 = await bootstrapSession();
    const t4_order = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
      method: "POST",
      body: { tableId: testTable.id, sessionId: session4.sessionId, items: [{ dishId: testDish.id, quantity: 1 }] }
    }, "customer", session4.sessionToken);
    const t4_total = Number(t4_order.body?.data?.order?.grand_total || 0);

    const t4_reqs = [
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
        method: "POST",
        body: { tableId: testTable.id, sessionId: session4.sessionId, items: [{ dishId: testDish.id, quantity: 1 }] }
      }, "customer", session4.sessionToken),
      apiFetch(`/api/v1/billing`, { method: "POST", body: { sessionId: session4.sessionId, method: "cash", amountPaid: t4_total } }, "admin"),
    ];

    const t4_res = await Promise.all(t4_reqs);

    const { data: t4_orders } = await sb.from("orders").select("*").eq("session_id", session4.sessionId);
    const { data: t4_session } = await sb.from("sessions").select("*").eq("id", session4.sessionId).single();

    const orderRes = t4_res[0];
    const billRes = t4_res[1];

    console.log(`  📊 Session Closure Race: Order Status = ${orderRes.status}, Billing Status = ${billRes.status}, Final Session Status = ${t4_session.status}`);

    let closureRacePass = false;
    if (t4_session.status === "closed") {
      if (orderRes.status === 201 && t4_orders.length === 2) {
        closureRacePass = true;
      } else if ((orderRes.status === 400 || orderRes.status === 422 || orderRes.status === 401) && t4_orders.length === 1) {
        closureRacePass = true;
      }
    } else if (t4_session.status === "active") {
      if (orderRes.status === 201 && (billRes.status === 422 || billRes.status === 409) && t4_orders.length === 2) {
        closureRacePass = true;
      }
    }

    logTestResult("test4_closure_race", "Session Closure Race Integrity", closureRacePass ? "PASS" : "FAIL",
                  `Order: ${orderRes.status}, Bill: ${billRes.status}, Orders Created: ${t4_orders.length}`, t4_res);
    console.log();

    // =============================================================
    // TEST 5 — Concurrent Order Status Updates
    // =============================================================
    console.log("── TEST 5: Concurrent Order Status Updates ──────────────");
    const session5 = await bootstrapSession();
    const t5_order_res = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
      method: "POST",
      body: { tableId: testTable.id, sessionId: session5.sessionId, items: [{ dishId: testDish.id, quantity: 1 }] }
    }, "customer", session5.sessionToken);

    const t5_orderId = t5_order_res.body?.data?.order?.id;

    if (t5_orderId) {
      const t5_reqs = [
        apiFetch(`/api/v1/orders/${t5_orderId}?restaurantId=${demoRestaurantId}`, { method: "PATCH", body: { status: "cooking" } }, "admin"),
        apiFetch(`/api/v1/orders/${t5_orderId}?restaurantId=${demoRestaurantId}`, { method: "PATCH", body: { status: "served" } }, "admin"),
        apiFetch(`/api/v1/orders/${t5_orderId}?restaurantId=${demoRestaurantId}`, { method: "PATCH", body: { status: "cancelled" } }, "admin"),
      ];

      const t5_res = await Promise.all(t5_reqs);

      const { data: t5_order } = await sb.from("orders").select("status").eq("id", t5_orderId).single();
      console.log(`  📊 Status Update Race: Responses = [${t5_res.map(r => r.status).join(",")}], Final Status = ${t5_order.status}`);

      const validStatuses = ["cooking", "served", "cancelled"];
      const statusValid = validStatuses.includes(t5_order.status);

      const invalid1 = await apiFetch(`/api/v1/orders/${t5_orderId}?restaurantId=${demoRestaurantId}`, { method: "PATCH", body: { status: "cooking" } }, "admin");
      console.log(`  📊 Invalid transition check (to cooking): status = ${invalid1.status}`);

      const transitionRejected = invalid1.status === 400 || invalid1.status === 422 || t5_order.status === "cooking";
      
      logTestResult("test5_status_race", "Concurrent Order Status Transition Integrity", (statusValid && transitionRejected) ? "PASS" : "FAIL",
                    `Final Status: ${t5_order.status}, Reject Invalid: ${invalid1.status}`, t5_res);
    } else {
      logTestResult("test5_status_race", "Concurrent Order Status", "FAIL", "Failed to create test order");
    }
    console.log();

    // =============================================================
    // TEST 6 — Billing Race
    // =============================================================
    console.log("── TEST 6: Billing Race ─────────────────────────────────");
    const session6 = await bootstrapSession();
    const t6_order = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
      method: "POST",
      body: { tableId: testTable.id, sessionId: session6.sessionId, items: [{ dishId: testDish.id, quantity: 1 }] }
    }, "customer", session6.sessionToken);
    const t6_total = Number(t6_order.body?.data?.order?.grand_total || 0);

    const t6_reqs = [
      apiFetch(`/api/v1/billing`, { method: "POST", body: { sessionId: session6.sessionId, method: "cash", amountPaid: t6_total } }, "admin"),
      apiFetch(`/api/v1/billing`, { method: "POST", body: { sessionId: session6.sessionId, method: "cash", amountPaid: t6_total } }, "admin"),
    ];

    const t6_res = await Promise.all(t6_reqs);

    const { data: t6_payments } = await sb.from("payments").select("*").eq("session_id", session6.sessionId);
    const { data: t6_invoices } = await sb.from("invoices").select("*").in("payment_id", t6_payments.map(p => p.id));

    console.log(`  📊 Billing Race: Responses = [${t6_res.map(r => r.status).join(",")}], Payments = ${t6_payments.length}, Invoices = ${t6_invoices.length}`);

    const oneSucceeded = t6_res.filter(r => r.status === 200).length === 1;
    const oneRejected = t6_res.filter(r => r.status === 400 || r.status === 422 || r.status === 409).length === 1;

    if (oneSucceeded && oneRejected && t6_payments.length === 1 && t6_invoices.length === 1) {
      logTestResult("test6_billing_race", "Billing Settlement Race Atomicity", "PASS", "Exactly one payment succeeded, one rejected", t6_res);
    } else {
      logTestResult("test6_billing_race", "Billing Settlement Race Atomicity", "FAIL", 
                    `Double settlement allowed: Payments=${t6_payments.length}, Invoices=${t6_invoices.length}`, t6_res);
    }
    console.log();

    // =============================================================
    // TEST 7 — Retry Safety / Idempotency
    // =============================================================
    console.log("── TEST 7: Retry Safety ──────────────────────────────────");
    const session7 = await bootstrapSession();

    const payload = {
      tableId: testTable.id,
      sessionId: session7.sessionId,
      items: [{ dishId: testDish.id, quantity: 1 }],
    };

    const t7_key = crypto.randomUUID();
    const firstTry = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payload, headers: { "Idempotency-Key": t7_key } }, "customer", session7.sessionToken);
    const retryTry = await apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: payload, headers: { "Idempotency-Key": t7_key } }, "customer", session7.sessionToken);

    const { data: t7_orders } = await sb.from("orders").select("*").eq("session_id", session7.sessionId);

    console.log(`  📊 Retry Safety: Orders Count = ${t7_orders.length}`);

    if (t7_orders.length === 1) {
      logTestResult("test7_retry_safety", "Retry Safety (Idempotency Key)", "PASS", "Original order returned, no duplicates", retryTry.body);
    } else {
      logTestResult("test7_retry_safety", "Retry Safety (Idempotency Key)", "WARN", "Duplicate order created on retry (Idempotency not implemented)", retryTry.body);
    }
    console.log();

    // =============================================================
    // TEST 8 — Transaction Rollback Integrity
    // =============================================================
    console.log("── TEST 8: Transaction Rollback Integrity ───────────────");
    // Create a temporary dish
    const { data: tempCat } = await sb.from("categories").insert({ restaurant_id: demoRestaurantId, name: "Rollback Temp Cat" }).select("id").single();
    categoriesToCleanup.push(tempCat.id);

    const { data: tempDish } = await sb.from("dishes").insert({
      restaurant_id: demoRestaurantId,
      category_id: tempCat.id,
      name: "Rollback Temp Dish",
      price: 100,
      is_available: true,
    }).select("id").single();
    dishesToCleanup.push(tempDish.id);

    const session8 = await bootstrapSession();

    console.log("  ⏳ Initiating order placement for temporary dish...");
    const placePromise = apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
      method: "POST",
      body: { tableId: testTable.id, sessionId: session8.sessionId, items: [{ dishId: tempDish.id, quantity: 1 }] }
    }, "customer", session8.sessionToken);

    await sb.from("dishes").delete().eq("id", tempDish.id);
    console.log("  ⚡ Deleted temporary dish from database concurrently!");

    const t8_res = await placePromise;
    console.log(`  📊 Place Order response: status = ${t8_res.status}`);

    const { data: t8_orders } = await sb.from("orders").select("*").eq("session_id", session8.sessionId);
    const { data: t8_items } = await sb.from("order_items").select("*").in("order_id", t8_orders.map(o => o.id));
    const { data: t8_session } = await sb.from("sessions").select("total_amount").eq("id", session8.sessionId).single();

    console.log(`  📊 Rollback Check: Orders Created = ${t8_orders.length}, Items Created = ${t8_items.length}, Session Total = ${t8_session.total_amount}`);

    const orphanedOrder = t8_orders.length > 0;

    if (!orphanedOrder && Number(t8_session.total_amount) === 0) {
      logTestResult("test8_rollback", "Transaction Rollback Integrity", "PASS", "No order or items created, session total unchanged", t8_res.body);
    } else {
      logTestResult("test8_rollback", "Transaction Rollback Integrity", "FAIL", 
                    `Orphaned order created: ${t8_orders.length} orders exist in DB without items or total matching.`, t8_res.body);
    }
    console.log();

    // =============================================================
    // TEST 10 — High Contention Ordering
    // =============================================================
    console.log("── TEST 10: High Contention Stress Test (50 Requests) ──");
    const session10 = await bootstrapSession();

    const contentionPayload = {
      tableId: testTable.id,
      sessionId: session10.sessionId,
      items: [{ dishId: testDish.id, quantity: 1 }],
    };

    console.log("  ⏳ Dispatching 50 concurrent ordering requests...");
    const t10_reqs = Array.from({ length: 50 }, () => 
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, { method: "POST", body: contentionPayload }, "customer", session10.sessionToken)
    );

    const t10_res = await Promise.all(t10_reqs);

    const { data: t10_orders } = await sb.from("orders").select("grand_total").eq("session_id", session10.sessionId);
    const { data: t10_session } = await sb.from("sessions").select("total_amount").eq("id", session10.sessionId).single();

    const sumT10Orders = t10_orders.reduce((sum, o) => sum + Number(o.grand_total), 0);
    const t10Reconciled = Number(t10_session.total_amount) === sumT10Orders;
    const t10Errors = t10_res.filter(r => r.status >= 500);

    console.log(`  📊 High Contention: Successful API placements = ${t10_res.filter(r => r.status === 201).length}, Orders in DB = ${t10_orders.length}, Session Total = ${t10_session.total_amount}`);

    if (t10Reconciled && t10Errors.length === 0) {
      logTestResult("test10_contention", "High Contention Stress Test", "PASS", 
                    `0 deadlocks/500 errors, session total matches sum of orders (${t10_orders.length} orders)`, t10_res[0].body);
    } else {
      logTestResult("test10_contention", "High Contention Stress Test", "FAIL", 
                    `500 Errors: ${t10Errors.length}, Reconciled: ${t10Reconciled}`, t10_res[0].body);
    }
    console.log();

    // =============================================================
    // TEST 9 — Database Consistency Invariants
    // =============================================================
    console.log("── TEST 9: Database Consistency Invariants Check ────────");

    const { data: orphanOrders } = await sb.from("orders").select("id, session_id");
    const { data: dbSessions } = await sb.from("sessions").select("id");
    const sessionIdsSet = new Set(dbSessions.map(s => s.id));
    const orphanOrdersCount = orphanOrders.filter(o => !o.session_id || !sessionIdsSet.has(o.session_id)).length;

    const { data: orphanPayments } = await sb.from("payments").select("id, session_id");
    const orphanPaymentsCount = orphanPayments.filter(p => !p.session_id || !sessionIdsSet.has(p.session_id)).length;

    const { data: orphanInvoices } = await sb.from("invoices").select("id, payment_id");
    const { data: dbPayments } = await sb.from("payments").select("id");
    const paymentIdsSet = new Set(dbPayments.map(p => p.id));
    const orphanInvoicesCount = orphanInvoices.filter(inv => !inv.payment_id || !paymentIdsSet.has(inv.payment_id)).length;

    const { data: dbTables } = await sb.from("restaurant_tables").select("table_number, current_session_id");
    const invalidTableSessions = dbTables.filter(t => t.current_session_id && !sessionIdsSet.has(t.current_session_id)).length;

    console.log(`  📊 Invariant violations: Orphan Orders = ${orphanOrdersCount}, Orphan Payments = ${orphanPaymentsCount}, Orphan Invoices = ${orphanInvoicesCount}, Invalid Table sessions = ${invalidTableSessions}`);

    const invariantsPassed = orphanOrdersCount === 0 && orphanPaymentsCount === 0 && orphanInvoicesCount === 0 && invalidTableSessions === 0;

    logTestResult("test9_db_consistency", "Database Invariants Checks", invariantsPassed ? "PASS" : "FAIL",
                  `Violations: Orders=${orphanOrdersCount}, Payments=${orphanPaymentsCount}, Invoices=${orphanInvoicesCount}`);
    console.log();

  } catch (err) {
    console.error("\n❌ CRITICAL CONCURRENCY AUDIT FAILURE:", err.message);
    report.verdict = "FAIL";
    report.error = err.message;
  } finally {
    // =============================================================
    // CLEANUP & HYGIENE
    // =============================================================
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
      report.cleanupError = cleanupErr.message;
    }

    const allTestsPass = Object.values(report.tests).every(t => t.status === "PASS");
    report.verdict = allTestsPass ? "PASS" : "FAIL";

    fs.writeFileSync("concurrency-audit-results.json", JSON.stringify(report, null, 2));
    console.log("📄 Detailed report written to concurrency-audit-results.json\n");

    console.log("============================================================");
    console.log(`CONCURRENCY AUDIT VERDICT: ${report.verdict}`);
    console.log(`PASSED TESTS: ${report.passed}`);
    console.log(`FAILED TESTS: ${report.failed}`);
    console.log("============================================================\n");
  }
}

run().catch(console.error);
