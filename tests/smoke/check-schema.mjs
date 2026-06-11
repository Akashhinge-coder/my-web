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
  // 1. Check orders columns by fetching actual rows
  const { data: orderRow, error: e1 } = await sb.from("orders").select("*").limit(1);
  if (orderRow && orderRow.length > 0) {
    console.log("orders columns (from row):", Object.keys(orderRow[0]).sort().join(", "));
    const required = ["subtotal","coupon_discount","loyalty_discount","happy_hour_discount",
      "taxable_amount","cgst","sgst","gst","total_discount","grand_total"];
    const present = Object.keys(orderRow[0]);
    const missing = required.filter(c => !present.includes(c));
    console.log("missing columns:", missing.length === 0 ? "NONE" : missing.join(", "));
  } else {
    console.log("orders table empty, trying schema via count...", e1?.message);
    // Try just checking column existence via insert failing
    const { data: d2, error: e2 } = await sb.from("orders").select("id, grand_total, subtotal").limit(0);
    console.log("column test (grand_total, subtotal):", e2 ? "FAIL: " + e2.message : "PASS");
  }
  
  // 2. Check coupons.max_discount
  const { error: ec } = await sb.from("coupons").select("id, max_discount").limit(0);
  console.log("coupons.max_discount:", ec ? "MISSING: " + ec.message : "EXISTS");
  
  // 3. Check happy_hours columns
  const { error: ehh } = await sb.from("happy_hours").select("id, category_ids, item_ids").limit(0);
  console.log("happy_hours.category_ids/item_ids:", ehh ? "MISSING: " + ehh.message : "EXISTS");
  
  // 4. Leaked test data
  const { data: leaked } = await sb.from("restaurants").select("id, name, slug").ilike("slug", "sec-test%");
  console.log("leaked test restaurants:", JSON.stringify(leaked));
  
  // 5. Demo user restaurants
  const { data: users } = await sb.auth.admin.listUsers();
  const demo = users?.users?.find(u => u.email === "demo@menuara.com");
  if (demo) {
    const { data: rests } = await sb.from("restaurants").select("id, name, slug").eq("owner_id", demo.id);
    console.log("demo user restaurants:", JSON.stringify(rests));
  }
}

run().catch(console.error);
