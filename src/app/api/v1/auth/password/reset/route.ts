import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { AuditService } from "@/backend/services/audit.service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify if user is staff
    const { data: staffData } = await adminClient
      .from("staff")
      .select("id, restaurant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (staffData) {
      // Update staff record
      await adminClient
        .from("staff")
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
          temporary_password_expires_at: null,
        })
        .eq("id", staffData.id);

      // Revoke all previous active sessions to force re-login elsewhere
      await adminClient
        .from("staff_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("staff_id", staffData.id)
        .is("revoked_at", null);

      // Audit Log
      void AuditService.log({
        actorUserId: user.id,
        action: "PASSWORD_CHANGED",
        targetType: "staff",
        targetId: staffData.id,
        metadata: { restaurantId: staffData.restaurant_id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
