import { AuditRepository, type AuditLogEntry } from "@/backend/repositories/audit.repository";

/**
 * AuditService — fire-and-forget audit logging for all platform operations.
 *
 * Usage: `void AuditService.log({ ... })`
 *
 * Never throws. Audit failures are logged to stderr but never propagate
 * to callers so that primary operations are never blocked.
 */
export class AuditService {
  static async log(entry: AuditLogEntry): Promise<void> {
    await AuditRepository.insert(entry);
  }

  static async listLogs(params?: {
    action?: string;
    targetType?: string;
    targetId?: string;
    limit?: number;
  }) {
    return AuditRepository.list(params);
  }
}
