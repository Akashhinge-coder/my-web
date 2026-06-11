import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const envPath = path.resolve(".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

let passed = 0;
let failed = 0;
const results = [];

function pass(name) {
  console.log(`  ✅ PASS  ${name}`);
  passed++;
  results.push({ test: name, status: "PASS" });
}

function fail(name, detail) {
  console.error(`  ❌ FAIL  ${name}`);
  if (detail) console.error(`         → ${detail}`);
  failed++;
  results.push({ test: name, status: "FAIL", detail });
}

async function run() {
  console.log("\n🧪 STARTING P0-SECURITY REGRESSION TEST SUITE\n");

  // 1. Setup Test Data
  let ownerId;
  try {
    // Find demo user
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;
    const demoUser = users.users.find((u) => u.email === "demo@menuara.com");
    if (!demoUser) throw new Error("demo@menuara.com user not found");
    ownerId = demoUser.id;
  } catch (err) {
    console.error("Setup failed: unable to fetch demo user id:", err.message);
    process.exit(1);
  }

  console.log("Found Demo User ID:", ownerId);

  // Create Restaurant A
  const { data: restA, error: errRestA } = await supabase
    .from("restaurants")
    .insert({
      owner_id: ownerId,
      name: "Security Test Rest A",
      slug: "sec-test-rest-a",
      phone: "1234567890",
      is_active: true,
    })
    .select()
    .single();

  if (errRestA) {
    console.error("Failed to create Restaurant A:", errRestA);
    process.exit(1);
  }

  // Create Restaurant B
  const { data: restB, error: errRestB } = await supabase
    .from("restaurants")
    .insert({
      owner_id: ownerId,
      name: "Security Test Rest B",
      slug: "sec-test-rest-b",
      phone: "1234567890",
      is_active: true,
    })
    .select()
    .single();

  if (errRestB) {
    console.error("Failed to create Restaurant B:", errRestB);
    await supabase.from("restaurants").delete().eq("id", restA.id);
    process.exit(1);
  }

  // Create Categories
  const { data: catA } = await supabase
    .from("categories")
    .insert({ restaurant_id: restA.id, name: "Food" })
    .select()
    .single();

  // Create Dishes
  const { data: dishA } = await supabase
    .from("dishes")
    .insert({
      restaurant_id: restA.id,
      category_id: catA.id,
      name: "Sec Dish A",
      price: 150.0,
      is_available: true,
    })
    .select()
    .single();

  // Create Table A (Rest A)
  const { data: tableA } = await supabase
    .from("restaurant_tables")
    .insert({
      restaurant_id: restA.id,
      table_number: "SA1",
      seating_capacity: 4,
      status: "available",
    })
    .select()
    .single();

  // Create Table B (Rest A)
  const { data: tableB } = await supabase
    .from("restaurant_tables")
    .insert({
      restaurant_id: restA.id,
      table_number: "SA2",
      seating_capacity: 4,
      status: "available",
    })
    .select()
    .single();

  // Create Table C (Rest B)
  const { data: tableC } = await supabase
    .from("restaurant_tables")
    .insert({
      restaurant_id: restB.id,
      table_number: "SB1",
      seating_capacity: 4,
      status: "available",
    })
    .select()
    .single();

  // Create Sessions
  const { data: sessionA } = await supabase
    .from("sessions")
    .insert({
      restaurant_id: restA.id,
      table_id: tableA.id,
      status: "active",
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  const { data: sessionExpired } = await supabase
    .from("sessions")
    .insert({
      restaurant_id: restA.id,
      table_id: tableA.id,
      status: "active",
      expires_at: new Date(Date.now() - 60 * 1000).toISOString(), // Expired 1 min ago
    })
    .select()
    .single();

  const { data: sessionInactive } = await supabase
    .from("sessions")
    .insert({
      restaurant_id: restA.id,
      table_id: tableA.id,
      status: "closed",
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  console.log("Mock data created. Beginning test assertions...");

  // Helper fetch function
  async function testOrder(name, restId, cookieToken, payload, expectedStatus) {
    const headers = {
      "Content-Type": "application/json",
    };
    if (cookieToken) {
      headers["Cookie"] = `session_token=${cookieToken}`;
    }

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/orders?restaurantId=${restId}&mode=place`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );

      const text = await res.text();
      let resJson = {};
      try {
        resJson = JSON.parse(text);
      } catch {}

      if (res.status === expectedStatus) {
        pass(`${name} (HTTP ${res.status})`);
      } else {
        fail(
          name,
          `Expected HTTP ${expectedStatus}, got ${res.status}. Response: ${text}`
        );
      }
    } catch (err) {
      fail(name, `Network error: ${err.message}`);
    }
  }

  // 1. Valid session order placement
  await testOrder(
    "1. Valid session order placement",
    restA.id,
    sessionA.session_token,
    {
      tableId: tableA.id,
      sessionId: sessionA.id,
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    201
  );

  // 2. Forged sessionId (mismatch with cookie)
  await testOrder(
    "2. Forged sessionId payload",
    restA.id,
    sessionA.session_token,
    {
      tableId: tableA.id,
      sessionId: "00000000-0000-0000-0000-000000000000",
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    401
  );

  // 3. Session from another table
  await testOrder(
    "3. Session from another table",
    restA.id,
    sessionA.session_token,
    {
      tableId: tableB.id,
      sessionId: sessionA.id,
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    422
  );

  // 4. Session from another restaurant
  await testOrder(
    "4. Session from another restaurant",
    restB.id,
    sessionA.session_token,
    {
      tableId: tableC.id,
      sessionId: sessionA.id,
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    404
  );

  // 5. Valid cookie + invalid sessionId
  await testOrder(
    "5. Valid cookie + invalid sessionId",
    restA.id,
    sessionA.session_token,
    {
      tableId: tableA.id,
      sessionId: "00000000-0000-0000-0000-000000000000",
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    401
  );

  // 6. Valid sessionId + invalid cookie
  await testOrder(
    "6. Valid sessionId + invalid cookie",
    restA.id,
    "invalid-cookie-token",
    {
      tableId: tableA.id,
      sessionId: sessionA.id,
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    401
  );

  // 7. Missing cookie
  await testOrder(
    "7. Missing cookie",
    restA.id,
    null,
    {
      tableId: tableA.id,
      sessionId: sessionA.id,
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    401
  );

  // 8. Expired session
  await testOrder(
    "8. Expired session",
    restA.id,
    sessionExpired.session_token,
    {
      tableId: tableA.id,
      sessionId: sessionExpired.id,
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    401
  );

  // 9. Inactive session status
  await testOrder(
    "9. Inactive session status",
    restA.id,
    sessionInactive.session_token,
    {
      tableId: tableA.id,
      sessionId: sessionInactive.id,
      items: [{ dishId: dishA.id, quantity: 1 }],
    },
    422
  );

  // ── CLEANUP TEST DATA ──────────────────────────────────────────
  console.log("\n🧹 Cleaning up test database records...");
  try {
    await supabase.from("sessions").delete().in("id", [sessionA.id, sessionExpired.id, sessionInactive.id]);
    await supabase.from("restaurant_tables").delete().in("id", [tableA.id, tableB.id, tableC.id]);
    await supabase.from("dishes").delete().eq("id", dishA.id);
    await supabase.from("categories").delete().eq("id", catA.id);
    await supabase.from("restaurants").delete().in("id", [restA.id, restB.id]);
    console.log("Cleanup finished.");
  } catch (cleanupErr) {
    console.error("Cleanup error:", cleanupErr.message);
  }

  // ── TEST VERDICT ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log(`  Security Audit Verification Results: ${passed} passed, ${failed} failed`);
  console.log("═".repeat(60) + "\n");

  if (failed > 0) {
    console.error("🚨 SECURITY REGRESSION SUITE FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL SECURITY REGRESSION TESTS PASSED\n");
    process.exit(0);
  }
}

run();
