import { NextResponse } from "next/server";
import { PaymentService } from "@/backend/services/payment/PaymentService";
import { createAdminClient } from "@/config/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentId, checkoutId } = body;

    if (!paymentId || !checkoutId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const supabase = createAdminClient();
    const { data: payment, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error || !payment) throw new Error("Payment not found");
    if (payment.payment_status !== "pending") throw new Error("Cannot cancel this payment");

    // Cancel pending cash request
    const { PaymentRepository } = await import("@/backend/repositories/payment.repository");
    
    await PaymentRepository.processPaymentTransition(
      payment.id,
      payment.version,
      "cancelled",
      "cancelled",
      checkoutId,
      "PaymentCancelled",
      { reason: "Customer or Staff cancelled cash request" }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error cancelling cash payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
