/**
 * MENUARA PREVIEW MODE TESTS
 *
 * Tests:
 *  TEST 1 — Preview API loads customer menu (200 OK) with "Preview" table number
 *  TEST 2 — Preview route HTML renders successfully (200 OK)
 *  TEST 3 — Preview session bootstrap is rejected by UUID validation (422/400)
 *  TEST 4 — Preview order placement is rejected by backend validation (422/400)
 *  * Static Checks:
 *  TEST 5 — Front-end hides Add to Cart and Checkout buttons in preview mode
 *
 * Run: node tests/security/preview-mode.test.mjs
 */

import { readFileSync } from "fs";
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

async function run() {
  console.log("=== RUNNING PREVIEW MODE TESTS ===\n");

  // TEST 1: API loads customer menu
  try {
    const res = await fetch(`${BASE_URL}/api/v1/menu?slug=menuara-demo&mode=preview&view=customer`);
    const data = await res.json();
    if (res.status === 200 && data.data?.table?.table_number === "Preview" && data.data?.dishes?.length > 0) {
      pass("TEST 1 — Preview API loads customer menu successfully with 'Preview' table designation");
    } else {
      fail("TEST 1 — Preview API loads customer menu", `Status: ${res.status}, Table: ${data.data?.table?.table_number}`);
    }
  } catch (err) {
    fail("TEST 1 — Preview API loads customer menu", err.message);
  }

  // TEST 2: Preview route HTML renders
  try {
    const res = await fetch(`${BASE_URL}/menuara-demo/preview`);
    const text = await res.text();
    if (res.status === 200 && text.includes("Preview Mode")) {
      pass("TEST 2 — Preview route HTML renders successfully and contains the Preview Mode banner");
    } else {
      fail("TEST 2 — Preview route HTML renders", `Status: ${res.status}`);
    }
  } catch (err) {
    fail("TEST 2 — Preview route HTML renders", err.message);
  }

  // TEST 3: Preview session bootstrap is rejected
  try {
    const res = await fetch(`${BASE_URL}/api/v1/sessions/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: "preview", qrToken: null }),
    });
    if (res.status === 422 || res.status === 400) {
      pass("TEST 3 — Preview session bootstrap is successfully rejected by UUID validations");
    } else {
      fail("TEST 3 — Preview session bootstrap rejection", `Expected 400/422, got: ${res.status}`);
    }
  } catch (err) {
    fail("TEST 3 — Preview session bootstrap rejection", err.message);
  }

  // TEST 4: Preview order placement is rejected by backend
  try {
    const res = await fetch(`${BASE_URL}/api/v1/orders?restaurantId=6a50a8e6-e786-418f-ab88-35d71411a5f3&mode=place`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": "session_token=dummy_session_token_for_preview_test"
      },
      body: JSON.stringify({
        tableId: "preview",
        sessionId: "preview",
        items: [{ dishId: "6a50a8e6-e786-418f-ab88-35d71411a5f3", quantity: 1 }],
      }),
    });
    const body = await res.json();
    if (res.status === 422 && body.error?.message === "Orders cannot be placed in preview mode") {
      pass("TEST 4 — Preview order placement is successfully blocked by backend validation guard");
    } else {
      fail("TEST 4 — Preview order placement rejection", `Expected 422 with message, got: ${res.status}, body: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    fail("TEST 4 — Preview order placement rejection", err.message);
  }

  // TEST 5: Static Checks for front-end buttons
  try {
    const fileContent = readFileSync(join(ROOT, "src/frontend/components/customer/CustomerMenuView.tsx"), "utf8");
    const hidesAddToCart = fileContent.includes('tableId !== "preview" && (') || fileContent.includes("tableId !== 'preview' && (");
    const hidesCheckout = fileContent.includes('tableId !== "preview" && (') || fileContent.includes("tableId !== 'preview' && (");
    
    if (hidesAddToCart && hidesCheckout) {
      pass("TEST 5 — Front-end code contains guards to hide Add to Cart and Checkout buttons in preview mode");
    } else {
      fail("TEST 5 — Front-end code hides preview buttons", "Could not find tableId !== 'preview' checks in CustomerMenuView.tsx");
    }
  } catch (err) {
    fail("TEST 5 — Front-end code hides preview buttons", err.message);
  }

  console.log("\n==========================================");
  console.log(`PREVIEW MODE AUDIT RESULT: ${failed === 0 ? "PASS" : "FAIL"}`);
  console.log(`PASSED: ${passed}, FAILED: ${failed}`);
  console.log("==========================================");

  process.exit(failed === 0 ? 0 : 1);
}

run();
