import { createAdminClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // In production, this should have a secret key to prevent unauthorized access
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Find expired pending payments
    const { data: expiredPayments, error: fetchError } = await supabase
      .from("payments")
      .select("id, session_id")
      .eq("payment_status", "pending")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredPayments || expiredPayments.length === 0) {
      return NextResponse.json({ success: true, message: "No expired payments found." });
    }

    const expiredIds = expiredPayments.map((p) => p.id);

    // 2. Mark them as expired
    const { error: updateError } = await supabase
      .from("payments")
      .update({ payment_status: "expired" })
      .in("id", expiredIds);

    if (updateError) throw updateError;

    // 3. (Optional) In our case we might revert table to 'Occupied'.
    // If the table was in 'awaiting_payment', we should revert it to 'occupied'.
    // But we need to ensure no OTHER pending payments exist for the same session.
    // Since this is a batch cron job, we might need an RPC for complete safety, 
    // or just handle it. For V1 we just update the payment_status.

    return NextResponse.json({ success: true, count: expiredIds.length });
  } catch (error: any) {
    console.error("Cleanup job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
