import { NextResponse } from "next/server";
import { PaymentService } from "@/backend/services/payment/PaymentService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, restaurantId, method, amount, currency, billSnapshot, sessionVersion, staffId } = body;

    if (!sessionId || !restaurantId || !method || !amount || !currency || !staffId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (method !== "cash" && method !== "pos") {
      return NextResponse.json({ error: "Invalid manual payment method" }, { status: 400 });
    }

    const success = await PaymentService.completeManualPayment({
      sessionId,
      restaurantId,
      method,
      amount,
      currency,
      billSnapshot,
      sessionVersion,
      staffId,
      checkoutId: sessionId
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to complete manual payment" }, { status: 500 });
    }
  } catch (error: any) {
    if (error.message.includes("already completed") || error.message.includes("Session is already completed")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error creating manual payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
