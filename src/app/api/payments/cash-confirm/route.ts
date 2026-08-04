import { NextResponse } from "next/server";
import { PaymentService } from "@/backend/services/payment/PaymentService";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import { createClient } from "@/config/supabase/server";
import { BillingRepository } from "@/backend/repositories/billing.repository";

export async function POST(req: Request) {
  try {
    const access = await resolveRestaurantAccess(); // ensures staff is authed
    
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    
    const body = await req.json();
    const { paymentId, checkoutId } = body;

    if (!paymentId || !checkoutId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const success = await PaymentService.confirmCashPayment({
      paymentId,
      staffId: user.id,
      checkoutId
    });

    if (success) {
      await BillingRepository.closeSession(access.restaurantId, checkoutId);
      await BillingRepository.releaseTable(access.restaurantId, checkoutId);
    }

    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("Error confirming cash payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
