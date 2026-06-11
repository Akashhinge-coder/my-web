import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const envPath = path.resolve(".env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ Missing .env.local file.");
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error("❌ Supabase keys missing in .env.local");
  process.exit(1);
}

// Service role client for user and DB manipulation
const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper for slug generation (matching utils.ts)
function generateSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Global tracking arrays to verify automated cleanup
const createdUserIds = [];
const createdRestaurantIds = [];

// Helper to create an authenticated user session
async function createAuthUserSession(email, password) {
  // Create user
  const { data: userData, error: signUpError } = await sbAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (signUpError || !userData?.user) {
    throw new Error(`Auth creation failed for ${email}: ${signUpError?.message}`);
  }

  const userId = userData.user.id;
  createdUserIds.push(userId);

  // Create client and sign in
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr || !authData?.session) {
    throw new Error(`Sign in failed for ${email}: ${signInErr?.message}`);
  }

  return { client, userId, session: authData.session };
}

// Helper to run a full signup flow via client
async function runClientSignupFlow(client, userId, restaurantName, tableCount) {
  const slug = generateSlug(restaurantName);

  // 1. Insert restaurant
  const { data: restaurant, error: restErr } = await client
    .from("restaurants")
    .insert({
      owner_id: userId,
      name: restaurantName.trim(),
      slug,
      phone: "9876543210",
      address: "123 Test St",
      gst_number: "27AAPFU0939F1ZV",
    })
    .select()
    .single();

  if (restErr || !restaurant) {
    throw new Error(`Restaurant creation failed: ${restErr?.message}`);
  }
  createdRestaurantIds.push(restaurant.id);

  // 2. Insert staff
  const { data: staff, error: staffErr } = await client
    .from("staff")
    .insert({
      restaurant_id: restaurant.id,
      user_id: userId,
      name: restaurantName.trim() + " Admin",
      role: "admin",
      phone: "9876543210",
      is_active: true,
    })
    .select()
    .single();

  if (staffErr || !staff) {
    throw new Error(`Staff creation failed: ${staffErr?.message}`);
  }

  // 3. Insert tables
  if (tableCount > 0) {
    const tables = Array.from({ length: tableCount }, (_, i) => ({
      restaurant_id: restaurant.id,
      table_number: `T${i + 1}`,
      seating_capacity: 4,
      table_type: "regular",
      status: "available",
      floor: "Ground Floor",
    }));

    const { data: tableData, error: tableErr } = await client
      .from("restaurant_tables")
      .insert(tables)
      .select();

    if (tableErr || !tableData || tableData.length !== tableCount) {
      throw new Error(`Table bootstrapping failed: ${tableErr?.message}`);
    }
  }

  return { restaurantId: restaurant.id, slug };
}

async function verifyDatabaseCleanup() {
  console.log("\n🧹 RUNNING AUTOMATED CLEANUP VERIFICATION...");
  
  // Verify restaurants are deleted
  const { data: restCheck } = await sbAdmin.from("restaurants").select("id").in("id", createdRestaurantIds);
  const remainingRests = restCheck?.length ?? 0;

  // Verify staff are deleted
  const { data: staffCheck } = await sbAdmin.from("staff").select("id").in("restaurant_id", createdRestaurantIds);
  const remainingStaff = staffCheck?.length ?? 0;

  // Verify tables are deleted
  const { data: tableCheck } = await sbAdmin.from("restaurant_tables").select("id").in("restaurant_id", createdRestaurantIds);
  const remainingTables = tableCheck?.length ?? 0;

  // Verify auth users are deleted
  const { data: userList } = await sbAdmin.auth.admin.listUsers();
  const remainingUsers = userList?.users?.filter(u => createdUserIds.includes(u.id)).length ?? 0;

  console.log(`  - Remaining Restaurants: ${remainingRests}`);
  console.log(`  - Remaining Staff: ${remainingStaff}`);
  console.log(`  - Remaining Tables: ${remainingTables}`);
  console.log(`  - Remaining Auth Users: ${remainingUsers}`);

  if (remainingRests > 0 || remainingStaff > 0 || remainingTables > 0 || remainingUsers > 0) {
    throw new Error(`Cleanup failed: residue left in database! [Users: ${remainingUsers}, Rests: ${remainingRests}, Staff: ${remainingStaff}, Tables: ${remainingTables}]`);
  }
  console.log("  ✅ Verification: Database is 100% clean.");
}

