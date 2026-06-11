/**
 * Cleanup leaked security test data from order-session-validation.test.mjs
 * These restaurants were created as test fixtures but not deleted due to
 * cleanup running after the sessions table already had dependent rows,
 * or due to foreign key constraint ordering.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const env = {};
fs.readFileSync(path.resolve(".env.local"), "utf-8").split(/\r?\n/).forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("🧹 Cleaning leaked security test data...\n");

  const testSlugs = ["sec-test-rest-a", "sec-test-rest-b"];
  
  // Get the restaurant IDs
  const { data: rests, error: fetchErr } = await sb
    .from("restaurants")
    .select("id, name, slug")
    .in("slug", testSlugs);
    
  if (fetchErr) { console.error("Failed to fetch test restaurants:", fetchErr.message); process.exit(1); }
  if (!rests || rests.length === 0) { console.log("No leaked test restaurants found — already clean."); return; }
  
  console.log("Found leaked restaurants:");
  rests.forEach(r => console.log(`  - ${r.name} (${r.slug}) [${r.id}]`));
  
  const restIds = rests.map(r => r.id);

  // 1. Delete orders linked to sessions in these restaurants
  const { data: sessions } = await sb.from("sessions").select("id").in("restaurant_id", restIds);
  const sessionIds = (sessions || []).map(s => s.id);
  
  if (sessionIds.length > 0) {
    const { data: orders } = await sb.from("orders").select("id").in("session_id", sessionIds);
    const orderIds = (orders || []).map(o => o.id);
    if (orderIds.length > 0) {
      await sb.from("order_items").delete().in("order_id", orderIds);
      await sb.from("orders").delete().in("id", orderIds);
      console.log(`  Deleted ${orderIds.length} orders`);
    }
    await sb.from("sessions").delete().in("id", sessionIds);
    console.log(`  Deleted ${sessionIds.length} sessions`);
  }

  // 2. Delete tables
  const { error: t1 } = await sb.from("restaurant_tables").delete().in("restaurant_id", restIds);
  if (t1) console.error("  Tables delete error:", t1.message);
  else console.log("  Deleted restaurant tables");

  // 3. Delete dishes + categories
  const { data: cats } = await sb.from("categories").select("id").in("restaurant_id", restIds);
  const catIds = (cats || []).map(c => c.id);
  if (catIds.length > 0) {
    await sb.from("dishes").delete().in("category_id", catIds);
    await sb.from("categories").delete().in("id", catIds);
    console.log(`  Deleted ${catIds.length} categories and their dishes`);
  }

  // 4. Delete the restaurants themselves
  const { error: restErr } = await sb.from("restaurants").delete().in("id", restIds);
  if (restErr) {
    console.error("  Restaurant delete error:", restErr.message);
    process.exit(1);
  } else {
    console.log(`  Deleted ${restIds.length} leaked test restaurants`);
  }

  // 5. Verify
  const { data: check } = await sb.from("restaurants").select("id").in("slug", testSlugs);
  if (!check || check.length === 0) {
    console.log("\n✅ Cleanup complete — all test data removed.");
  } else {
    console.error("\n❌ Cleanup incomplete — some restaurants remain:", check);
    process.exit(1);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
