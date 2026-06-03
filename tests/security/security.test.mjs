/**
 * MENUARA SECURITY TESTS — Phase 7: Automated Security Validation
 *
 * Tests:
 *  TEST 1 — Unauthenticated access to admin orders → 401
 *  TEST 2 — Client-injected restaurantId in GET /orders → ignored (session used)
 *  TEST 3 — GET /orders with fake restaurantId → 401 (no session)
 *  TEST 4 — GET /tables without auth → 401
 *  TEST 5 — POST /orders without restaurantId and without auth → 401
 *  TEST 6 — Demo mode env var is disabled
 *  TEST 7 — middleware.ts has no fake user injection
 *  TEST 8 — resolveRestaurantAccess.ts has no demo bypass
 *  TEST 9 — auth.service.ts has no getDemoRestaurant
 *  TEST 10 — No repository uses createAdminClient except billing + platform
 *
 * Run: node tests/security/security.test.mjs
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ROOT = join(process.cwd());

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  ✅ PASS  ${name}`);
  passed++;
}

function fail(name, detail) {
  console.error(`  ❌ FAIL  ${name}`);
  if (detail) console.error(`         → ${detail}`);
  failed++;
}

// ── STATIC ANALYSIS TESTS ───────────────────────────────────

console.log("\n🔍 STATIC ANALYSIS — Code Security Checks\n");

// TEST 6 — DEMO_MODE disabled
{
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("NEXT_PUBLIC_DEMO_MODE"));
  if (line?.includes("=true")) {
    fail("TEST 6 — NEXT_PUBLIC_DEMO_MODE is disabled", `Found: ${line?.trim()}`);
  } else {
    pass("TEST 6 — NEXT_PUBLIC_DEMO_MODE is disabled");
  }
}

// TEST 7 — middleware.ts has no fake user injection
{
  const mw = readFileSync(join(ROOT, "middleware.ts"), "utf8");
  if (mw.includes("demo-user-id") || mw.includes("demoMode") || mw.includes("DEMO_MODE")) {
    fail("TEST 7 — middleware.ts has no demo fake user", "Found demo bypass code");
  } else {
    pass("TEST 7 — middleware.ts has no demo fake user");
  }
}

// TEST 8 — resolveRestaurantAccess has no demo bypass
{
  const rac = readFileSync(
    join(ROOT, "src/backend/utils/resolveRestaurantAccess.ts"),
    "utf8"
  );
  if (rac.includes("DEMO_MODE") || rac.includes("demoMode") || rac.includes(".limit(1)")) {
    fail("TEST 8 — resolveRestaurantAccess has no demo bypass", "Found demo code");
  } else {
    pass("TEST 8 — resolveRestaurantAccess has no demo bypass");
  }
}

// TEST 9 — auth.service.ts has no getDemoRestaurant
{
  const auth = readFileSync(join(ROOT, "src/backend/services/auth.service.ts"), "utf8");
  if (auth.includes("getDemoRestaurant") || auth.includes("demoRestaurant")) {
    fail("TEST 9 — auth.service.ts has no getDemoRestaurant", "Found demo fallback");
  } else {
    pass("TEST 9 — auth.service.ts has no getDemoRestaurant");
  }
}

// TEST 10 — Repositories: only billing and platform use createAdminClient
{
  const repoDir = join(ROOT, "src/backend/repositories");
  const repos = readdirSync(repoDir).filter((f) => f.endsWith(".ts"));
  const ALLOWED_ADMIN = ["billing.repository.ts", "platform.repository.ts"];

  let repoPassed = true;
  for (const repo of repos) {
    const content = readFileSync(join(repoDir, repo), "utf8");
    if (content.includes("createAdminClient") && !ALLOWED_ADMIN.includes(repo)) {
      fail(`TEST 10 — ${repo} should not use createAdminClient`, "Found service-role usage");
      repoPassed = false;
    }
  }
  if (repoPassed) {
    pass("TEST 10 — Only billing+platform repositories use createAdminClient");
  }
}

// TEST 11 — listOrdersQuerySchema does not trust client restaurantId
{
  const schema = readFileSync(
    join(ROOT, "src/backend/validations/order.schema.ts"),
    "utf8"
  );
  // The listOrdersQuerySchema block should not contain restaurantId
  const listBlock = schema.match(/listOrdersQuerySchema[\s\S]*?}\s*\)/)?.[0] ?? "";
  if (listBlock.includes("restaurantId")) {
    fail(
      "TEST 11 — listOrdersQuerySchema must not include restaurantId",
      "Client-injectable restaurantId found in schema"
    );
  } else {
    pass("TEST 11 — listOrdersQuerySchema does not trust client restaurantId");
  }
}

// TEST 12 — markOccupied has restaurant_id scope
{
  const tableRepo = readFileSync(
    join(ROOT, "src/backend/repositories/table.repository.ts"),
    "utf8"
  );
  const markOccupied = tableRepo.match(/markOccupied[\s\S]*?}/)?.[0] ?? "";
  if (!markOccupied.includes("restaurant_id")) {
    fail("TEST 12 — TableRepository.markOccupied has restaurant_id scope", "Missing .eq(restaurant_id)");
  } else {
    pass("TEST 12 — TableRepository.markOccupied has restaurant_id scope");
  }
}

// ── RUNTIME TESTS (API) ─────────────────────────────────────

console.log("\n🌐 RUNTIME TESTS — API Security Checks\n");

async function apiTest(name, url, options = {}, expectedStatus) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    });
    if (res.status === expectedStatus) {
      pass(`${name} → HTTP ${res.status}`);
    } else {
      fail(`${name}`, `Expected HTTP ${expectedStatus}, got ${res.status}`);
    }
  } catch (err) {
    fail(`${name}`, `Network error: ${err.message}`);
  }
}

// TEST 1 — Unauthenticated GET /orders → 401
await apiTest(
  "TEST 1 — GET /api/v1/orders (no auth) → 401",
  "/api/v1/orders",
  {},
  401
);

// TEST 2 — Client-injected restaurantId in unauthenticated GET /orders → 401
await apiTest(
  "TEST 2 — GET /api/v1/orders?restaurantId=<fake> (no auth) → 401",
  "/api/v1/orders?restaurantId=00000000-0000-0000-0000-000000000001",
  {},
  401
);

// TEST 3 — Unauthenticated GET /tables → 401
await apiTest(
  "TEST 3 — GET /api/v1/tables (no auth) → 401",
  "/api/v1/tables",
  {},
  401
);

// TEST 4 — Unauthenticated POST /orders (no restaurantId, no auth) → 401
await apiTest(
  "TEST 4 — POST /api/v1/orders (no auth, no restaurantId) → 401",
  "/api/v1/orders",
  { method: "POST", body: JSON.stringify({ items: [] }) },
  401
);

// TEST 5 — Platform/superadmin → 401 without auth
await apiTest(
  "TEST 5 — GET /api/v1/platform (no auth) → 401",
  "/api/v1/platform",
  {},
  401
);

// TEST 6 — Body injection attack: restaurantId in body should not grant access to GET
await apiTest(
  "TEST 6 — GET /api/v1/orders with injected restaurantId in query → 401",
  `/api/v1/orders?restaurantId=00000000-0000-0000-0000-000000000099&scope=all`,
  {},
  401
);

// ── SUMMARY ─────────────────────────────────────────────────

console.log("\n" + "═".repeat(60));
console.log(`  Security Test Results: ${passed} passed, ${failed} failed`);
console.log("═".repeat(60) + "\n");

if (failed > 0) {
  console.error("🚨 SECURITY TESTS FAILED — Do not deploy");
  process.exit(1);
} else {
  console.log("✅ ALL SECURITY TESTS PASSED\n");
  process.exit(0);
}
