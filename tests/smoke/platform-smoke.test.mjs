import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/) ;
  if (match) {
    let value = match[2]?.trim() || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const BASE_URL = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let passed = 0;
let failed = 0;
let warnings = 0;
const report = [];

function p(area, item, status, notes = "") {
  const s = status === "PASS" ? "✅ PASS" : status === "WARN" ? "⚠️  WARN" : "❌ FAIL";
  console.log(`  ${s}  [${area}] ${item}${notes ? " → " + notes : ""}`);
  if (status === "PASS") passed++;
  else if (status === "WARN") warnings++;
  else failed++;
  report.push({ area, item, status, notes });
}

async function api(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const r = await fetch(url, { ...opts, redirect: "manual" });
    let body = null;
    try { body = await r.json(); } catch {}
    return { status: r.status, body, ok: r.ok };
  } catch (e) {
    return { status: 0, body: null, ok: false, err: e.message };
  }
}

async function authedApi(path, opts = {}) {
  // Get demo user session via Supabase admin
  const { data: users } = await supabase.auth.admin.listUsers();
  const demo = users?.users?.find(u => u.email === "demo@menuara.com");
  if (!demo) return { status: 0, body: null, ok: false };

  // Sign in to get a session token (use service role to create a link)
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: "demo@menuara.com",
  });
  // We'll use the anon key + magic-link token to exchange for session
  // For smoke testing we'll just test unauthenticated vs. authenticated behavior
  return api(path, opts);
}

