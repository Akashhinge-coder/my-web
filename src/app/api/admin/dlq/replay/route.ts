import { NextResponse } from "next/server";
import { DLQReplayService } from "@/backend/services/payment/DLQReplayService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, adminId, adminRole, adminPermissions = [] } = body;

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID required" }, { status: 400 });
    }

    // Role check invariant: Must be superadmin or have explicit replay permission
    if (adminRole !== "SUPERADMIN" && !adminPermissions.includes("payments.replay_dlq")) {
      return NextResponse.json({ error: "Forbidden: Missing replay permissions" }, { status: 403 });
    }

    if (eventId) {
      // Replay single event
      await DLQReplayService.replayEvent(eventId, adminId);
      return NextResponse.json({ success: true, replayed: 1 });
    } else {
      // Replay batch
      const count = await DLQReplayService.replayBatch(adminId);
      return NextResponse.json({ success: true, replayed: count });
    }
  } catch (error: any) {
    console.error("DLQ Replay error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
