import { createAdminClient } from "@/config/supabase/server";

export interface AuditLogEntry {
  actorUserId: string;
  action: AuditAction;
  targetType: string | null;
  targetId: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * All recognised platform audit actions.
 * Keep this in sync with the security regression tests.
 */
export type AuditAction =
  | "SUPERADMIN_LOGIN"
  | "VIEW_PLATFORM_DASHBOARD"
  | "ACTIVATE_RESTAURANT"
  | "DEACTIVATE_RESTAURANT"
  | "ROLE_CHANGE"
  | "STAFF_DELETE"
  | "PLATFORM_CONFIGURATION_CHANGE";

export class AuditRepository {
  /**
   * Inserts an immutable audit log entry using the service-role admin client
   * (bypasses RLS — required since no anon/authenticated policies are defined).
   * Never throws — audit failures must not block the primary operation.
   */
  static async insert(entry: AuditLogEntry): Promise<void> {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("platform_audit_logs").insert({
        actor_user_id: entry.actorUserId,
        action: entry.action,
        target_type: entry.targetType,
        target_id: entry.targetId,
        metadata: entry.metadata ?? {},
        ip_address: entry.ipAddress ?? null,
      });

      if (error) {
        // Log to stderr only — do not expose DB error to caller
        console.error("[AuditRepository] Failed to write audit log:", error.code);
      }
    } catch {
      // Audit failures are non-fatal — primary operation must not be blocked.
      console.error("[AuditRepository] Unexpected error writing audit log");
    }
  }

  /**
   * Lists audit logs. Superadmin-only — caller must have already verified access.
   * Supports optional filtering by action or target.
   */
  static async list(params?: {
    action?: string;
    targetType?: string;
    targetId?: string;
    limit?: number;
  }) {
    const supabase = createAdminClient();
    let query = supabase
      .from("platform_audit_logs")
      .select("id, actor_user_id, action, target_type, target_id, metadata, ip_address, created_at")
      .order("created_at", { ascending: false })
      .limit(params?.limit ?? 100);

    if (params?.action) query = query.eq("action", params.action);
    if (params?.targetType) query = query.eq("target_type", params.targetType);
    if (params?.targetId) query = query.eq("target_id", params.targetId);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
