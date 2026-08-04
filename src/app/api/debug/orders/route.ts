export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";
import { PaymentService } from "@/backend/services/payment/PaymentService";

export async function GET() {
  const supabase = createAdminClient();
  const logs = [];
  const log = (msg) => logs.push(msg);

  try {
    log("Starting Create Order debug...");

    // Find any existing session to test with
    const { data: session } = await supabase
      .from("sessions")
      .select("id, restaurant_id")
      .eq("status", "active")
      .limit(1)
      .single();

    if (!session) {
       return NextResponse.json({ success: false, logs, error: "No active session" }, { status: 200 });
    }

    log(`Found session ${session.id} for restaurant ${session.restaurant_id}`);

    const result = await PaymentService.createPayment({
      sessionId: session.id,
      restaurantId: session.restaurant_id,
      amount: 500,
      currency: "INR",
      billSnapshot: [],
      sessionVersion: 1,
      checkoutId: session.id
    });

    log(`Payment created successfully: ${result.orderId}`);
    return NextResponse.json({ success: true, logs, result }, { status: 200 });
  } catch (err) {
    log(`ERROR: ${err.message}`);
    return NextResponse.json({ success: false, logs, error: err.message, stack: err.stack }, { status: 200 });
  }
}