async function run() {
  console.log("\n🔬 P0-SMOKE TEST — Full Platform Verification\n");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Supabase: ${env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  // ═══════════════════════════════════════════════════════
  // 1. DATABASE: Migration columns (via direct query, not information_schema)
  // ═══════════════════════════════════════════════════════
  console.log("── DATABASE: Migrations & Schema ─────────────────────────\n");

  // Check orders columns via direct select (service-role bypasses RLS)
  const { data: ordersRow, error: ordersErr } = await supabase.from("orders").select("*").limit(1);
  const ordersColNames = new Set(ordersRow && ordersRow.length > 0 ? Object.keys(ordersRow[0]) : []);
  
  // If no rows, verify columns exist by selecting them explicitly (error = missing)
  const requiredOrderCols = ["subtotal","coupon_discount","loyalty_discount","happy_hour_discount","taxable_amount","cgst","sgst","gst","total_discount","grand_total"];
  
  if (ordersColNames.size > 0) {
    for (const col of requiredOrderCols) {
      p("DB/Migrations", `orders.${col}`, ordersColNames.has(col) ? "PASS" : "FAIL", ordersColNames.has(col) ? "" : "column missing");
    }
  } else {
    // No orders exist — probe each column via empty select
    for (const col of requiredOrderCols) {
      const { error } = await supabase.from("orders").select(`id, ${col}`).limit(0);
      p("DB/Migrations", `orders.${col}`, !error ? "PASS" : "FAIL", error ? error.message.substring(0,60) : "");
    }
  }

  // Check coupons.max_discount
  const { error: couponErr } = await supabase.from("coupons").select("id, max_discount").limit(0);
  p("DB/Migrations", "coupons.max_discount", !couponErr ? "PASS" : "FAIL", couponErr?.message ?? "");

  // Check happy_hours columns
  const { error: hhErr } = await supabase.from("happy_hours").select("id, category_ids, item_ids").limit(0);
  p("DB/Migrations", "happy_hours.category_ids + item_ids", !hhErr ? "PASS" : "FAIL", hhErr?.message ?? "");

  // ═══════════════════════════════════════════════════════
  // 2. DATABASE: Data integrity
  // ═══════════════════════════════════════════════════════
  console.log("\n── DATABASE: Data Integrity ──────────────────────────────\n");

  // Check for orphan restaurants (from leaked test data)
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, slug, owner_id");
  p("DB/Integrity", `restaurants count (${restaurants?.length})`, restaurants?.length > 0 ? "PASS" : "FAIL");

  // Find orphan orders (no session)
  const { count: orphanOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .is("session_id", null);
  p("DB/Integrity", "no orphan orders (null session_id)", orphanOrders === 0 ? "PASS" : "WARN", orphanOrders > 0 ? `${orphanOrders} orphans` : "");

  // Active sessions
  const { count: activeSessions } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  p("DB/Integrity", `active sessions (${activeSessions ?? 0})`, "PASS");

  // ═══════════════════════════════════════════════════════
  // 3. CUSTOMER FLOW: Find the demo restaurant
  // ═══════════════════════════════════════════════════════
  console.log("\n── CUSTOMER FLOW ─────────────────────────────────────────\n");

  const { data: demoRestaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", "menuara-demo")
    .maybeSingle();

  if (!demoRestaurant) {
    // Try any restaurant
    const { data: anyRest } = await supabase.from("restaurants").select("id, name, slug").limit(1).single();
    if (!anyRest) {
      p("Customer/Menu", "demo restaurant exists", "FAIL", "no restaurant found at all");
    } else {
      p("Customer/Menu", "demo restaurant (menuara-demo)", "WARN", `using ${anyRest.slug} instead`);
    }
  } else {
    p("Customer/Menu", "demo restaurant exists (menuara-demo)", "PASS");
  }

  const slug = demoRestaurant?.slug ?? null;

  // Find an active session + table for that restaurant
  let tableId = null;
  let sessionToken = null;
  let tableNumber = null;
  if (slug) {
    const { data: table } = await supabase
      .from("restaurant_tables")
      .select("id, table_number, current_session_id")
      .eq("restaurant_id", demoRestaurant.id)
      .limit(1)
      .maybeSingle();
    
    if (table) {
      tableId = table.id;
      tableNumber = table.table_number;
      p("Customer/Menu", `table found (${table.table_number})`, "PASS");
      
      // Get or check active session
      const { data: session } = await supabase
        .from("sessions")
        .select("id, status, session_token, expires_at")
        .eq("table_id", table.id)
        .eq("status", "active")
        .maybeSingle();
      
      if (session) {
        sessionToken = session.session_token;
        p("Customer/Session", `active session exists`, "PASS", `expires: ${session.expires_at}`);
      } else {
        p("Customer/Session", "active session exists", "WARN", "no active session for this table");
      }
    } else {
      p("Customer/Menu", "table found", "FAIL", "no tables for demo restaurant");
    }
  }

  // Test customer menu page
  if (slug && tableId) {
    const customerUrl = `/${slug}/${tableId}`;
    const t0 = Date.now();
    const r = await api(customerUrl);
    const elapsed = Date.now() - t0;
    p("Customer/Menu", `GET ${customerUrl}`, r.status === 200 ? "PASS" : "FAIL", `HTTP ${r.status} (${elapsed}ms)`);
    if (elapsed > 2000) p("Customer/Perf", "customer menu load time", "WARN", `${elapsed}ms exceeds 2s threshold`);
  }

  // Test menu API
  if (slug) {
    const t0 = Date.now();
    const r = await api(`/api/v1/menu?slug=${slug}`);
    const elapsed = Date.now() - t0;
    p("Customer/Menu", "GET /api/v1/menu", r.status === 200 ? "PASS" : "FAIL", `HTTP ${r.status} (${elapsed}ms)`);
    // Response shape: { data: { categories: [{id, name, dishes: [...]}, ...] } }
    const cats = r.body?.data?.categories;
    const hasCats = Array.isArray(cats);
    p("Customer/Menu", "menu returns categories array", hasCats ? "PASS" : "FAIL", hasCats ? `${cats.length} categories` : JSON.stringify(r.body)?.substring(0,80));
      const flatDishes = r.body?.data?.dishes;
      const totalDishes = Array.isArray(flatDishes)
        ? flatDishes.length
        : (Array.isArray(cats) ? cats.reduce((sum, cat) => sum + (cat.dishes?.length ?? 0), 0) : 0);
      p("Customer/Menu", `dishes loaded (${totalDishes} total)`, totalDishes > 0 ? "PASS" : "WARN");
  }

  // Test sessions API
  if (tableId) {
    const r = await api(`/api/v1/sessions?tableId=${tableId}`);
    p("Customer/Session", "GET /api/v1/sessions", r.status === 200 || r.status === 404 ? "PASS" : "FAIL", `HTTP ${r.status}`);
  }

  // ═══════════════════════════════════════════════════════
  // 4. API ROUTES: Unauthenticated behaviour
  // ═══════════════════════════════════════════════════════
  console.log("\n── API ROUTES: Auth Guard Verification ───────────────────\n");

  const protectedRoutes = [
    "/api/v1/dashboard",
    "/api/v1/orders",
    "/api/v1/settings",
    "/api/v1/analytics",
    "/api/v1/billing",
    "/api/v1/auth/session",
    "/api/v1/restaurants",
  ];

  for (const route of protectedRoutes) {
    const r = await api(route);
    const isProtected = r.status === 401 || r.status === 403 || r.status === 307 || r.status === 200;
    // 200 on /auth/session is valid (returns authenticated: false)
    const label = route === "/api/v1/auth/session" 
      ? (r.status === 200 ? "PASS" : "FAIL")
      : (r.status === 401 || r.status === 403 ? "PASS" : r.status === 500 ? "FAIL" : "WARN");
    p("API/AuthGuard", `GET ${route}`, label, `HTTP ${r.status}`);
  }

  // ═══════════════════════════════════════════════════════
  // 5. Order placement security
  // ═══════════════════════════════════════════════════════
  console.log("\n── ORDER SECURITY: Missing Cookie ────────────────────────\n");

  if (demoRestaurant && tableId) {
    // Test: order without session cookie → should 401
    const r = await api(
      `/api/v1/orders?restaurantId=${demoRestaurant.id}&mode=place`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, items: [] }),
      }
    );
    p("Order/Security", "no cookie → 401", r.status === 401 ? "PASS" : "FAIL", `HTTP ${r.status}`);
  }

  // ═══════════════════════════════════════════════════════
  // 6. DB: Check for leaked test data
  // ═══════════════════════════════════════════════════════
  console.log("\n── DATABASE: Test Data Hygiene ───────────────────────────\n");

  const { data: testRests } = await supabase
    .from("restaurants")
    .select("id, name")
    .like("name", "Security Test%");
  
  if (testRests?.length > 0) {
    p("DB/Hygiene", "no leaked security test restaurants", "WARN", `found ${testRests.length}: ${testRests.map(r=>r.name).join(", ")}`);
  } else {
    p("DB/Hygiene", "no leaked security test restaurants", "PASS");
  }

  // Check demo user restaurant count
  const { data: users } = await supabase.auth.admin.listUsers();
  const demo = users?.users?.find(u => u.email === "demo@menuara.com");
  if (demo) {
    const { data: demoRests } = await supabase
      .from("restaurants")
      .select("id, name, slug")
      .eq("owner_id", demo.id);
    p("DB/Hygiene", `demo user owns ${demoRests?.length} restaurant(s)`, demoRests?.length === 1 ? "PASS" : "WARN", 
      demoRests?.map(r => r.slug).join(", "));
    if (demoRests?.length > 1) {
      p("Admin/Session", "auth session 500 root cause", "FAIL", 
        `demo user has ${demoRests.length} restaurants → auth session returns PGRST116`);
    } else {
      // Verify /api/v1/auth/session now returns 200 (not 500)
      const r = await api("/api/v1/auth/session");
      const noError = r.status === 200 && !r.body?.error;
      p("Admin/Session", "GET /api/v1/auth/session (live)", noError ? "PASS" : "FAIL", 
        `HTTP ${r.status} authenticated=${r.body?.data?.authenticated ?? r.body?.authenticated ?? "?"}`);
    }
  }

  // Test admin page routes (unauthenticated - should redirect or 401, NOT 500)
  console.log("\n── ADMIN PAGES: Error-Free Navigation ────────────────────\n");
  const adminPages = ["/admin", "/admin/orders", "/admin/menu", "/admin/billing", "/admin/analytics", "/admin/settings"];
  for (const page of adminPages) {
    const r = await api(page);
    // Should be 200 (login redirect renders), 307 redirect, or some redirect — NOT 500
    const isOk = r.status >= 200 && r.status < 500;
    p("Admin/Pages", `GET ${page}`, isOk ? "PASS" : "FAIL", `HTTP ${r.status}`);
  }

  // ═══════════════════════════════════════════════════════
  // 7. PERFORMANCE
  // ═══════════════════════════════════════════════════════
  console.log("\n── PERFORMANCE ───────────────────────────────────────────\n");
  
  if (slug) {
    const endpoints = [
      `/api/v1/menu?slug=${slug}`,
    ];
    if (tableId) endpoints.push(`/api/v1/sessions?tableId=${tableId}`);

    for (const ep of endpoints) {
      const t0 = Date.now();
      await api(ep);
      const elapsed = Date.now() - t0;
      p("Performance", ep, elapsed < 2000 ? "PASS" : "WARN", `${elapsed}ms`);
    }
  }

  // ═══════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log(`  SMOKE TEST RESULTS: ${passed} PASS  ${warnings} WARN  ${failed} FAIL`);
  console.log("═".repeat(60) + "\n");

  console.log("PASS/FAIL MATRIX:\n");
  const areas = [...new Set(report.map(r => r.area))];
  for (const area of areas) {
    const areaItems = report.filter(r => r.area === area);
    const areaFails = areaItems.filter(r => r.status === "FAIL").length;
    const areaWarns = areaItems.filter(r => r.status === "WARN").length;
    const emoji = areaFails > 0 ? "❌" : areaWarns > 0 ? "⚠️" : "✅";
    console.log(`  ${emoji}  ${area.padEnd(25)} ${areaFails > 0 ? `${areaFails} FAIL` : ""}${areaWarns > 0 ? ` ${areaWarns} WARN` : ""}`);
  }

  const criticals = report.filter(r => r.status === "FAIL");
  const warns = report.filter(r => r.status === "WARN");

  if (criticals.length > 0) {
    console.log("\nCRITICAL ISSUES:");
    criticals.forEach(i => console.log(`  ❌ [${i.area}] ${i.item}: ${i.notes}`));
  }
  if (warns.length > 0) {
    console.log("\nWARNINGS:");
    warns.forEach(i => console.log(`  ⚠️  [${i.area}] ${i.item}: ${i.notes}`));
  }

  const verdict = failed > 0 ? "FAIL – Fix issues before proceeding"
    : warnings > 0 ? "PASS WITH WARNINGS"
    : "PASS – Platform stable";
  console.log(`\n  VERDICT: ${verdict}\n`);

  // Write JSON report
  const reportData = { timestamp: new Date().toISOString(), passed, warnings, failed, verdict, items: report };
  fs.writeFileSync("smoke-test-results.json", JSON.stringify(reportData, null, 2));
  console.log("  Full report written to smoke-test-results.json\n");
}

run().catch(console.error);
