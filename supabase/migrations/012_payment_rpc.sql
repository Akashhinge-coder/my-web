-- ═══════════════════════════════════════════════════════════
--   MENUARA — Payment RPC Migration for Outbox
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION process_payment_transition(
  p_payment_id UUID,
  p_expected_version INT,
  p_payment_status TEXT,
  p_gateway_status TEXT,
  p_receipt_snapshot JSONB,
  p_receipt_number TEXT,
  p_outbox_aggregate_id UUID,
  p_outbox_event_type TEXT,
  p_outbox_payload JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
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
  END IF;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
