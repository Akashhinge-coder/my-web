-- ═══════════════════════════════════════════════════════════
--   MENUARA — Enterprise Payment Final Refinements
-- ═══════════════════════════════════════════════════════════

-- 1. Secret Rotation Grace Period & Future-Proofing
ALTER TABLE restaurant_payment_integrations
ADD COLUMN IF NOT EXISTS previous_encrypted_secret TEXT,
ADD COLUMN IF NOT EXISTS previous_encrypted_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS previous_secret_version INT,
ADD COLUMN IF NOT EXISTS previous_valid_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS key_provider TEXT NOT NULL DEFAULT 'LOCAL';

-- 2. Audit Event Types
ALTER TYPE integration_event_type ADD VALUE IF NOT EXISTS 'SECRET_ROTATION_STARTED';
ALTER TYPE integration_event_type ADD VALUE IF NOT EXISTS 'SECRET_ROTATION_COMPLETED';

-- 3. Webhook Replay Protection
DROP TABLE IF EXISTS payment_webhook_logs CASCADE;

CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  gateway_event_id TEXT NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, gateway_event_id)
);

-- Enable RLS on webhook logs (Service Role only needs to write)
ALTER TABLE payment_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role full access on webhook logs"
  ON payment_webhook_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
