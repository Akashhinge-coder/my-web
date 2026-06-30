-- ═══════════════════════════════════════════════════════════
--   MENUARA — Payment System V2 Migration (Ultimate Architecture)
-- ═══════════════════════════════════════════════════════════

-- 1. Create Enums for Outbox and Checkouts
CREATE TYPE checkout_state_enum AS ENUM ('ACTIVE', 'PAYMENT_IN_PROGRESS', 'PAYMENT_COMPLETED');
CREATE TYPE outbox_status_enum AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
CREATE TYPE outbox_actor_type_enum AS ENUM ('SYSTEM', 'WEBHOOK', 'CUSTOMER', 'STAFF', 'ADMIN', 'CRON');

-- 2. Drop Checkout Concepts from Sessions
-- The previous 'status' enum for sessions was: ('active', 'billing', 'closed').
-- We will change 'billing' to map to a checkout state, but for sessions it will just be 'active' until 'closed'.
-- To safely alter an enum, we just don't use 'billing' anymore. 
UPDATE sessions SET status = 'active' WHERE status = 'billing';

-- 3. Create Checkouts Table (The New Aggregate)
CREATE TABLE checkouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  state               checkout_state_enum NOT NULL DEFAULT 'ACTIVE',
  active_payment_id   UUID, -- Will reference payments(id) later
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill checkouts for all active/closed sessions
INSERT INTO checkouts (session_id, state)
SELECT id, CASE WHEN status = 'closed' THEN 'PAYMENT_COMPLETED'::checkout_state_enum ELSE 'ACTIVE'::checkout_state_enum END
FROM sessions;

-- 4. Update Payments Table
-- We will drop gateway_response and add new tracking fields
ALTER TABLE payments
  ADD COLUMN bill_snapshot_version INT NOT NULL DEFAULT 1,
  ADD COLUMN bill_hash TEXT,
  ADD COLUMN receipt_number TEXT UNIQUE,
  ADD COLUMN parent_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  ADD COLUMN gateway_status TEXT;

-- We need to populate bill_hash for existing records (if any) or just leave it for new ones.
-- Since the table is new, it's mostly empty.
UPDATE payments SET bill_hash = 'legacy_hash' WHERE bill_snapshot IS NOT NULL;
ALTER TABLE payments ALTER COLUMN bill_hash SET NOT NULL;

-- Remove raw payload from payments to keep it lean
ALTER TABLE payments DROP COLUMN gateway_response;

-- Ensure payment_reference constraints
DELETE FROM payments WHERE amount <= 0;
ALTER TABLE payments ADD CONSTRAINT check_payments_amount CHECK (amount > 0);
ALTER TABLE payments ADD CONSTRAINT check_payments_currency CHECK (currency <> '');
ALTER TABLE payments ADD CONSTRAINT check_payments_ref CHECK (payment_reference <> '');
-- Note: payment_reference already has a UNIQUE constraint from migration 010.

-- Now that payments exist, we can add the FK to checkouts
ALTER TABLE checkouts
  ADD CONSTRAINT fk_checkout_active_payment
  FOREIGN KEY (active_payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- 5. Outbox Events Table
CREATE TABLE outbox_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type    TEXT NOT NULL,
  aggregate_id      UUID NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,
  status            outbox_status_enum NOT NULL DEFAULT 'PENDING',
  attempt_count     INT NOT NULL DEFAULT 0,
  next_retry_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error        TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_outbox_pending ON outbox_events(status, next_retry_at) WHERE status = 'PENDING';

-- 6. Payment Events Table (Event Sourced Audit Trail)
CREATE TABLE payment_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  aggregate_type  TEXT NOT NULL DEFAULT 'PAYMENT',
  aggregate_id    UUID NOT NULL,
  payload         JSONB NOT NULL,
  actor_type      outbox_actor_type_enum NOT NULL DEFAULT 'SYSTEM',
  actor_id        UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_events_payment_id ON payment_events(payment_id);

-- 7. Update Webhook Logs Table
ALTER TABLE payment_webhook_logs
  ADD COLUMN gateway_event_id TEXT,
  ADD COLUMN delivery_attempt INT DEFAULT 1,
  ADD COLUMN processing_duration_ms INT,
  DROP CONSTRAINT IF EXISTS unique_gateway_event;

-- Add a more robust unique constraint
ALTER TABLE payment_webhook_logs ADD CONSTRAINT unique_gateway_webhook_event UNIQUE(gateway, gateway_event_id);

-- 8. Restaurant Configuration
ALTER TABLE restaurants ADD COLUMN payment_timeout_minutes INT NOT NULL DEFAULT 15;

-- 9. Setup Auto-Update Triggers for Checkouts
CREATE TRIGGER trg_checkouts_updated_at
  BEFORE UPDATE ON checkouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. Enable RLS on New Tables
ALTER TABLE checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurant_isolation_checkouts" ON checkouts FOR ALL USING (
  session_id IN (
    SELECT id FROM sessions WHERE restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
    )
  )
);

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
-- Outbox is processed by service_role, no public access

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurant_isolation_payment_events" ON payment_events FOR SELECT USING (
  payment_id IN (
    SELECT id FROM payments WHERE restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
    )
  )
);
