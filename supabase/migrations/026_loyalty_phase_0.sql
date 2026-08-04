-- Phase 0: Stop the bleeding atomic redemption fixes

-- Add available_points, backfill from total_points. Keep total_points for one release as read-only.
ALTER TABLE loyalty_accounts ADD COLUMN available_points NUMERIC(10,2) DEFAULT 0;
UPDATE loyalty_accounts SET available_points = total_points;

-- Atomic redemption RPC function
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_account_id UUID,
  p_redeem_amount NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_available_points NUMERIC;
BEGIN
  UPDATE loyalty_accounts
  SET available_points = available_points - p_redeem_amount
  WHERE id = p_account_id AND available_points >= p_redeem_amount
  RETURNING available_points INTO v_available_points;

  RETURN v_available_points;
END;
$$ LANGUAGE plpgsql;

-- Replace process_payment_transition to include atomic loyalty deduction
CREATE OR REPLACE FUNCTION process_payment_transition(
  p_payment_id UUID,
  p_expected_version INT,
  p_payment_status TEXT,
  p_gateway_status TEXT,
  p_receipt_snapshot JSONB,
  p_receipt_number TEXT,
  p_outbox_aggregate_id UUID,
  p_outbox_event_type TEXT,
  p_outbox_payload JSONB,
  p_loyalty_account_id UUID DEFAULT NULL,
  p_loyalty_points NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
  v_points_deducted NUMERIC;
BEGIN
  -- If this is a capture and loyalty is provided, deduct points first
  IF p_payment_status = 'captured' AND p_loyalty_account_id IS NOT NULL AND p_loyalty_points > 0 THEN
    v_points_deducted := redeem_loyalty_points(p_loyalty_account_id, p_loyalty_points);
    IF v_points_deducted IS NULL THEN
      -- Insufficient points, rollback everything
      RETURN FALSE;
    END IF;
  END IF;

  -- Optimistically update the payment
  UPDATE payments
  SET payment_status = p_payment_status::payment_status_enum,
      gateway_status = p_gateway_status,
      receipt_snapshot = COALESCE(p_receipt_snapshot, receipt_snapshot),
      receipt_number = COALESCE(p_receipt_number, receipt_number),
      paid_at = CASE WHEN p_payment_status = 'captured' THEN NOW() ELSE paid_at END,
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_payment_id
    AND version = p_expected_version;

  IF FOUND THEN
    v_updated := TRUE;
    
    -- Insert outbox event for side-effects
    INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
    VALUES ('CHECKOUT', p_outbox_aggregate_id, p_outbox_event_type, p_outbox_payload);
  ELSE
    -- If optimistic lock failed but points were deducted, rollback the transaction
    IF p_payment_status = 'captured' AND p_loyalty_account_id IS NOT NULL AND p_loyalty_points > 0 THEN
      RAISE EXCEPTION 'Concurrency error on payment transition, rolling back loyalty deduction';
    END IF;
  END IF;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
