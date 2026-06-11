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

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getAuthCookies(projectId: string, session: any) {
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
  const key = `sb-${projectId}-auth-token`;
  const encodedValue = encodeURIComponent(value);
  const maxChunkSize = 3180;

  if (encodedValue.length <= maxChunkSize) {
    return [`${key}=${value}`];
  }

  const cookies: string[] = [];
  let remaining = encodedValue;
  let chunkIndex = 0;

  while (remaining.length > 0) {
    let chunk = remaining.slice(0, maxChunkSize);
    const lastPercent = chunk.lastIndexOf("%");
    if (lastPercent > maxChunkSize - 3) {
      chunk = chunk.slice(0, lastPercent);
    }
    const decodedChunk = decodeURIComponent(chunk);
    cookies.push(`${key}.${chunkIndex}=${decodedChunk}`);
    remaining = remaining.slice(chunk.length);
    chunkIndex++;
  }

  return cookies;
}

async function postRedeem(payload: any, cookies: string[]) {
  const res = await fetch(`${APP_URL}/api/v1/loyalty/redeem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies.join("; "),
    },
    body: JSON.stringify(payload),
  });

  const status = res.status;
  const json = await res.json();
  return { status, json };
}

async function main() {
  console.log("🚀 Running P0-B Loyalty Hardening Security Verification...\n");

  // 1. Authenticate as the demo user
  const email = "demo@menuara.com";
  const password = process.env.DEMO_PASSWORD ?? "MenuaraDemo2024!";
  console.log(`🔐 Logging in as ${email}...`);
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error("❌ Authentication failed:", authError?.message);
    process.exit(1);
  }

  const user = authData.user;
  console.log(`✅ Logged in successfully. User ID: ${user.id}`);

  // Extract project ref
  const projectRefMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase/);
  const projectRef = projectRefMatch ? projectRefMatch[1] : "";
  if (!projectRef) {
    console.error("❌ Could not extract Supabase project reference from URL");
    process.exit(1);
  }

  const cookies = getAuthCookies(projectRef, authData.session);

  // 2. Fetch/create restaurant owned by this user
  const { data: restaurant, error: restError } = await adminClient
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (restError || !restaurant) {
    console.error("❌ Failed to fetch restaurant owned by demo user:", restError?.message);
    process.exit(1);
  }

  const restaurantId = restaurant.id;
  console.log(`🏠 Restaurant ID: ${restaurantId}`);

  // 3. Find or create a table
  let { data: table } = await adminClient
    .from("restaurant_tables")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .limit(1)
    .single();

  if (!table) {
    const { data: newTable, error: tableError } = await adminClient
      .from("restaurant_tables")
      .insert({
        restaurant_id: restaurantId,
        table_number: "T99",
        seating_capacity: 4,
        status: "available",
      })
      .select("id")
      .single();

    if (tableError) {
      console.error("❌ Failed to create test table:", tableError.message);
      process.exit(1);
    }
    table = newTable;
  }

  const tableId = table.id;

  // 4. Create clean test loyalty account
  const testPhone = "9999999999";
  await adminClient
    .from("loyalty_accounts")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("phone", testPhone);

  const { data: loyaltyAccount, error: loyaltyError } = await adminClient
    .from("loyalty_accounts")
    .insert({
      restaurant_id: restaurantId,
      phone: testPhone,
      name: "Test Hardening Customer",
      total_points: 5000,
      total_spent: 0,
      visit_count: 1,
    })
    .select("id")
    .single();

  if (loyaltyError || !loyaltyAccount) {
    console.error("❌ Failed to create test loyalty account:", loyaltyError?.message);
    process.exit(1);
  }
  console.log(`💳 Created test loyalty account with 5000 points.`);

  // 5. Create test dining session
  const { data: session, error: sessError } = await adminClient
    .from("sessions")
    .insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      guest_count: 2,
      status: "active",
    })
    .select("id")
    .single();

  if (sessError || !session) {
    console.error("❌ Failed to create test session:", sessError?.message);
    process.exit(1);
  }

  const sessionId = session.id;
  console.log(`📅 Created test session: ${sessionId}`);

  // 6. Create active served order in session (subtotal = Rs. 500)
  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .insert({
      session_id: sessionId,
      restaurant_id: restaurantId,
      order_number: "TEST-L-101",
      status: "served",
      source: "table",
      subtotal: 500,
      total: 500,
      grand_total: 500,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("❌ Failed to create test order:", orderError?.message);
    process.exit(1);
  }
  console.log("🍔 Added order with subtotal = Rs. 500 to session.");

  let passedTests = 0;
  let failedTests = 0;

  // TEST 1: Rejected if client attempts to override orderAmount (or orderAmount is ignored and fails anyway)
  // Payload sends pointsToRedeem = 1500 (Rs. 150 discount) and orderAmount = 10000.
  // If the server trusted orderAmount = 10000, Rs. 150 discount would be under the 20% limit (limit = Rs. 2000).
  // But because it resolves from the database (Rs. 500), the limit is Rs. 100.
  // So the request must be REJECTED.
  console.log("\n🧪 Running Test 1: Rejected if client attempts to override orderAmount...");
  const t1Result = await postRedeem({
    phone: testPhone,
    sessionId,
    pointsToRedeem: 1500,
    orderAmount: 10000, // Attempted tampering
  }, cookies);

  if (t1Result.status !== 200 && t1Result.json?.error?.message?.includes("exceeds the 20% limit")) {
    console.log("  ✅ PASS: Request was rejected (discount exceeds database-resolved 20% limit).");
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: Expected rejection, but got HTTP ${t1Result.status}:`, JSON.stringify(t1Result.json));
    failedTests++;
  }

  // TEST 2: Rejected if point discount exceeds 20% cap (direct check)
  // Requesting 1500 points yields Rs. 150 discount, which exceeds the Rs. 100 cap (20% of Rs. 500).
  console.log("\n🧪 Running Test 2: Rejected if point discount exceeds 20% cap...");
  const t2Result = await postRedeem({
    phone: testPhone,
    sessionId,
    pointsToRedeem: 1500,
  }, cookies);

  if (t2Result.status !== 200 && t2Result.json?.error?.message?.includes("exceeds the 20% limit")) {
    console.log("  ✅ PASS: Request was rejected due to exceeding 20% limit.");
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: Expected rejection, but got HTTP ${t2Result.status}:`, JSON.stringify(t2Result.json));
    failedTests++;
  }

  // TEST 3: Allowed if point discount is within 20% cap (quote mode)
  // Requesting 1000 points yields Rs. 100 discount, which is exactly 20% of Rs. 500.
  console.log("\n🧪 Running Test 3: Allowed if point discount is within 20% cap (quote)...");
  const t3Result = await postRedeem({
    phone: testPhone,
    sessionId,
    pointsToRedeem: 1000,
    commit: false,
  }, cookies);

  if (t3Result.status === 200 && t3Result.json?.data?.discount === 100) {
    console.log("  ✅ PASS: Quote succeeded with correct Rs. 100 discount.");
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: Expected success with discount = 100, but got HTTP ${t3Result.status}:`, JSON.stringify(t3Result.json));
    failedTests++;
  }

  // TEST 4: Commit redemption updates the points balance
  console.log("\n🧪 Running Test 4: Commit redemption updates the points balance in DB...");
  const t4Result = await postRedeem({
    phone: testPhone,
    sessionId,
    pointsToRedeem: 1000,
    commit: true,
  }, cookies);

  if (t4Result.status === 200) {
    // Check points balance in DB
    const { data: updatedAccount } = await adminClient
      .from("loyalty_accounts")
      .select("total_points")
      .eq("id", loyaltyAccount.id)
      .single();

    if (updatedAccount?.total_points === 4000) {
      console.log("  ✅ PASS: Commit succeeded and points balance decreased to 4000.");
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: Account points should be 4000, but got: ${updatedAccount?.total_points}`);
      failedTests++;
    }
  } else {
    console.error(`  ❌ FAIL: Expected commit success, but got HTTP ${t4Result.status}:`, JSON.stringify(t4Result.json));
    failedTests++;
  }

  // Clean up database records
  console.log("\n🧹 Cleaning up test data...");
  await adminClient.from("orders").delete().eq("id", order.id);
  await adminClient.from("sessions").delete().eq("id", sessionId);
  await adminClient.from("loyalty_accounts").delete().eq("id", loyaltyAccount.id);
  console.log("✨ Cleanup completed.");

  console.log("\n" + "═".repeat(60));
  console.log(`Loyalty Hardening Verification Results: ${passedTests} passed, ${failedTests} failed`);
  console.log("═".repeat(60) + "\n");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL LOYALTY HARDENING VERIFICATION TESTS PASSED!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});
