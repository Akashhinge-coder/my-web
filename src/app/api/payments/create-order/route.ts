import { NextResponse } from "next/server";
import { PaymentService } from "@/backend/services/payment/payment.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, restaurantId, amount, currency, billSnapshot, sessionVersion } = body;
    const idempotencyKey = req.headers.get("Idempotency-Key") || undefined;

    if (!sessionId || !restaurantId || !amount || !currency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await PaymentService.createPayment({
      sessionId,
      restaurantId,
      amount,
      currency,
      billSnapshot,
      sessionVersion,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message.includes("Session already paid") || error.message.includes("completed")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error creating payment order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
