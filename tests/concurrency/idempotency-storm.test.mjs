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

async function run() {
  console.log("\n⚡ STARTING IDEMPOTENCY STORM TEST (100 CONCURRENT REQUESTS) ⚡");
  console.log(`🔗 Application URL: ${BASE_URL}\n`);

  let adminCookie = "";
  let demoRestaurantId = null;
  let testTable = null;
  let testDish = null;

  try {
    // Authenticate Admin to detect working cookie format
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

    // Fetch demo restaurant and table
    const { data: rest } = await sb.from("restaurants").select("id").eq("slug", "menuara-demo").single();
    demoRestaurantId = rest.id;

    const { data: tables } = await sb.from("restaurant_tables").select("*").eq("restaurant_id", demoRestaurantId);
    testTable = tables.find(t => t.table_number === "T3") || tables[0];

    // Ensure we have an available dish
    let { data: dishes } = await sb.from("dishes").select("*").eq("restaurant_id", demoRestaurantId).eq("is_available", true);
    if (!dishes || dishes.length === 0) {
      throw new Error("No available dishes found for test.");
    }
    testDish = dishes[0];

    console.log(`📍 Test Target Restaurant: ${demoRestaurantId}, Table: ${testTable.table_number}, Dish: ${testDish.name}`);

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

    // Dispatch 100 identical requests
    const idempotencyKey = crypto.randomUUID();
    const orderPayload = {
      tableId: testTable.id,
      sessionId: sessionId,
      items: [{ dishId: testDish.id, quantity: 1 }],
    };

    console.log(`\n⏳ Dispatching 100 concurrent ordering requests with key: ${idempotencyKey}...`);
    const reqs = Array.from({ length: 100 }, () =>
      apiFetch(`/api/v1/orders?restaurantId=${demoRestaurantId}&mode=place`, {
        method: "POST",
        body: orderPayload
      }, "customer", sessionToken, { "Idempotency-Key": idempotencyKey })
    );

    const responses = await Promise.all(reqs);

    const statuses = responses.map(r => r.status);
    const statusCounts = {};
    statuses.forEach(s => {
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    console.log("\n📊 Response Status Codes Counts:", statusCounts);

    // Verify DB State
    const { data: dbOrders } = await sb.from("orders").select("*").eq("session_id", sessionId);
    const { data: dbSession } = await sb.from("sessions").select("*").eq("id", sessionId).single();

    console.log(`🔍 Orders created in DB: ${dbOrders.length}`);
    console.log(`🔍 Session Total in DB: ${dbSession.total_amount}`);

    const singleOrderCreated = dbOrders.length === 1;
    const correctSessionTotal = Number(dbSession.total_amount) === Number(dbOrders[0]?.grand_total ?? 0);
    const hasOne21 = statusCounts[211] > 0 || statusCounts[201] > 0;
    
    // Check if the responses are clean (either 201 Created or 200 OK replay or 409 Conflict if timeout happened under high contention)
    const successStatusCodes = statuses.filter(s => s === 201 || s === 200).length;
    console.log(`🔍 Clean responses (201/200): ${successStatusCodes}/100`);

    if (singleOrderCreated && correctSessionTotal) {
      console.log("\n✅ IDEMPOTENCY STORM TEST PASSED!");
      console.log("- Exactly 1 order created.");
      console.log("- Session total matches order amount.");
      console.log("- 0 duplicates found.");
      
      // Cleanup
      await sb.from("order_items").delete().eq("order_id", dbOrders[0].id);
      await sb.from("orders").delete().eq("id", dbOrders[0].id);
      await sb.from("idempotency_keys").delete().eq("session_id", sessionId);
      await sb.from("sessions").delete().eq("id", sessionId);
      await sb.from("restaurant_tables").update({ status: "available", current_session_id: null }).eq("id", testTable.id);
      console.log("🧹 DB Cleanup complete.\n");
      process.exit(0);
    } else {
      console.error("\n❌ IDEMPOTENCY STORM TEST FAILED!");
      console.error(`Expected 1 order, found: ${dbOrders.length}`);
      process.exit(1);
    }

  } catch (err) {
    console.error("\n❌ CRITICAL STORM TEST EXCEPTION:", err.message);
    process.exit(1);
  }
}

run().catch(console.error);
