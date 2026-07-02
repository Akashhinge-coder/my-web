// scripts/payment-test-runner.ts
import { PaymentTestSuite } from "../src/testing/payment/PaymentTestSuite.ts";

async function main() {
  console.log("=========================================");
  console.log("   MENUARA PAYMENT ARCHITECTURE TESTS    ");
  console.log("=========================================\n");

  const suite = new PaymentTestSuite();
  console.log("Running suites...");
  const results = await suite.runAll();

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);
  const totalTime = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log("\n--- RESULTS ---");
  
  for (const r of results) {
    if (r.passed) {
      console.log(`✅ [${r.suite}] ${r.name} (${r.durationMs}ms)`);
    } else {
      console.log(`❌ [${r.suite}] ${r.name}`);
      console.error(`   Error: ${r.error}\n`);
    }
  }

  console.log("\n=========================================");
  console.log(`Summary: ${passed.length} Passed, ${failed.length} Failed`);
  console.log(`Execution Time: ${totalTime}ms`);
  console.log("=========================================\n");

  if (failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Execute
main().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
