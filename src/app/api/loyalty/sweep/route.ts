import { createAdminClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // In production, this should have a secret key to prevent unauthorized access
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Call the Postgres RPC to sweep pending loyalty points
    const { data: sweptCount, error } = await supabase.rpc("sweep_pending_loyalty_points");

    if (error) {
      console.error("Loyalty sweep RPC error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, count: sweptCount });
  } catch (error: any) {
    console.error("Loyalty sweep job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
