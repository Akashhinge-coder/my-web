import { NextResponse } from "next/server";
import { PaymentService } from "@/backend/services/payment/PaymentService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, amount, currency } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json({ error: "Missing Razorpay details" }, { status: 400 });
    }

    // In V2, we simulate a mock webhook trigger for local development.
    // We bypass signature verification since RazorpayGateway returns true for mock_secret.
    const success = await PaymentService.processWebhook(
      razorpay_order_id,
      razorpay_payment_id,
      "mock_event_" + Date.now(),
      "mock_signature",
      "{}",
      amount,
      currency
    );

    if (success) {
      return NextResponse.json({ success: true });
    } else {
       return NextResponse.json({ error: "Failed to finalize payment" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error verifying mock payment:", error);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
