-- ═══════════════════════════════════════════════════════════
--   MENUARA — Migration 022: Reservations Refinements
-- ═══════════════════════════════════════════════════════════

-- 1. Waitlist Priority Enum
CREATE TYPE waitlist_priority_enum AS ENUM ('STANDARD', 'VIP', 'LOYALTY', 'ELDERLY', 'DISABLED', 'STAFF', 'MANUAL_OVERRIDE');

-- 2. Waitlist Enrichment
ALTER TABLE waitlist
  ADD COLUMN arrival_time TIMESTAMPTZ,
  ADD COLUMN priority waitlist_priority_enum NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Restaurant Reservation Policies
ALTER TABLE restaurants
  ADD COLUMN reservation_hold_minutes INT NOT NULL DEFAULT 15,
  ADD COLUMN no_show_grace_minutes INT NOT NULL DEFAULT 15,
  ADD COLUMN allow_walk_ins BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN reservation_buffer_minutes INT NOT NULL DEFAULT 0,
  ADD COLUMN auto_confirm_reservations BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN require_phone_verification BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN minimum_notice_minutes INT NOT NULL DEFAULT 30;

-- 4. Explicit Metadata Columns for Requests and Reservations
ALTER TABLE reservation_requests
  ADD COLUMN occasion TEXT,
  ADD COLUMN preferred_area TEXT,
  ADD COLUMN notes TEXT,
  ADD COLUMN marketing_source TEXT,
  ADD COLUMN device TEXT,
  ADD COLUMN language TEXT,
  ADD COLUMN campaign TEXT,
  ADD COLUMN referrer TEXT,
  ADD COLUMN high_chair BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN wheelchair BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE reservations
  ADD COLUMN occasion TEXT,
  ADD COLUMN preferred_area TEXT,
  -- notes already exists on reservations from 001_initial_schema
  ADD COLUMN marketing_source TEXT,
  ADD COLUMN device TEXT,
  ADD COLUMN language TEXT,
  ADD COLUMN campaign TEXT,
  ADD COLUMN referrer TEXT,
  ADD COLUMN high_chair BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN wheelchair BOOLEAN NOT NULL DEFAULT false;

-- 5. Add ARRIVED to reservation_status
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'ARRIVED';
