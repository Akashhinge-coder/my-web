-- ═══════════════════════════════════════════════════════════
--   MENUARA — Platform Audit Logs
--   Migration 007 — Immutable Platform Audit Trail
--
--   Creates a write-only, append-only audit log table for all
--   platform-level actions performed by superadmins.
--   RLS: only the service-role client can insert or select.
-- ═══════════════════════════════════════════════════════════

-- ── PLATFORM AUDIT LOGS TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID NOT NULL,                      -- superadmin performing the action
  action          TEXT NOT NULL,                      -- e.g. ACTIVATE_RESTAURANT, STAFF_DELETE
  target_type     TEXT,                               -- e.g. 'restaurant', 'staff', 'platform'
  target_id       UUID,                               -- ID of the affected entity (nullable for platform-level)
  metadata        JSONB NOT NULL DEFAULT '{}',        -- extra context (e.g. old/new values)
  ip_address      TEXT,                               -- client IP for forensics
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- immutable timestamp
);

-- ── IMMUTABILITY: Prevent updates and deletes ─────────────────
-- Even the service-role key will be blocked from mutating logs.

CREATE OR REPLACE RULE platform_audit_logs_no_update AS
  ON UPDATE TO platform_audit_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE platform_audit_logs_no_delete AS
  ON DELETE TO platform_audit_logs DO INSTEAD NOTHING;

-- ── RLS ────────────────────────────────────────────────────────
-- Enable RLS. No anon or authenticated-user policies are created.
-- Only the service-role admin client (createAdminClient) can write/read.
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- ── INDEX ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_actor      ON platform_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_target     ON platform_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON platform_audit_logs(created_at DESC);
