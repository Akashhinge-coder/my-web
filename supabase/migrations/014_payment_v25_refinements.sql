-- ═══════════════════════════════════════════════════════════
--   MENUARA — Payment Architecture V2.5 Refinements
-- ═══════════════════════════════════════════════════════════

-- 1. Dead Letter Queue states and tracking
ALTER TYPE outbox_status_enum ADD VALUE IF NOT EXISTS 'DEAD';

ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS error_details JSONB,
  ADD COLUMN IF NOT EXISTS replayed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replayed_by UUID,
  ADD COLUMN IF NOT EXISTS replay_attempt INT NOT NULL DEFAULT 0;

-- 2. Event Versioning
ALTER TABLE payment_events
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1;

-- 3. Payment Reconciliation fields
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS reconciliation_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reconciliation_at TIMESTAMPTZ;

-- 4. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS payment_idempotency_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashed_key          TEXT NOT NULL UNIQUE,
  response_status     INT NOT NULL,
  response_body       JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL
);

-- Auto-cleanup for idempotency keys can be handled by a cron later, but an index helps
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON payment_idempotency_keys(expires_at);

-- 5. Enable RLS on idempotency keys (System only, no public access)
ALTER TABLE payment_idempotency_keys ENABLE ROW LEVEL SECURITY;
