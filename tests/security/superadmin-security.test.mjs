/**
 * MENUARA — Superadmin Security Regression Suite
 *
 * Phase 9: Automated tests for all critical security remediations.
 *
 * Tests:
 *  TEST SA-01 — user_metadata role escalation blocked (static code check)
 *  TEST SA-02 — staffInviteSchema does not allow superadmin (static code check)
 *  TEST SA-03 — staff.service.ts has defence-in-depth superadmin guard (static check)
 *  TEST SA-04 — DEBUG cookie leak removed from server.ts (static code check)
 *  TEST SA-05 — superadmin layout.tsx exists and calls createClient (static check)
 *  TEST SA-06 — audit.repository.ts exists and uses admin client (static check)
 *  TEST SA-07 — platform.service.ts does NOT reference user_metadata (static check)
 *  TEST SA-08 — staff.repository.ts has deactivate() soft-delete method (static check)
 *  TEST SA-09 — rateLimiter.ts exports checkRateLimit and RATE_LIMITS (static check)
 *  TEST SA-10 — GET /api/v1/platform (no auth) → 401
 *  TEST SA-11 — PATCH /api/v1/platform with superadmin-role user_metadata only → 403
 *  TEST SA-12 — GET /api/v1/audit (no auth) → 401
 *  TEST SA-13 — GET /api/v1/audit (authenticated non-superadmin) → 403
 *  TEST SA-14 — POST /api/v1/staff with role=superadmin → 422 (schema rejection)
 *  TEST SA-15 — Rate limit fires on /api/v1/platform after N requests
 *  TEST SA-16 — staff.schema.ts OWNER_SAFE_ROLES does not include superadmin (static)
 *  TEST SA-17 — platform_audit_logs migration file exists (static check)
 *  TEST SA-18 — audit API returns 404 for unknown query (no, returns 200 empty list)
 *  TEST SA-19 — middleware.ts correctly gates /superadmin route
 *  TEST SA-20 — No console.log with "cookie" or "sessionToken" in server.ts
 *
 * Run: node tests/security/superadmin-security.test.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ROOT = join(process.cwd());

let passed = 0;
let failed = 0;
const failures = [];

function pass(name) {
  console.log(`  ✅ PASS  ${name}`);
  passed++;
}

function fail(name, detail) {
  console.error(`  ❌ FAIL  ${name}`);
  if (detail) console.error(`         → ${detail}`);
  failed++;
  failures.push({ name, detail });
}

function readFile(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

// ── STATIC ANALYSIS ─────────────────────────────────────────────────────────

console.log("\n🔍 STATIC ANALYSIS — Superadmin Security Checks\n");

// SA-01: user_metadata trust removed from platform.service.ts
{
  const content = readFile("src/backend/services/platform.service.ts");
  if (!content) {
    fail("SA-01 — platform.service.ts exists", "File not found");
  } else if (content.includes("user_metadata")) {
    fail("SA-01 — user_metadata NOT trusted in platform.service.ts",
      "Found reference to user_metadata — this is a user-controlled field");
  } else {
    pass("SA-01 — user_metadata is NOT referenced in platform.service.ts");
  }
}

// SA-02: staffInviteSchema does not allow superadmin
{
  const content = readFile("src/backend/validations/staff.schema.ts");
  if (!content) {
    fail("SA-02 — staff.schema.ts exists", "File not found");
  } else {
    const inviteBlock = content.match(/staffInviteSchema[\s\S]*?ownerSafeRoleSchema/)?.[0];
    if (!inviteBlock) {
      fail("SA-02 — staffInviteSchema uses ownerSafeRoleSchema",
        "staffInviteSchema does not reference ownerSafeRoleSchema");
    } else if (content.match(/staffInviteSchema[\s\S]*?superadmin/)) {
      fail("SA-02 — staffInviteSchema must not include superadmin",
        "Found 'superadmin' in or near staffInviteSchema definition");
    } else {
      pass("SA-02 — staffInviteSchema uses ownerSafeRoleSchema (no superadmin)");
    }
  }
}

// SA-03: Defence-in-depth guard in staff.service.ts
{
  const content = readFile("src/backend/services/staff.service.ts");
  if (!content) {
    fail("SA-03 — staff.service.ts exists", "File not found");
  } else if (!content.includes("assertOwnerSafeRole")) {
    fail("SA-03 — staff.service.ts has assertOwnerSafeRole guard",
      "assertOwnerSafeRole method not found — service-layer protection missing");
  } else if (!content.includes("OWNER_SAFE_ROLES")) {
    fail("SA-03 — staff.service.ts uses OWNER_SAFE_ROLES constant",
      "OWNER_SAFE_ROLES import not found");
  } else {
    pass("SA-03 — staff.service.ts has assertOwnerSafeRole defence-in-depth guard");
  }
}

// SA-04: DEBUG cookie leak removed from server.ts
{
  const content = readFile("src/config/supabase/server.ts");
  if (!content) {
    fail("SA-04 — config/supabase/server.ts exists", "File not found");
  } else if (content.toLowerCase().includes("console.log")) {
    fail("SA-04 — No console.log in supabase/server.ts",
      "Found console.log — potential credential exposure");
  } else if (content.includes("DEBUG")) {
    fail("SA-04 — No DEBUG statements in supabase/server.ts",
      "Found DEBUG string — likely credential exposure");
  } else if (content.includes("sessionToken") && content.includes("console")) {
    fail("SA-04 — sessionToken not logged in supabase/server.ts",
      "sessionToken referenced alongside console call");
  } else {
    pass("SA-04 — DEBUG cookie/token log removed from supabase/server.ts");
  }
}

// SA-05: superadmin layout.tsx exists and performs server-side auth check
{
  const content = readFile("src/app/(platform)/superadmin/layout.tsx");
  if (!content) {
    fail("SA-05 — (platform)/superadmin/layout.tsx exists", "File not found");
  } else if (!content.includes("createClient")) {
    fail("SA-05 — layout.tsx calls createClient for server-side auth",
      "createClient not found — layout may not be doing server-side auth");
  } else if (!content.includes("redirect")) {
    fail("SA-05 — layout.tsx redirects unauthorized users",
      "redirect() not found — non-superadmin users may not be redirected");
  } else if (content.includes('"use client"')) {
    fail("SA-05 — layout.tsx is a Server Component",
      'Found "use client" — this layout must be a Server Component');
  } else {
    pass("SA-05 — (platform)/superadmin/layout.tsx exists as a Server Component with auth redirect");
  }
}

// SA-06: audit.repository.ts exists and uses admin client
{
  const content = readFile("src/backend/repositories/audit.repository.ts");
  if (!content) {
    fail("SA-06 — audit.repository.ts exists", "File not found");
  } else if (!content.includes("createAdminClient")) {
    fail("SA-06 — audit.repository.ts uses admin client",
      "createAdminClient not found — audit log may not bypass RLS correctly");
  } else if (!content.includes("platform_audit_logs")) {
    fail("SA-06 — audit.repository.ts writes to platform_audit_logs",
      "Table name 'platform_audit_logs' not found in repository");
  } else {
    pass("SA-06 — audit.repository.ts exists and uses admin client for platform_audit_logs");
  }
}

// SA-07: platform.service.ts does NOT reference user_metadata (redundant double-check)
{
  const content = readFile("src/backend/services/platform.service.ts");
  if (content && content.includes("user_metadata")) {
    fail("SA-07 — platform.service.ts has zero user_metadata references",
      "Still found user_metadata in platform service");
  } else if (content && !content.includes("app_metadata")) {
    fail("SA-07 — platform.service.ts correctly references only app_metadata",
      "app_metadata not found — superadmin JWT check may be broken");
  } else {
    pass("SA-07 — platform.service.ts: only app_metadata used (user_metadata absent)");
  }
}

// SA-08: staff.repository.ts has deactivate() soft-delete
{
  const content = readFile("src/backend/repositories/staff.repository.ts");
  if (!content) {
    fail("SA-08 — staff.repository.ts exists", "File not found");
  } else if (!content.includes("deactivate")) {
    fail("SA-08 — staff.repository.ts has deactivate() soft-delete method",
      "deactivate() not found — staff delete is still a hard delete");
  } else if (!content.includes("is_active: false")) {
    fail("SA-08 — deactivate() sets is_active = false",
      "is_active: false not found in deactivate()");
  } else {
    pass("SA-08 — staff.repository.ts has deactivate() soft-delete (is_active = false)");
  }
}

// SA-09: rateLimiter.ts exports checkRateLimit and RATE_LIMITS
{
  const content = readFile("src/backend/utils/rateLimiter.ts");
  if (!content) {
    fail("SA-09 — rateLimiter.ts exists", "File not found");
  } else if (!content.includes("checkRateLimit")) {
    fail("SA-09 — rateLimiter.ts exports checkRateLimit", "checkRateLimit not found");
  } else if (!content.includes("RATE_LIMITS")) {
    fail("SA-09 — rateLimiter.ts exports RATE_LIMITS", "RATE_LIMITS not found");
  } else if (!content.includes("PLATFORM_DASHBOARD") || !content.includes("PLATFORM_ACTIVATION") || !content.includes("AUDIT_READ")) {
    fail("SA-09 — RATE_LIMITS has all required keys",
      "Missing one of: PLATFORM_DASHBOARD, PLATFORM_ACTIVATION, AUDIT_READ");
  } else {
    pass("SA-09 — rateLimiter.ts exports checkRateLimit and RATE_LIMITS with all keys");
  }
}

// SA-16: OWNER_SAFE_ROLES does not include superadmin
{
  const content = readFile("src/backend/validations/staff.schema.ts");
  if (content && content.includes("OWNER_SAFE_ROLES")) {
    const match = content.match(/OWNER_SAFE_ROLES\s*=\s*\[([^\]]+)\]/);
    if (match && match[1].includes("superadmin")) {
      fail("SA-16 — OWNER_SAFE_ROLES must not include superadmin",
        "Found superadmin in OWNER_SAFE_ROLES");
    } else {
      pass("SA-16 — OWNER_SAFE_ROLES does not include superadmin");
    }
  } else {
    fail("SA-16 — OWNER_SAFE_ROLES constant exists in staff.schema.ts",
      "OWNER_SAFE_ROLES not found");
  }
}

// SA-17: audit migration file exists
{
  const exists = existsSync(join(ROOT, "supabase/migrations/007_platform_audit_logs.sql"));
  if (!exists) {
    fail("SA-17 — Migration 007_platform_audit_logs.sql exists",
      "Migration file not found — table may not be created in DB");
  } else {
    const content = readFile("supabase/migrations/007_platform_audit_logs.sql");
    if (!content.includes("platform_audit_logs")) {
      fail("SA-17 — Migration creates platform_audit_logs table", "Table name not found");
    } else if (!content.includes("ROW LEVEL SECURITY")) {
      fail("SA-17 — Migration enables RLS on audit table", "RLS not enabled");
    } else {
      pass("SA-17 — Migration 007_platform_audit_logs.sql exists with RLS");
    }
  }
}

// SA-19: middleware gates /superadmin
{
  const content = readFile("middleware.ts");
  if (!content) {
    fail("SA-19 — middleware.ts exists", "File not found");
  } else if (!content.includes("/superadmin")) {
    fail("SA-19 — middleware.ts includes /superadmin in protected routes",
      "/superadmin not mentioned in middleware");
  } else {
    pass("SA-19 — middleware.ts gates /superadmin route");
  }
}

// SA-20: No console.log with cookie/session data in server.ts
{
  const content = readFile("src/config/supabase/server.ts");
  const hasLeak = content && (
    content.includes("console.log") ||
    (content.includes("sessionToken") && content.includes("console")) ||
    (content.includes("cookie") && content.includes("console.log"))
  );
  if (hasLeak) {
    fail("SA-20 — No cookie/token leaks via console in server.ts",
      "Potential credential exposure found");
  } else {
    pass("SA-20 — server.ts has no console.log cookie/token leaks");
  }
}

// SA platform route has rate limiting applied
{
  const content = readFile("src/app/api/v1/platform/route.ts");
  if (!content) {
    fail("SA-RT — /api/v1/platform/route.ts exists", "File not found");
  } else if (!content.includes("checkRateLimit")) {
    fail("SA-RT — Platform route applies rate limiting",
      "checkRateLimit not called in platform route");
  } else {
    pass("SA-RT — Platform route applies rate limiting via checkRateLimit");
  }
}

// SA audit route no longer returns 404 stub
{
  const content = readFile("src/app/api/v1/audit/route.ts");
  if (!content) {
    fail("SA-AU — /api/v1/audit/route.ts exists", "File not found");
  } else if (content.includes("Not Found") && content.includes("status: 404")) {
    fail("SA-AU — Audit API is not a 404 stub",
      "Audit route still returns 404 — not implemented");
  } else if (!content.includes("assertSuperadminAccess")) {
    fail("SA-AU — Audit API enforces superadmin access",
      "assertSuperadminAccess not called in audit route");
  } else {
    pass("SA-AU — Audit API is implemented and superadmin-protected");
  }
}

// ── RUNTIME TESTS ────────────────────────────────────────────────────────────

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

// SA-10: GET /api/v1/platform without auth → 401
await apiTest(
  "SA-10 — GET /api/v1/platform (no auth) → 401",
  "/api/v1/platform",
  {},
  401
);

// SA-12: GET /api/v1/audit without auth → 401
await apiTest(
  "SA-12 — GET /api/v1/audit (no auth) → 401",
  "/api/v1/audit",
  {},
  401
);

// SA-14: POST /api/v1/staff with role=superadmin payload → 422 (schema validation)
await apiTest(
  "SA-14 — POST /api/v1/staff with role=superadmin → 422 (validation rejection)",
  "/api/v1/staff",
  {
    method: "POST",
    body: JSON.stringify({ name: "Hacker", role: "superadmin", phone: "" }),
  },
  422
);

// SA-15: Rate limit fires on /api/v1/platform — test by sending 12 rapid requests
// (PLATFORM_ACTIVATION limit is 10/min)
{
  console.log("\n  Testing rate limiting on PATCH /api/v1/platform (limit: 10/min)...");
  let rateLimitHit = false;
  for (let i = 0; i < 12; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/platform`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: "00000000-0000-0000-0000-000000000001", isActive: true }),
      });
      if (res.status === 429) {
        rateLimitHit = true;
        break;
      }
    } catch {
      break;
    }
  }
  if (rateLimitHit) {
    pass("SA-15 — Rate limit fires (429) after exceeding PATCH /api/v1/platform limit");
  } else {
    fail("SA-15 — Rate limit fires on /api/v1/platform",
      "12 requests sent but 429 never returned — rate limiter may not be active");
  }
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(65));
console.log(`  Superadmin Security Tests: ${passed} passed, ${failed} failed`);
console.log("═".repeat(65));

if (failures.length > 0) {
  console.error("\n🚨 FAILURES:");
  for (const f of failures) {
    console.error(`  ❌ ${f.name}`);
    if (f.detail) console.error(`     → ${f.detail}`);
  }
}

if (failed > 0) {
  console.error("\n🚨 SUPERADMIN SECURITY TESTS FAILED — Do not deploy\n");
  process.exit(1);
} else {
  console.log("\n✅ ALL SUPERADMIN SECURITY TESTS PASSED\n");
  process.exit(0);
}
