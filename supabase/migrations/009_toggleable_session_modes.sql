-- 009_toggleable_session_modes.sql

-- 1. Create Enums
CREATE TYPE session_mode_enum AS ENUM ('open', 'host_approval');
CREATE TYPE participant_role_enum AS ENUM ('host', 'guest', 'staff');
CREATE TYPE participant_status_enum AS ENUM ('pending', 'approved', 'denied', 'removed');

-- 2. Modify Restaurants
ALTER TABLE restaurants
ADD COLUMN session_mode session_mode_enum NOT NULL DEFAULT 'open';

-- 3. Create Session Participants Table
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_token UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    role participant_role_enum NOT NULL,
    status participant_status_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    
    CONSTRAINT unique_session_participant UNIQUE(session_id, participant_token)
);

-- Performance Indexes for session_participants
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_token ON session_participants(participant_token);

-- 4. Modify Sessions Table
ALTER TABLE sessions 
ADD COLUMN host_participant_id UUID REFERENCES session_participants(id) ON DELETE SET NULL,
ADD COLUMN session_mode_snapshot session_mode_enum DEFAULT 'open';

-- 5. Modify Orders Table
ALTER TABLE orders 
ADD COLUMN placed_by_name TEXT,
ADD COLUMN placed_by_participant_id UUID REFERENCES session_participants(id) ON DELETE SET NULL;

-- Backfill existing orders so we can apply NOT NULL
UPDATE orders SET placed_by_name = 'Guest' WHERE placed_by_name IS NULL;

-- Enforce NOT NULL on placed_by_name
ALTER TABLE orders ALTER COLUMN placed_by_name SET NOT NULL;

-- Index for orders by participant
CREATE INDEX idx_orders_placed_by_participant ON orders(placed_by_participant_id);
