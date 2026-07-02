import { NextResponse } from "next/server";
import { PaymentTestSuite } from "@/testing/payment/PaymentTestSuite";

export async function GET(req: Request) {
  // Enforce development-only access
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Test runner is disabled in production." }, { status: 403 });
  }

  try {
    const suite = new PaymentTestSuite();
    const results = await suite.runAll();
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalTime = results.reduce((acc, r) => acc + r.durationMs, 0);

    return NextResponse.json({
      summary: { passed, failed, totalTimeMs: totalTime },
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
