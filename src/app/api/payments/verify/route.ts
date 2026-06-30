import { NextResponse } from "next/server";
import { PaymentService } from "@/backend/services/payment/payment.service";
import { RazorpayService } from "@/backend/services/payment/razorpay.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing Razorpay details" }, { status: 400 });
    }

    // Verify signature
    const isValid = RazorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Use webhook processing logic because it handles idempotency and validation
    const success = await PaymentService.processWebhook(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature, // In a real app we'd pass signature if needed, here passing as part of the flow
      amount,
      currency
    );

    if (success) {
      return NextResponse.json({ success: true });
    } else {
       return NextResponse.json({ error: "Failed to finalize payment" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
