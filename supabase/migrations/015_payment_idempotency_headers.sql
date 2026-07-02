-- ═══════════════════════════════════════════════════════════
--   MENUARA — Payment Architecture Idempotency Headers
-- ═══════════════════════════════════════════════════════════

ALTER TABLE payment_idempotency_keys
  ADD COLUMN IF NOT EXISTS response_headers JSONB NOT NULL DEFAULT '{}'::jsonb;
