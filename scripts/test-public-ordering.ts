import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env.local to load env vars
try {
  const envPath = path.join(process.cwd(), ".env.local");
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const firstEquals = trimmed.indexOf("=");
      if (firstEquals !== -1) {
        const key = trimmed.slice(0, firstEquals).trim();
        const val = trimmed.slice(firstEquals + 1).trim();
        process.env[key] = val;
      }
    }
  }
} catch (err) {
  console.warn("⚠️ Warning: Could not load .env.local manually:", err);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing environment variables in .env.local");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper to generate cryptographically strong session token
function generateHexToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log("🚀 Running Scoped RLS & Session Token Security Proofs...\n");

  // 1. Fetch demo restaurant and demo owner
  const { data: restaurants, error: restError } = await adminClient
    .from("restaurants")
    .select("id")
    .limit(1);

  if (restError || !restaurants || restaurants.length === 0) {
    console.error("❌ Failed to fetch restaurant:", restError?.message);
    process.exit(1);
  }

  const restaurantId = restaurants[0].id;
  console.log(`🏠 Using Restaurant: ${restaurantId}`);

  // 2. Create clean test tables with unique qr_tokens
  const qrTokenA = crypto.randomUUID();
  const qrTokenB = crypto.randomUUID();

  // Delete previous test tables, sessions, and orders if they exist from failed runs
  const { data: lingeringTables } = await adminClient
    .from("restaurant_tables")
    .select("id")
    .in("table_number", ["T-SEC-A", "T-SEC-B", "T-SEC-FRESH"]);
  if (lingeringTables && lingeringTables.length > 0) {
    const lingeringTableIds = lingeringTables.map(t => t.id);
    const { data: lingeringSessions } = await adminClient
      .from("sessions")
      .select("id")
      .in("table_id", lingeringTableIds);
    if (lingeringSessions && lingeringSessions.length > 0) {
      const lingeringSessionIds = lingeringSessions.map(s => s.id);
      await adminClient.from("orders").delete().in("session_id", lingeringSessionIds);
      await adminClient.from("sessions").delete().in("id", lingeringSessionIds);
    }
    await adminClient.from("restaurant_tables").delete().in("id", lingeringTableIds);
  }

  const { data: tableA, error: errTableA } = await adminClient
    .from("restaurant_tables")
    .insert({
      restaurant_id: restaurantId,
      table_number: "T-SEC-A",
      seating_capacity: 4,
      qr_token: qrTokenA,
      status: "available",
    })
    .select("id")
    .single();

  const { data: tableB, error: errTableB } = await adminClient
    .from("restaurant_tables")
    .insert({
      restaurant_id: restaurantId,
      table_number: "T-SEC-B",
      seating_capacity: 4,
      qr_token: qrTokenB,
      status: "available",
    })
    .select("id")
    .single();

  if (errTableA || errTableB || !tableA || !tableB) {
    console.error("❌ Failed to create test tables:", errTableA?.message || errTableB?.message);
    process.exit(1);
  }

  console.log(`✅ Table A (T-SEC-A): ${tableA.id} (qr_token: ${qrTokenA})`);
  console.log(`✅ Table B (T-SEC-B): ${tableB.id} (qr_token: ${qrTokenB})`);

  // 3. Create clean test sessions with custom session_tokens (cryptographically strong)
  const sessionTokenA = generateHexToken();
  const sessionTokenB = generateHexToken();

  const { data: sessionA, error: errSessA } = await adminClient
    .from("sessions")
    .insert({
      restaurant_id: restaurantId,
      table_id: tableA.id,
      guest_count: 2,
      status: "active",
      session_token: sessionTokenA,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
    })
    .select("id")
    .single();

  const { data: sessionB, error: errSessB } = await adminClient
    .from("sessions")
    .insert({
      restaurant_id: restaurantId,
      table_id: tableB.id,
      guest_count: 2,
      status: "active",
      session_token: sessionTokenB,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (errSessA || errSessB || !sessionA || !sessionB) {
    console.error("❌ Failed to create test sessions:", errSessA?.message || errSessB?.message);
    process.exit(1);
  }

  // Update tables to mark current sessions (simulating backend bootstrap status update)
  await adminClient.from("restaurant_tables").update({ current_session_id: sessionA.id, status: "occupied" }).eq("id", tableA.id);
  await adminClient.from("restaurant_tables").update({ current_session_id: sessionB.id, status: "occupied" }).eq("id", tableB.id);

  console.log(`✅ Session A: ${sessionA.id} (token: ${sessionTokenA})`);
  console.log(`✅ Session B: ${sessionB.id} (token: ${sessionTokenB})`);

  // 4. Create an order for Session B
  const { data: orderB, error: errOrderB } = await adminClient
    .from("orders")
    .insert({
      session_id: sessionB.id,
      restaurant_id: restaurantId,
      order_number: "T-SEC-B-1",
      status: "served",
      source: "table",
      subtotal: 300,
      total: 300,
      grand_total: 300,
    })
    .select("id")
    .single();

  if (errOrderB || !orderB) {
    console.error("❌ Failed to create order for Table B:", errOrderB?.message);
    process.exit(1);
  }
  console.log(`✅ Order B: ${orderB.id} created under Session B.`);

  // Create client A configured with sessionTokenA
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-session-token": sessionTokenA } },
  });

  let passed = 0;
  let failed = 0;

  function assertProof(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      if (detail) console.error(`         → ${detail}`);
      failed++;
    }
  }

  // PROOF 1: Prevent restaurant-wide table enumeration
  console.log("\n🧪 Running Proof 1: Restaurant-wide table enumeration is blocked...");
  const { data: tablesRead, error: errTablesRead } = await clientA
    .from("restaurant_tables")
    .select("id, table_number");

  assertProof(
    "Only own table is visible (restaurant-wide enumeration blocked)",
    !errTablesRead && tablesRead?.length === 1 && tablesRead[0].id === tableA.id,
    `Tables found: ${JSON.stringify(tablesRead)}`
  );

  // PROOF 2: Prevent session enumeration
  console.log("\n🧪 Running Proof 2: Session enumeration is blocked...");
  const { data: sessionsRead, error: errSessionsRead } = await clientA
    .from("sessions")
    .select("id");

  assertProof(
    "Only own session is visible (session enumeration blocked)",
    !errSessionsRead && sessionsRead?.length === 1 && sessionsRead[0].id === sessionA.id,
    `Sessions found: ${JSON.stringify(sessionsRead)}`
  );

  // PROOF 3: Prevent reading other table's orders
  console.log("\n🧪 Running Proof 3: Reading other table's orders is blocked...");
  const { data: ordersRead, error: errOrdersRead } = await clientA
    .from("orders")
    .select("id");

  assertProof(
    "Cannot read orders of another session",
    !errOrdersRead && ordersRead?.length === 0,
    `Orders found: ${JSON.stringify(ordersRead)}`
  );

  // PROOF 4: Prevent anonymous table occupation via direct UPDATE
  console.log("\n🧪 Running Proof 4: Anonymous table occupation via direct UPDATE is blocked...");
  // Attempt to occupy table B using client A or direct public update
  const { data: updateRes, error: errUpdate } = await clientA
    .from("restaurant_tables")
    .update({ status: "occupied", current_session_id: sessionA.id })
    .eq("id", tableB.id)
    .select("id");

  assertProof(
    "Direct anonymous table status update yields no rows / fails RLS",
    !!errUpdate || !updateRes || updateRes.length === 0,
    `Update result: ${JSON.stringify(updateRes)}`
  );

  // PROOF 5: Validate backend QR token validation and bootstrapping
  console.log("\n🧪 Running Proof 5: Backend QR token validation and bootstrapping...");
  
  // Test 5a: Bootstrap without QR token on fresh table must fail
  const freshTableNumber = "T-SEC-FRESH";
  await adminClient.from("restaurant_tables").delete().eq("table_number", freshTableNumber);
  const { data: freshTable } = await adminClient
    .from("restaurant_tables")
    .insert({
      restaurant_id: restaurantId,
      table_number: freshTableNumber,
      seating_capacity: 4,
      qr_token: crypto.randomUUID(),
      status: "available",
    })
    .select("id")
    .single();

  const boot1 = await fetch(`${APP_URL}/api/v1/sessions/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableId: freshTable!.id }),
  });

  const boot1Json = await boot1.json();
  const t5aPassed = boot1.status === 403 && boot1Json?.error?.code === "QR_REQUIRED";
  assertProof("Bootstrap fails without QR token", t5aPassed, `Got HTTP ${boot1.status}: ${JSON.stringify(boot1Json)}`);

  // Test 5b: Bootstrap with correct QR token succeeds and returns session details
  const freshTableDetails = await adminClient
    .from("restaurant_tables")
    .select("qr_token")
    .eq("id", freshTable!.id)
    .single();
    
  const boot2 = await fetch(`${APP_URL}/api/v1/sessions/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableId: freshTable!.id, qrToken: freshTableDetails.data!.qr_token }),
  });

  const boot2Json = await boot2.json();
  const t5bPassed = boot2.status === 200 && boot2Json?.data?.sessionId;
  assertProof("Bootstrap succeeds with correct QR token", t5bPassed, `Got HTTP ${boot2.status}: ${JSON.stringify(boot2Json)}`);

  // Cleanup DB test records
  console.log("\n🧹 Cleaning up test data...");
  await adminClient.from("orders").delete().eq("id", orderB.id);
  await adminClient.from("sessions").delete().in("id", [sessionA.id, sessionB.id, boot2Json?.data?.sessionId].filter(Boolean));
  await adminClient.from("restaurant_tables").delete().in("id", [tableA.id, tableB.id, freshTable!.id]);
  console.log("✨ Cleanup completed.");

  console.log("\n" + "═".repeat(60));
  console.log(`Scoped RLS & Session Token Proof Results: ${passed} passed, ${failed} failed`);
  console.log("═".repeat(60) + "\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL SECURITY PROOFS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("❌ Test script failure:", err);
  process.exit(1);
});
