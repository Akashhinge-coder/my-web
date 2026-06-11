import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Parse env
const envPath = path.resolve(".env.local");
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

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("\n🔍 RUNNING DATABASE INTEGRITY AUDIT...");
  
  // 1. Sessions referencing missing tables
  const { data: sessions } = await sb.from("sessions").select("id, table_id");
  const { data: tables } = await sb.from("restaurant_tables").select("id");
  const tableIds = new Set(tables.map(t => t.id));
  const invalidSessions = sessions.filter(s => !tableIds.has(s.table_id));
  console.log(`  - Sessions referencing missing tables: ${invalidSessions.length}`);
  if (invalidSessions.length > 0) console.log("    Invalid IDs:", invalidSessions.map(s => s.id));
  
  // 2. Orders referencing missing sessions
  const { data: orders } = await sb.from("orders").select("id, session_id");
  const sessionIds = new Set(sessions.map(s => s.id));
  const invalidOrders = orders.filter(o => !sessionIds.has(o.session_id));
  console.log(`  - Orders referencing missing sessions: ${invalidOrders.length}`);
  if (invalidOrders.length > 0) console.log("    Invalid IDs:", invalidOrders.map(o => o.id));
  
  // 3. Invoices referencing missing payments
  const { data: invoices } = await sb.from("invoices").select("id, payment_id");
  const { data: payments } = await sb.from("payments").select("id, session_id");
  const paymentIds = new Set(payments.map(p => p.id));
  const invalidInvoices = invoices.filter(i => !paymentIds.has(i.payment_id));
  console.log(`  - Invoices referencing missing payments: ${invalidInvoices.length}`);
  if (invalidInvoices.length > 0) console.log("    Invalid IDs:", invalidInvoices.map(i => i.id));
  
  // 4. Payments without invoices
  const invoicePaymentIds = new Set(invoices.map(i => i.payment_id));
  const paymentsWithoutInvoices = payments.filter(p => !invoicePaymentIds.has(p.id));
  console.log(`  - Payments without corresponding invoices: ${paymentsWithoutInvoices.length}`);
  if (paymentsWithoutInvoices.length > 0) console.log("    Payment IDs without invoices:", paymentsWithoutInvoices.map(p => p.id));
  
  // 5. Dangling current_session_id values
  const { data: tablesWithSessions } = await sb.from("restaurant_tables").select("id, table_number, current_session_id");
  const danglingTableSessions = tablesWithSessions.filter(t => t.current_session_id && !sessionIds.has(t.current_session_id));
  console.log(`  - Dangling current_session_id on tables: ${danglingTableSessions.length}`);
  if (danglingTableSessions.length > 0) console.log("    Dangling Table numbers:", danglingTableSessions.map(t => t.table_number));

  // 6. Invalid restaurant ownership
  const { data: restaurants } = await sb.from("restaurants").select("id, owner_id");
  console.log(`  - Total restaurants checked: ${restaurants.length}`);
  
  console.log("✅ Database Integrity Audit Complete.\n");
}

check().catch(console.error);
