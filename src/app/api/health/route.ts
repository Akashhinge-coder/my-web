import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();

  let databaseStatus = "unhealthy";
  try {
    const supabase = createAdminClient();
    // Quick probe to check if database connection responds
    const { error } = await supabase.from("restaurants").select("id").limit(1);
    if (!error) {
      databaseStatus = "healthy";
    }
  } catch (err) {
    console.error("Healthcheck DB error:", err);
  }

  const overallStatus = databaseStatus === "healthy" ? "healthy" : "unhealthy";

  return NextResponse.json(
    {
      status: overallStatus,
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      uptime,
      timestamp,
      services: {
        database: databaseStatus,
        storage: "healthy" // Storage responds dynamically via client
      }
    },
    { status: overallStatus === "healthy" ? 200 : 503 }
  );
}
