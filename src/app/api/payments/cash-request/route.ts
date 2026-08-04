import { NextResponse } from "next/server";
import { PaymentService } from "@/backend/services/payment/PaymentService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, restaurantId, amount, currency, billSnapshot, sessionVersion } = body;

    if (!sessionId || !restaurantId || !amount || !currency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payment = await PaymentService.requestCashPayment({
      sessionId,
      restaurantId,
      amount,
      currency,
      billSnapshot,
      sessionVersion,
      checkoutId: sessionId
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    if (error.message.includes("already completed") || error.message.includes("Session is already completed")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error creating cash request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
