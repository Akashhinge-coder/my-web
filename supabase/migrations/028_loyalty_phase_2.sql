-- Phase 2: Cross-System Safety Rules (Earning & Locking)

-- Replace process_payment_transition to include atomic loyalty Earning
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
  p_loyalty_points NUMERIC DEFAULT NULL,
  p_loyalty_earn_points NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
  v_points_deducted NUMERIC;
  v_restaurant_id UUID;
  v_session_id UUID;
BEGIN
  -- 1. Fetch restaurant_id and session_id from the payment
  SELECT restaurant_id, session_id INTO v_restaurant_id, v_session_id
  FROM payments
  WHERE id = p_payment_id AND version = p_expected_version;

  -- 2. If this is a capture, process loyalty transactions
  IF p_payment_status = 'captured' AND p_loyalty_account_id IS NOT NULL THEN
    
    -- Deduct points if redeeming
    IF p_loyalty_points > 0 THEN
      v_points_deducted := redeem_loyalty_points(p_loyalty_account_id, p_loyalty_points);
      IF v_points_deducted IS NULL THEN
        -- Insufficient points, rollback everything
        RETURN FALSE;
      END IF;
    END IF;

    -- Earn points if earning
    IF p_loyalty_earn_points > 0 THEN
      -- Use record_loyalty_transaction to record the earn
      PERFORM record_loyalty_transaction(
        v_restaurant_id,
        p_loyalty_account_id,
        'EARN',
        'ORDER',
        v_session_id::TEXT, -- Using session_id as the source_reference
        p_loyalty_earn_points,
        NULL,
        NULL,
        'Earned from payment ' || p_payment_id
      );
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
    -- If optimistic lock failed but points were deducted/earned, rollback the transaction
    IF p_payment_status = 'captured' AND p_loyalty_account_id IS NOT NULL THEN
      RAISE EXCEPTION 'Concurrency error on payment transition, rolling back loyalty deduction/earn';
    END IF;
  END IF;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
