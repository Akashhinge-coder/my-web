import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: restaurants } = await supabase.from("restaurants").select("id, slug, name");
    const { data: requests } = await supabase.from("reservation_requests").select("*");
    
    return NextResponse.json({ restaurants, requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
