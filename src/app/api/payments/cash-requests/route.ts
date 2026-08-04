import { NextResponse } from "next/server";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import { createAdminClient } from "@/config/supabase/server";
import { ok } from "@/backend/utils/apiResponse";

export async function GET(req: Request) {
  try {
    const { restaurantId } = await resolveRestaurantAccess();
    
    const supabase = createAdminClient();
    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        created_at,
        session_id,
        restaurant_id,
        payment_method,
        payment_status,
        session:sessions (
          restaurant_tables (
            table_number
          )
        )
      `)
      .eq("restaurant_id", restaurantId)
      .eq("payment_method", "cash")
      .eq("payment_status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return ok(payments || []);
  } catch (error: any) {
    console.error("Error fetching cash requests:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
