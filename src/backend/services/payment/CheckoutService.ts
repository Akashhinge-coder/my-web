import { createAdminClient } from "@/config/supabase/server";

export class CheckoutService {
  /**
   * Called by the OutboxProcessor when a payment is captured.
   * This is where we handle the side-effects that were previously coupled in the PaymentService.
   */
  static async completeCheckout(sessionId: string, paymentId: string, method: string, amount: number) {
    const supabase = createAdminClient();

    // 1. Mark checkout as completed
    const { error: checkoutError, data: checkoutData } = await supabase
      .from("checkouts")
      .update({
        state: "PAYMENT_COMPLETED",
        completed_at: new Date().toISOString()
      })
      .eq("session_id", sessionId)
      .select("id")
      .single();

    if (checkoutError) {
      console.error("Failed to update checkout:", checkoutError);
      throw checkoutError;
    }

    // 2. Mark session as closed
    const { error: sessionError, data: sessionData } = await supabase
      .from("sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .select("table_id")
      .single();

    if (sessionError) {
      console.error("Failed to close session:", sessionError);
      throw sessionError;
    }

    // 3. Mark table as cleaning
    const { error: tableError } = await supabase
      .from("restaurant_tables")
      .update({
        status: "cleaning",
        current_session_id: null
      })
      .eq("id", sessionData.table_id);

    if (tableError) {
      console.error("Failed to free table:", tableError);
      throw tableError;
    }

    return true;
  }
}
