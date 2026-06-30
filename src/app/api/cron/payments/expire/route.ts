import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";

export async function POST(req: Request) {
  // Normally protected by a cron secret token
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev_cron_secret"}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let processed = 0;

  try {
    while (true) {
      // Find expired payments
      const { data: expiredPayments, error: fetchError } = await supabase
        .from("payments")
        .select("id, version, session_id")
        .eq("payment_status", "pending")
        .lte("expires_at", new Date().toISOString())
        .limit(100);

      if (fetchError) throw fetchError;
      if (!expiredPayments || expiredPayments.length === 0) break;

      for (const p of expiredPayments) {
        // Expire atomically via RPC to also log event
        await supabase.rpc("process_payment_transition", {
          p_payment_id: p.id,
          p_expected_version: p.version,
          p_payment_status: "expired",
          p_gateway_status: "expired",
          p_receipt_snapshot: null,
          p_receipt_number: null,
          p_outbox_aggregate_id: p.session_id, // we use session_id for checkout_id mapping right now
          p_outbox_event_type: "PaymentExpired",
          p_outbox_payload: { paymentId: p.id, timestamp: new Date().toISOString() }
        });
        processed++;
      }
    }

    return NextResponse.json({ success: true, processed });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
