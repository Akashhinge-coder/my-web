-- ═══════════════════════════════════════════════════════════
--   MENUARA — Migration 021: Reservations & Guest Queue (ADR-003)
-- ═══════════════════════════════════════════════════════════

-- 1. Restaurant Settings
ALTER TABLE restaurants
  ADD COLUMN max_reservation_days_in_advance INT NOT NULL DEFAULT 7,
  ADD COLUMN online_reservation_limit_percent INT NOT NULL DEFAULT 70;

-- 2. New Type for Reservation Requests
CREATE TYPE reservation_request_status AS ENUM ('REQUESTED', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- 3. Reservation Requests Table
CREATE TABLE reservation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  phone           TEXT NOT NULL,
  party_size      INT NOT NULL CHECK (party_size > 0),
  requested_time  TIMESTAMPTZ NOT NULL,
  status          reservation_request_status NOT NULL DEFAULT 'REQUESTED',
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reservation_requests_restaurant ON reservation_requests(restaurant_id);
CREATE INDEX idx_reservation_requests_status ON reservation_requests(status);
ALTER TABLE reservation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurant_isolation_reservation_requests"
  ON reservation_requests FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- 4. Update existing Reservations table
-- 4a. Alter the default value first before renaming enum values if it relies on it, but the default is 'confirmed' which we rename to 'CONFIRMED'.
ALTER TABLE reservations ALTER COLUMN status DROP DEFAULT;

ALTER TYPE reservation_status RENAME VALUE 'confirmed' TO 'CONFIRMED';
ALTER TYPE reservation_status RENAME VALUE 'seated' TO 'SEATED';
ALTER TYPE reservation_status RENAME VALUE 'cancelled' TO 'CANCELLED';
ALTER TYPE reservation_status RENAME VALUE 'no_show' TO 'NO_SHOW';
ALTER TYPE reservation_status ADD VALUE 'COMPLETED';

ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'CONFIRMED'::reservation_status;

-- 4b. Update columns
ALTER TABLE reservations
  ADD COLUMN reservation_request_id UUID REFERENCES reservation_requests(id) ON DELETE SET NULL,
  ADD COLUMN version INT NOT NULL DEFAULT 1;

-- 5. Update Waitlist table
ALTER TABLE waitlist
  ADD COLUMN quoted_wait_minutes INT;

-- 6. Add real-time publication for live feeds
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE reservation_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;
