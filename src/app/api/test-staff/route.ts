import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";

export async function GET() {
  const adminClient = createAdminClient();
  const { data: staffList } = await adminClient.from("staff").select("username, restaurant_id, status").eq("status", "ACTIVE").limit(5);
  
  if (!staffList || staffList.length === 0) {
    return NextResponse.json({ error: "No active staff found" });
  }

  const s = staffList[0];
  const { data: r } = await adminClient.from("restaurants").select("slug").eq("id", s.restaurant_id).single();

  return NextResponse.json({ staffList, restaurant: r });
}
