import { NextResponse } from "next/server";
import { PaymentRepository } from "@/backend/repositories/payment.repository";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    const payment = await PaymentRepository.findPendingPayment(sessionId);
    
    if (payment) {
      return NextResponse.json({ status: payment.payment_status });
    }

    // If no pending payment, check if there is a recently captured one
    const { createAdminClient } = await import("@/config/supabase/server");
    const supabase = createAdminClient();
    const { data: recent } = await supabase
      .from("payments")
      .select("payment_status")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      return NextResponse.json({ status: recent.payment_status });
    }

    return NextResponse.json({ status: "none" });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