async function performFinalCleanup() {
  console.log("\n🧹 EXECUTING TEARDOWN CLEANUP...");
  for (const restId of createdRestaurantIds) {
    try {
      await sbAdmin.from("restaurant_tables").delete().eq("restaurant_id", restId);
      await sbAdmin.from("staff").delete().eq("restaurant_id", restId);
      await sbAdmin.from("restaurants").delete().eq("id", restId);
    } catch (err) {
      console.error(`Failed cleaning restaurant data for ${restId}:`, err.message);
    }
  }
  for (const userId of createdUserIds) {
    try {
      await sbAdmin.auth.admin.deleteUser(userId);
    } catch (err) {
      console.error(`Failed deleting auth user ${userId}:`, err.message);
    }
  }
}

async function main() {
  console.log("=== MENUARA ONBOARDING STRESS & CONCURRENCY AUDIT ===");
  let failedTests = 0;

  // ═══════════════════════════════════════════════════════════
  // TEST 1: Single Registration Baseline
  // ═══════════════════════════════════════════════════════════
  console.log("\n▶ TEST 1: Single Registration Baseline");
  const timestamp = Date.now();
  let baselineStart = Date.now();
  try {
    const email = `stress-baseline-${timestamp}@menuara.com`;
    const password = "Password123!";
    const restName = `Baseline Rest ${timestamp}`;
    
    const { client, userId } = await createAuthUserSession(email, password);
    const flowRes = await runClientSignupFlow(client, userId, restName, 5);
    const duration = (Date.now() - baselineStart) / 1000;
    console.log(`  ✅ Single registration complete. Took ${duration.toFixed(2)}s`);
  } catch (err) {
    console.error("  ❌ Baseline failed:", err.message);
    failedTests++;
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 2: Concurrent Registration Storm (25 parallel)
  // ═══════════════════════════════════════════════════════════
  console.log("\n▶ TEST 2: Concurrent Registration Storm (25 parallel requests)");
  const stormSize = 25;
  const latencies = [];
  const stormPromises = [];
  
  // Pre-create 25 users
  console.log(`  - Pre-creating ${stormSize} authenticated users in parallel...`);
  const usersStart = Date.now();
  const userSessions = await Promise.all(
    Array.from({ length: stormSize }).map((_, i) =>
      createAuthUserSession(`storm-user-${i}-${timestamp}@menuara.com`, "Password123!")
    )
  );
  console.log(`  - Users created in ${((Date.now() - usersStart) / 1000).toFixed(2)}s`);

  console.log("  - Starting concurrent registration storm...");
  const stormStart = Date.now();

  const stormResults = await Promise.allSettled(
    userSessions.map(async (u, i) => {
      const restName = `Storm Rest ${i} ${timestamp}`;
      const start = Date.now();
      const res = await runClientSignupFlow(u.client, u.userId, restName, 5);
      const elapsed = Date.now() - start;
      latencies.push(elapsed);
      return res;
    })
  );

  const totalStormTime = (Date.now() - stormStart) / 1000;
  const successes = stormResults.filter(r => r.status === "fulfilled").length;
  const failures = stormResults.filter(r => r.status === "rejected").length;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] / 1000;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] / 1000;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] / 1000;

  console.log(`  - Storm size: ${stormSize}`);
  console.log(`  - Successes: ${successes}`);
  console.log(`  - Failures: ${failures}`);
  console.log(`  - Total Storm Time: ${totalStormTime.toFixed(2)}s`);
  console.log(`  - Latencies: P50: ${p50.toFixed(2)}s, P95: ${p95.toFixed(2)}s, P99: ${p99.toFixed(2)}s`);

  if (failures > 0) {
    console.error("  ❌ Concurrent registration storm had failures!");
    failedTests++;
  } else {
    console.log("  ✅ Concurrent storm passed with 100% success rate.");
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 3: Tenant Creation Consistency Invariant Check
  // ═══════════════════════════════════════════════════════════
  console.log("\n▶ TEST 3: Tenant Creation Consistency Invariant Check");
  try {
    let inconsistent = 0;
    for (const restId of createdRestaurantIds) {
      // Query restaurant
      const { data: rest } = await sbAdmin.from("restaurants").select("*").eq("id", restId).single();
      if (!rest) { inconsistent++; continue; }

      // Check owner user mapping
      const { data: userCheck } = await sbAdmin.auth.admin.getUserById(rest.owner_id);
      if (!userCheck?.user) { inconsistent++; continue; }

      // Check owner staff record
      const { data: staff } = await sbAdmin.from("staff").select("*").eq("restaurant_id", restId).eq("user_id", rest.owner_id);
      if (!staff || staff.length !== 1 || staff[0].role !== "admin") { inconsistent++; continue; }

      // Check settings defaults
      if (
        Number(rest.cgst_rate) !== 2.5 ||
        Number(rest.sgst_rate) !== 2.5 ||
        rest.currency !== "INR" ||
        rest.language !== "en"
      ) {
        inconsistent++; continue;
      }

      // Check tables
      const { data: tables } = await sbAdmin.from("restaurant_tables").select("*").eq("restaurant_id", restId);
      if (!tables || tables.length !== 5) { inconsistent++; continue; }
    }

    if (inconsistent > 0) {
      console.error(`  ❌ Tenant creation consistency check failed! Found ${inconsistent} inconsistent tenants.`);
      failedTests++;
    } else {
      console.log("  ✅ Tenant creation consistency check passed. All tenants are consistent.");
    }
  } catch (err) {
    console.error("  ❌ Consistency check failed with error:", err.message);
    failedTests++;
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 4: Session Creation Race Test
  // ═══════════════════════════════════════════════════════════
  console.log("\n▶ TEST 4: Session Creation Race Test (Double Onboarding Completion)");
  try {
    const email = `race-owner-${timestamp}@menuara.com`;
    const password = "Password123!";
    const restName = `Race Rest ${timestamp}`;

    const { client, userId } = await createAuthUserSession(email, password);

    // Fire 10 concurrent requests using the same client session
    console.log("  - Firing 10 concurrent completions...");
    const raceResults = await Promise.allSettled(
      Array.from({ length: 10 }).map(() =>
        runClientSignupFlow(client, userId, restName, 5)
      )
    );

    const raceSuccesses = raceResults.filter(r => r.status === "fulfilled").length;
    const raceFailures = raceResults.filter(r => r.status === "rejected").length;

    console.log(`  - Successes: ${raceSuccesses}`);
    console.log(`  - Failures: ${raceFailures}`);

    // Verify exactly 1 restaurant, 1 staff mapping, and 5 tables exist for this owner
    const { data: userRests } = await sbAdmin.from("restaurants").select("*").eq("owner_id", userId);
    const { data: userStaff } = await sbAdmin.from("staff").select("*").eq("user_id", userId);
    
    let tableCount = 0;
    if (userRests && userRests.length > 0) {
      const { data: userTables } = await sbAdmin.from("restaurant_tables").select("*").eq("restaurant_id", userRests[0].id);
      tableCount = userTables?.length ?? 0;
    }

    console.log(`  - Database state: Restaurants: ${userRests?.length}, Staff mappings: ${userStaff?.length}, Tables: ${tableCount}`);

    if (userRests?.length !== 1 || userStaff?.length !== 1 || tableCount !== 5) {
      console.error("  ❌ Session creation race check failed: duplicate records created!");
      failedTests++;
    } else {
      console.log("  ✅ Session creation race check passed. Only one set of tenant records was created.");
    }
  } catch (err) {
    console.error("  ❌ Session race test failed:", err.message);
    failedTests++;
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 5: Slug Collision & Name Normalization Race
  // ═══════════════════════════════════════════════════════════
  console.log("\n▶ TEST 5: Slug Collision & Name Normalization Race");
  try {
    const variations = [
      "Pizza Garden",
      "pizza garden",
      "PIZZA GARDEN",
      "Pizza-Garden",
      "Pizza  Garden",
      "Pizza Garden ",
      " Pizza Garden",
      "Pizza   Garden",
    ];

    console.log(`  - Creating ${variations.length} users to fire slug race...`);
    const raceUsers = await Promise.all(
      variations.map((_, i) =>
        createAuthUserSession(`slug-user-${i}-${timestamp}@menuara.com`, "Password123!")
      )
    );

    console.log(`  - Firing ${variations.length} concurrent restaurant creations...`);
    const slugRaceResults = await Promise.allSettled(
      raceUsers.map((u, i) =>
        runClientSignupFlow(u.client, u.userId, variations[i], 5)
      )
    );

    const slugSuccesses = slugRaceResults.filter(r => r.status === "fulfilled").length;
    const slugFailures = slugRaceResults.filter(r => r.status === "rejected").length;

    console.log(`  - Successes: ${slugSuccesses}`);
    console.log(`  - Failures: ${slugFailures}`);

    // Verify slugs in database
    const { data: dbRests } = await sbAdmin.from("restaurants").select("id, slug, name");
    const matchedSlugs = dbRests?.filter(r => r.slug === "pizza-garden") ?? [];
    console.log(`  - Restaurants with slug 'pizza-garden' in database: ${matchedSlugs.length}`);

    if (slugSuccesses !== 1 || matchedSlugs.length !== 1) {
      console.error("  ❌ Slug collision race check failed! Multiple restaurants won or unique constraints bypassed.");
      failedTests++;
    } else {
      console.log("  ✅ Slug collision race check passed. Only one slug 'pizza-garden' was created; other variations were correctly rejected.");
    }
  } catch (err) {
    console.error("  ❌ Slug collision test failed:", err.message);
    failedTests++;
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 6: Registration Rollback & Bootstrap Atomicity Test
  // ═══════════════════════════════════════════════════════════
  console.log("\n▶ TEST 6: Registration Rollback & Bootstrap Atomicity Test");
  
  // Scenario A: User Created -> Restaurant insertion fails (e.g. invalid owner ID)
  console.log("  - Scenario A: Restaurant insertion fails...");
  try {
    const email = `fail-a-${timestamp}@menuara.com`;
    const { client, userId } = await createAuthUserSession(email, "Password123!");
    
    // Attempt inserting restaurant with invalid payload (e.g., missing name)
    const { error: restErr } = await client
      .from("restaurants")
      .insert({ owner_id: userId, phone: "123" }); // slug and name missing
    
    if (restErr) {
      console.log("    (Simulated restaurant insertion failure successfully triggered)");
      // Client code doesn't have rollback. Let's verify database state for this user.
      const { data: userRest } = await sbAdmin.from("restaurants").select("*").eq("owner_id", userId);
      const { data: userStaff } = await sbAdmin.from("staff").select("*").eq("user_id", userId);
      console.log(`    Invariant Check: restaurant exists? ${userRest?.length > 0 ? "YES" : "NO"}, staff exists? ${userStaff?.length > 0 ? "YES" : "NO"}`);
    }
  } catch (err) {
    console.error("    Failed simulating A:", err.message);
  }

  // Scenario B: User Created -> Restaurant Created -> Table bootstrap fails
  console.log("  - Scenario B: Table bootstrap fails...");
  try {
    const email = `fail-b-${timestamp}@menuara.com`;
    const { client, userId } = await createAuthUserSession(email, "Password123!");
    
    // Step 1: Create restaurant
    const { data: restaurant } = await client
      .from("restaurants")
      .insert({
        owner_id: userId,
        name: "Fail B Restaurant",
        slug: `fail-b-rest-${timestamp}`,
        phone: "9876543210"
      })
      .select()
      .single();

    createdRestaurantIds.push(restaurant.id);

    // Step 2: Create staff
    await client.from("staff").insert({
      restaurant_id: restaurant.id,
      user_id: userId,
      name: "Fail B Admin",
      role: "admin",
      phone: "9876543210",
      is_active: true
    });

    // Step 3: Bootstrap tables fail (e.g., table count invalid / duplicate constraint trigger)
    // We force failure by trying to insert a table with null seating capacity or table number
    const { error: tableErr } = await client
      .from("restaurant_tables")
      .insert({
        restaurant_id: restaurant.id,
        table_number: null, // Should fail NOT NULL
      });

    if (tableErr) {
      console.log("    (Simulated table bootstrap failure successfully triggered)");
      // Check database state. Since there is no rollback, we expect staff and restaurant to remain.
      const { data: userRest } = await sbAdmin.from("restaurants").select("*").eq("owner_id", userId);
      const { data: userStaff } = await sbAdmin.from("staff").select("*").eq("user_id", userId);
      const { data: userTables } = await sbAdmin.from("restaurant_tables").select("*").eq("restaurant_id", restaurant.id);
      
      console.log(`    Invariant Check: restaurant exists? ${userRest?.length > 0 ? "YES" : "NO"}, staff exists? ${userStaff?.length > 0 ? "YES" : "NO"}, tables exist? ${userTables?.length > 0 ? "YES" : "NO"}`);
    }
  } catch (err) {
    console.error("    Failed simulating B:", err.message);
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 7: Table Bootstrap Scale Test
  // ═══════════════════════════════════════════════════════════
  console.log("\n▶ TEST 7: Table Bootstrap Scale Test");
  const scales = [1, 100, 500];
  for (const count of scales) {
    const scaleStart = Date.now();
    try {
      const email = `scale-${count}-${timestamp}@menuara.com`;
      const { client, userId } = await createAuthUserSession(email, "Password123!");
      await runClientSignupFlow(client, userId, `Scale Rest ${count} ${timestamp}`, count);
      const scaleElapsed = (Date.now() - scaleStart) / 1000;
      console.log(`  ✅ Bootstrapped ${count} tables successfully in ${scaleElapsed.toFixed(2)}s`);
    } catch (err) {
      console.error(`  ❌ Bootstrapped ${count} tables failed:`, err.message);
      failedTests++;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 8: Cross-Tenant Bootstrap Isolation Validation
  // ═══════════════════════════════════════════════════════════
  console.log("\n▶ TEST 8: Cross-Tenant Bootstrap Isolation Validation");
  try {
    const emailA = `owner-a-${timestamp}@menuara.com`;
    const emailB = `owner-b-${timestamp}@menuara.com`;

    const { client: clientA, userId: userA } = await createAuthUserSession(emailA, "Password123!");
    const { client: clientB, userId: userB } = await createAuthUserSession(emailB, "Password123!");

    const restA = await runClientSignupFlow(clientA, userA, `Rest A ${timestamp}`, 5);
    const restB = await runClientSignupFlow(clientB, userB, `Rest B ${timestamp}`, 5);

    // Owner A attempts to insert tables into Restaurant B
    const { error: attackTableErr } = await clientA
      .from("restaurant_tables")
      .insert({
        restaurant_id: restB.restaurantId,
        table_number: "T99",
        seating_capacity: 4,
        table_type: "regular",
        status: "available",
      });

    // Owner A attempts to update Restaurant B settings
    const { error: attackSettingsErr } = await clientA
      .from("restaurants")
      .update({ language: "fr" })
      .eq("id", restB.restaurantId);

    // Verify settings were NOT actually modified in the DB
    const { data: verifyRestB } = await sbAdmin
      .from("restaurants")
      .select("language")
      .eq("id", restB.restaurantId)
      .single();

    const tableBlocked = attackTableErr ? "YES" : "NO";
    const settingsBlocked = (attackSettingsErr || verifyRestB?.language !== "fr") ? "YES" : "NO";

    console.log(`  - Table tampering blocked? ${tableBlocked} (Error: ${attackTableErr?.message ?? "none"})`);
    console.log(`  - Settings tampering blocked? ${settingsBlocked} (Actual language in DB: ${verifyRestB?.language})`);

    if (tableBlocked === "YES" && settingsBlocked === "YES") {
      console.log("  ✅ Cross-tenant bootstrap isolation verified successfully.");
    } else {
      console.error("  ❌ Cross-tenant isolation violation! Tampering succeeded.");
      failedTests++;
    }
  } catch (err) {
    console.error("  ❌ Cross-tenant isolation test failed:", err.message);
    failedTests++;
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL CLEANUP AND VERIFICATION
  // ═══════════════════════════════════════════════════════════
  await performFinalCleanup();
  try {
    await verifyDatabaseCleanup();
  } catch (err) {
    console.error("  ❌ Cleanup check failed:", err.message);
    failedTests++;
  }

  console.log("\n=================================================");
  console.log(`VERIFICATION COMPLETE. FAILED TESTS: ${failedTests}`);
  console.log("=================================================");
  process.exit(failedTests === 0 ? 0 : 1);
}

main().catch(err => {
  console.error("Unhandled test suite exception:", err);
  process.exit(1);
});
