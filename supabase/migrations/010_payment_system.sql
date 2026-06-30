-- Payment System V1 Migration

-- 1. Create Enums
CREATE TYPE payment_status_enum AS ENUM ('pending', 'authorized', 'paid', 'failed', 'cancelled', 'expired', 'refunded');
CREATE TYPE payment_method_enum AS ENUM ('razorpay', 'cash', 'pos');

-- 2. Create Sequence for Payment References
CREATE SEQUENCE IF NOT EXISTS payment_ref_seq START 1;

-- 3. Add session_version to sessions
ALTER TABLE sessions ADD COLUMN version INT NOT NULL DEFAULT 1;

-- 4. Update table_status enum
ALTER TYPE table_status ADD VALUE IF NOT EXISTS 'awaiting_payment';

-- 5. Drop old tables and types
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TYPE IF EXISTS payment_method;

-- 6. Create new payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  payment_reference TEXT UNIQUE NOT NULL DEFAULT ('PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('payment_ref_seq')::TEXT, 6, '0')),
  attempt_number INT NOT NULL DEFAULT 1,
  payment_method payment_method_enum NOT NULL,
  gateway TEXT,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  gateway_response JSONB,
  payment_status payment_status_enum NOT NULL DEFAULT 'pending',
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  bill_snapshot JSONB,
  receipt_snapshot JSONB,
  session_version INT NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  recorded_by_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_gateway_order UNIQUE(gateway, gateway_order_id),
  CONSTRAINT unique_gateway_payment UNIQUE(gateway_payment_id)
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Create Webhook Logs Table
CREATE TABLE payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  event_id TEXT,
  event_type TEXT NOT NULL,
  gateway_payment_id TEXT,
  gateway_order_id TEXT,
  payload JSONB NOT NULL,
  signature TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT unique_gateway_event UNIQUE(gateway, event_id)
);

-- 8. Setup RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurant_isolation_payments"
  ON payments FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
    )
  );

ALTER TABLE payment_webhook_logs ENABLE ROW LEVEL SECURITY;
-- Webhooks are inserted by service_role, no read policies needed for now unless admin panel requires them.

-- 9. RPC for Atomic Payment Completion
CREATE OR REPLACE FUNCTION complete_payment_transaction(
  p_payment_id UUID,
  p_expected_version INT,
  p_receipt_snapshot JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_id UUID;
  v_table_id UUID;
BEGIN
  -- Optimistically update the payment
  UPDATE payments
  SET payment_status = 'paid',
      receipt_snapshot = p_receipt_snapshot,
      paid_at = NOW(),
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_payment_id
    AND payment_status = 'pending'
    AND version = p_expected_version
  RETURNING session_id INTO v_session_id;

  IF NOT FOUND THEN
    RETURN FALSE; -- Lock failed or payment not pending/version mismatch
  END IF;

  -- Update session to completed
  UPDATE sessions
  SET status = 'closed',
      closed_at = NOW()
  WHERE id = v_session_id
  RETURNING table_id INTO v_table_id;

  -- Update table to cleaning
  UPDATE restaurant_tables
  SET status = 'cleaning',
      current_session_id = NULL
  WHERE id = v_table_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
