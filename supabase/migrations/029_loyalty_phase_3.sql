-- Phase 3: Background Workers

-- Add status to loyalty_transactions for tracking pending vs released points
ALTER TABLE loyalty_transactions
  ADD COLUMN status TEXT DEFAULT 'RELEASED' CHECK (status IN ('PENDING', 'RELEASED', 'CANCELLED'));

-- Note: Trigger removed, we will handle it in the RPC directly.

-- RPC to perform the sweep safely in Postgres
CREATE OR REPLACE FUNCTION sweep_pending_loyalty_points()
RETURNS INT AS $$
DECLARE
  v_swept_count INT := 0;
  r RECORD;
BEGIN
  -- For every EARN transaction that is still PENDING and has passed its release time
  FOR r IN
    SELECT t.id, t.account_id, t.points, t.restaurant_id
    FROM loyalty_transactions t
    JOIN loyalty_settings s ON t.restaurant_id = s.restaurant_id
    WHERE t.type = 'EARN'
      AND t.status = 'PENDING'
      AND t.created_at <= (NOW() - (s.pending_points_release_hours || ' hours')::interval)
  LOOP
    -- Update the account
    UPDATE loyalty_accounts
    SET available_points = available_points + r.points,
        pending_points = GREATEST(0, pending_points - r.points)
    WHERE id = r.account_id;

    -- Update the transaction
    UPDATE loyalty_transactions
    SET status = 'RELEASED'
    WHERE id = r.id;

    v_swept_count := v_swept_count + 1;
  END LOOP;

  RETURN v_swept_count;
END;
$$ LANGUAGE plpgsql;

-- Upgrade record_loyalty_transaction to insert PENDING for EARN
CREATE OR REPLACE FUNCTION record_loyalty_transaction(
  p_restaurant_id UUID,
  p_account_id UUID,
  p_type TEXT,
  p_source TEXT,
  p_source_reference TEXT,
  p_points NUMERIC,
  p_order_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_new_available NUMERIC;
  v_new_pending NUMERIC;
  v_new_lifetime_earned NUMERIC;
  v_new_lifetime_redeemed NUMERIC;
  v_transaction_id UUID;
  v_status TEXT := 'RELEASED';
BEGIN
  -- 1. Read current balances and lock the row
  SELECT available_points, pending_points, lifetime_earned, lifetime_redeemed
  INTO v_new_available, v_new_pending, v_new_lifetime_earned, v_new_lifetime_redeemed
  FROM loyalty_accounts
  WHERE id = p_account_id AND restaurant_id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loyalty account not found';
  END IF;

  -- 2. Calculate new balances based on transaction type
  IF p_type = 'EARN' THEN
    -- Earned points go to pending first
    v_new_pending := v_new_pending + p_points;
    v_new_lifetime_earned := v_new_lifetime_earned + p_points;
    v_status := 'PENDING';
  ELSIF p_type = 'REDEEM' THEN
    v_new_available := v_new_available - p_points;
    v_new_lifetime_redeemed := v_new_lifetime_redeemed + p_points;
  ELSIF p_type = 'MANUAL_ADD' THEN
    v_new_available := v_new_available + p_points;
    v_new_lifetime_earned := v_new_lifetime_earned + p_points;
  ELSIF p_type = 'MANUAL_REMOVE' THEN
    v_new_available := v_new_available - p_points;
  ELSIF p_type = 'REVERSAL' OR p_type = 'ORDER_CANCELLED' THEN
    v_new_available := v_new_available + p_points;
  END IF;

  IF v_new_available < 0 THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- 3. Update the account
  UPDATE loyalty_accounts
  SET available_points = v_new_available,
      pending_points = v_new_pending,
      lifetime_earned = v_new_lifetime_earned,
      lifetime_redeemed = v_new_lifetime_redeemed,
      last_visited = NOW()
  WHERE id = p_account_id;

  -- 4. Insert the transaction
  INSERT INTO loyalty_transactions (
    restaurant_id, account_id, order_id, type, source, source_reference,
    points, balance_after, earned_at, expires_at, reason, staff_id, status
  ) VALUES (
    p_restaurant_id, p_account_id, p_order_id, p_type, p_source, p_source_reference,
    p_points, v_new_available, NOW(), p_expires_at, p_reason, p_staff_id, v_status
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'available_points', v_new_available,
    'pending_points', v_new_pending
  );
END;
$$ LANGUAGE plpgsql;
