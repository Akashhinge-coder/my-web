-- Phase 1: Ledger + Config Foundation

-- loyalty_settings: dynamic restaurant configuration
CREATE TABLE loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  earn_enabled BOOLEAN DEFAULT TRUE,
  redeem_enabled BOOLEAN DEFAULT TRUE,
  base_points_per_hundred NUMERIC(6,2) DEFAULT 10,
  minimum_points_to_redeem NUMERIC(10,2) DEFAULT 0,
  redemption_rate NUMERIC(10,4) DEFAULT 0.10, -- ₹ per point
  max_redemption_percent NUMERIC(5,2) DEFAULT 20,
  pending_points_release_hours INT DEFAULT 24,
  point_expiry_days INT DEFAULT 365,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id)
);

-- loyalty_transactions: the immutable ledger
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  account_id UUID NOT NULL REFERENCES loyalty_accounts(id),
  order_id UUID REFERENCES orders(id),
  type TEXT NOT NULL CHECK (type IN
    ('EARN','REDEEM','SIGNUP_BONUS','MANUAL_ADD','MANUAL_REMOVE',
     'EXPIRED','REVERSAL','ORDER_CANCELLED')),
  source TEXT NOT NULL CHECK (source IN
    ('ORDER','ADMIN','SYSTEM','PROMOTION','MIGRATION','API')),
  source_reference TEXT, -- ID of the order, promotion, or adjustment request
  points NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  earned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- receipt snapshot, for redemptions
  conversion_rate NUMERIC(10,4),
  rupee_value NUMERIC(10,2),
  pricing_version TEXT,
  restaurant_settings_version TEXT,
  ledger_version INT DEFAULT 1,
  
  -- audit
  reason TEXT,
  staff_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON loyalty_transactions (account_id, created_at);
CREATE INDEX ON loyalty_transactions (order_id);

-- loyalty_accounts: add fields, keep as the cached projection
ALTER TABLE loyalty_accounts
  ADD COLUMN pending_points NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN lifetime_earned NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN lifetime_redeemed NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN last_reconciled_at TIMESTAMPTZ,
  ADD COLUMN status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','BLOCKED'));

-- Note: available_points was already added and backfilled in Phase 0.
-- We keep total_points read-only for one release before dropping.

-- Upgrade redeem_loyalty_points from Phase 0 to write to the ledger
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_account_id UUID,
  p_redeem_amount NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_available_points NUMERIC;
  v_restaurant_id UUID;
BEGIN
  -- We need restaurant_id for the transaction
  SELECT restaurant_id INTO v_restaurant_id FROM loyalty_accounts WHERE id = p_account_id;

  UPDATE loyalty_accounts
  SET available_points = available_points - p_redeem_amount,
      lifetime_redeemed = lifetime_redeemed + p_redeem_amount
  WHERE id = p_account_id AND available_points >= p_redeem_amount
  RETURNING available_points INTO v_available_points;

  IF FOUND THEN
    INSERT INTO loyalty_transactions (
      restaurant_id, account_id, type, source, source_reference,
      points, balance_after, earned_at
    ) VALUES (
      v_restaurant_id, p_account_id, 'REDEEM', 'ORDER', NULL,
      p_redeem_amount, v_available_points, NOW()
    );
  END IF;

  RETURN v_available_points;
END;
$$ LANGUAGE plpgsql;

-- RPC to record a loyalty transaction and update balances atomically
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
  ELSIF p_type = 'REDEEM' THEN
    -- Redemption reduces available (handled by Phase 0 RPC, but if we log it here)
    v_new_available := v_new_available - p_points;
    v_new_lifetime_redeemed := v_new_lifetime_redeemed + p_points;
  ELSIF p_type = 'MANUAL_ADD' THEN
    v_new_available := v_new_available + p_points;
    v_new_lifetime_earned := v_new_lifetime_earned + p_points;
  ELSIF p_type = 'MANUAL_REMOVE' THEN
    v_new_available := v_new_available - p_points;
  ELSIF p_type = 'REVERSAL' OR p_type = 'ORDER_CANCELLED' THEN
    -- If it's a refund of a redemption, we add back to available
    -- If it's a clawback of pending earn, we subtract from pending
    -- The app logic will decide whether to pass positive or negative points, or we handle it based on context.
    -- For simplicity, assume p_points carries the correct sign for available_points if it's a generic add/subtract,
    -- but usually, we just say: if reversing an EARN, we subtract pending. If reversing a REDEEM, we add to available.
    -- To keep it simple, we let the caller pass positive points for additions to available, negative for deductions.
    v_new_available := v_new_available + p_points;
  END IF;

  -- Prevent negative available points
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
    points, balance_after, earned_at, expires_at, reason, staff_id
  ) VALUES (
    p_restaurant_id, p_account_id, p_order_id, p_type, p_source, p_source_reference,
    p_points, v_new_available, NOW(), p_expires_at, p_reason, p_staff_id
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'available_points', v_new_available,
    'pending_points', v_new_pending
  );
END;
$$ LANGUAGE plpgsql;
