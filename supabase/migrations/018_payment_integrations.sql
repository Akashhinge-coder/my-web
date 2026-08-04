-- ═══════════════════════════════════════════════════════════
--   MENUARA — Multi-Tenant Payment Integrations
-- ═══════════════════════════════════════════════════════════

CREATE TYPE payment_provider AS ENUM ('razorpay', 'stripe', 'cashfree', 'payu', 'phonepe', 'paypal');
CREATE TYPE integration_mode AS ENUM ('TEST', 'LIVE');
CREATE TYPE integration_status AS ENUM ('PENDING', 'ACTIVE', 'INVALID', 'DISABLED', 'REVOKED', 'EXPIRED');
CREATE TYPE authentication_type AS ENUM ('API_KEYS', 'OAUTH');

CREATE TABLE restaurant_payment_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  provider payment_provider NOT NULL,
  mode integration_mode NOT NULL DEFAULT 'TEST',
  status integration_status NOT NULL DEFAULT 'PENDING',
  authentication_type authentication_type NOT NULL DEFAULT 'API_KEYS',
  
  key_id TEXT,
  encrypted_secret TEXT,
  secret_version INT NOT NULL DEFAULT 1,
  last_rotated_at TIMESTAMPTZ,
  rotated_by UUID REFERENCES auth.users(id),
  
  encrypted_webhook_secret TEXT,
  webhook_url TEXT,
  
  encrypted_refresh_token TEXT,
  provider_account_id TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  UNIQUE(restaurant_id, provider)
);

-- Enable RLS
ALTER TABLE restaurant_payment_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users on their own integrations"
  ON restaurant_payment_integrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.user_id = auth.uid() 
      AND staff.restaurant_id = restaurant_payment_integrations.restaurant_id
    )
  );

CREATE POLICY "Enable update for admins on their own integrations"
  ON restaurant_payment_integrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.user_id = auth.uid() 
      AND staff.restaurant_id = restaurant_payment_integrations.restaurant_id
      AND staff.role IN ('admin', 'manager')
    )
  );


-- ── AUDIT EVENTS ─────────────────────────────────────────────

CREATE TYPE integration_event_type AS ENUM (
  'INTEGRATION_CREATED', 'KEY_ROTATED', 'SECRET_ROTATED', 'WEBHOOK_CHANGED', 
  'DISABLED', 'ENABLED', 'TEST_CONNECTION_SUCCEEDED', 'TEST_CONNECTION_FAILED', 'INTEGRATION_USED'
);

CREATE TABLE integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES restaurant_payment_integrations(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  event_type integration_event_type NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit events are append-only. Only Service Role can insert easily, but we allow staff to read.
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for staff on their own integration events"
  ON integration_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.user_id = auth.uid() 
      AND staff.restaurant_id = integration_events.restaurant_id
    )
  );
