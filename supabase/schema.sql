-- ═══════════════════════════════════════════════════════════
--   MENUARA — Complete Database Schema
--   Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── RESTAURANTS ─────────────────────────────────────────────
CREATE TABLE restaurants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  gst_number    TEXT,
  address       TEXT,
  phone         TEXT NOT NULL,
  logo_url      TEXT,
  language      TEXT NOT NULL DEFAULT 'en',
  cgst_rate     NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  sgst_rate     NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  currency      TEXT NOT NULL DEFAULT 'INR',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── STAFF ────────────────────────────────────────────────────
CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'waiter', 'kitchen', 'superadmin');

CREATE TABLE staff (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  role            staff_role NOT NULL DEFAULT 'waiter',
  phone           TEXT,
  shift_start     TIME,
  shift_end       TIME,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLES ──────────────────────────────────────────────────
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');
CREATE TYPE table_type   AS ENUM ('regular', 'booth', 'outdoor', 'private');

CREATE TABLE restaurant_tables (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number        TEXT NOT NULL,
  seating_capacity    INT NOT NULL DEFAULT 4,
  table_type          table_type NOT NULL DEFAULT 'regular',
  status              table_status NOT NULL DEFAULT 'available',
  assigned_waiter_id  UUID REFERENCES staff(id) ON DELETE SET NULL,
  current_session_id  UUID,
  qr_url              TEXT,
  floor               TEXT DEFAULT 'Ground Floor',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

-- ── SESSIONS ─────────────────────────────────────────────────
CREATE TYPE session_status AS ENUM ('active', 'billing', 'closed');

CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id        UUID NOT NULL REFERENCES restaurant_tables(id),
  guest_count     INT NOT NULL DEFAULT 1,
  status          session_status NOT NULL DEFAULT 'active',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Add FK back to sessions
ALTER TABLE restaurant_tables
  ADD CONSTRAINT fk_current_session
  FOREIGN KEY (current_session_id) REFERENCES sessions(id) ON DELETE SET NULL;

-- ── CATEGORIES ───────────────────────────────────────────────
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_hindi      TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── DISHES ───────────────────────────────────────────────────
CREATE TYPE food_type AS ENUM ('veg', 'non_veg', 'vegan', 'jain');
CREATE TYPE dish_size AS ENUM ('S', 'M', 'L');

CREATE TABLE dishes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id         UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  name_hindi          TEXT,
  description         TEXT,
  description_hindi   TEXT,
  price               NUMERIC(10,2) NOT NULL,
  image_url           TEXT,
  food_type           food_type NOT NULL DEFAULT 'veg',
  spice_level         INT NOT NULL DEFAULT 2 CHECK (spice_level BETWEEN 0 AND 5),
  is_available        BOOLEAN NOT NULL DEFAULT TRUE,
  is_special          BOOLEAN NOT NULL DEFAULT FALSE,
  allergy_tags        TEXT[] NOT NULL DEFAULT '{}',
  dish_size           dish_size NOT NULL DEFAULT 'M',
  ar_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DISH AR ASSETS ───────────────────────────────────────────
CREATE TABLE dish_ar_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dish_id         UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE UNIQUE,
  angle_front     TEXT,
  angle_back      TEXT,
  angle_left      TEXT,
  angle_right     TEXT,
  angle_top       TEXT,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COMBOS ───────────────────────────────────────────────────
CREATE TABLE combos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  combo_price     NUMERIC(10,2) NOT NULL,
  dish_ids        UUID[] NOT NULL DEFAULT '{}',
  savings_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── ORDERS ───────────────────────────────────────────────────
CREATE TYPE order_status AS ENUM ('pending', 'cooking', 'served', 'cancelled');
CREATE TYPE order_source AS ENUM ('table', 'zomato', 'swiggy');

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL,
  status          order_status NOT NULL DEFAULT 'pending',
  source          order_source NOT NULL DEFAULT 'table',
  confirmed_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  loyalty_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  happy_hour_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxable_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  cgst            NUMERIC(10,2) NOT NULL DEFAULT 0,
  sgst            NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst             NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_discount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  grand_total     NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ORDER ITEMS ───────────────────────────────────────────────
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id         UUID NOT NULL REFERENCES dishes(id),
  quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL,
  total_price     NUMERIC(10,2) NOT NULL,
  notes           TEXT,
  status          order_status NOT NULL DEFAULT 'pending'
);

-- ── PAYMENTS ─────────────────────────────────────────────────
CREATE TYPE payment_method AS ENUM ('upi', 'gpay', 'phonepe', 'paytm', 'cash', 'card');

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  restaurant_id     UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  method            payment_method NOT NULL,
  amount_paid       NUMERIC(10,2) NOT NULL,
  amount_due        NUMERIC(10,2) NOT NULL,
  change_returned   NUMERIC(10,2) NOT NULL DEFAULT 0,
  cgst              NUMERIC(10,2) NOT NULL DEFAULT 0,
  sgst              NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_id         UUID,
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  confirmed_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  razorpay_id       TEXT,
  confirmed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INVOICES ─────────────────────────────────────────────────
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id        UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  restaurant_id     UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  invoice_number    TEXT NOT NULL UNIQUE,
  pdf_url           TEXT,
  subtotal          NUMERIC(10,2) NOT NULL,
  cgst              NUMERIC(10,2) NOT NULL,
  sgst              NUMERIC(10,2) NOT NULL,
  discount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total             NUMERIC(10,2) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COUPONS ──────────────────────────────────────────────────
CREATE TYPE coupon_type AS ENUM ('flat', 'percent');

CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  type            coupon_type NOT NULL,
  value           NUMERIC(10,2) NOT NULL,
  min_order       NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount    NUMERIC(10,2),
  max_uses        INT,
  used_count      INT NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(restaurant_id, code)
);

-- ── LOYALTY ──────────────────────────────────────────────────
CREATE TABLE loyalty_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL,
  name            TEXT,
  total_points    INT NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  visit_count     INT NOT NULL DEFAULT 0,
  last_visited    TIMESTAMPTZ,
  UNIQUE(restaurant_id, phone)
);

-- ── RESERVATIONS ─────────────────────────────────────────────
CREATE TYPE reservation_status AS ENUM ('confirmed', 'seated', 'cancelled', 'no_show');

CREATE TABLE reservations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id        UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  guest_name      TEXT NOT NULL,
  guest_phone     TEXT NOT NULL,
  party_size      INT NOT NULL,
  reserved_at     TIMESTAMPTZ NOT NULL,
  notes           TEXT,
  status          reservation_status NOT NULL DEFAULT 'confirmed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── WAITLIST ─────────────────────────────────────────────────
CREATE TYPE waitlist_status AS ENUM ('waiting', 'notified', 'seated', 'left');

CREATE TABLE waitlist (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  guest_name      TEXT NOT NULL,
  guest_phone     TEXT NOT NULL,
  party_size      INT NOT NULL,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at     TIMESTAMPTZ,
  status          waitlist_status NOT NULL DEFAULT 'waiting'
);

-- ── INVENTORY ────────────────────────────────────────────────
CREATE TABLE inventory (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ingredient_name     TEXT NOT NULL,
  unit                TEXT NOT NULL DEFAULT 'kg',
  current_qty         NUMERIC(10,3) NOT NULL DEFAULT 0,
  low_stock_alert     NUMERIC(10,3) NOT NULL DEFAULT 1,
  supplier_id         UUID,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SUPPLIERS ────────────────────────────────────────────────
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory
  ADD CONSTRAINT fk_supplier
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- ── HAPPY HOURS ───────────────────────────────────────────────
CREATE TABLE happy_hours (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  discount_type     coupon_type NOT NULL DEFAULT 'percent',
  discount_value    NUMERIC(5,2) NOT NULL,
  days              TEXT[] NOT NULL DEFAULT '{}',
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  category_ids      UUID[] NOT NULL DEFAULT '{}',
  item_ids          UUID[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── RATINGS ──────────────────────────────────────────────────
CREATE TABLE ratings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  dish_id         UUID REFERENCES dishes(id) ON DELETE SET NULL,
  overall_score   INT NOT NULL CHECK (overall_score BETWEEN 1 AND 5),
  food_score      INT NOT NULL CHECK (food_score BETWEEN 1 AND 5),
  service_score   INT NOT NULL CHECK (service_score BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
--   INDEXES — for performance
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_orders_session       ON orders(session_id);
CREATE INDEX idx_orders_restaurant    ON orders(restaurant_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_orders_created       ON orders(created_at DESC);
CREATE INDEX idx_order_items_order    ON order_items(order_id);
CREATE INDEX idx_sessions_restaurant  ON sessions(restaurant_id);
CREATE INDEX idx_sessions_table       ON sessions(table_id);
CREATE INDEX idx_sessions_status      ON sessions(status);
CREATE INDEX idx_dishes_restaurant    ON dishes(restaurant_id);
CREATE INDEX idx_dishes_category      ON dishes(category_id);
CREATE INDEX idx_tables_restaurant    ON restaurant_tables(restaurant_id);
CREATE INDEX idx_loyalty_phone        ON loyalty_accounts(restaurant_id, phone);
CREATE INDEX idx_payments_session     ON payments(session_id);
CREATE INDEX idx_ratings_restaurant   ON ratings(restaurant_id);

-- ═══════════════════════════════════════════════════════════
--   ROW LEVEL SECURITY (RLS) — Multi-tenancy enforcement
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE restaurants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff              ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_ar_assets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hours        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings            ENABLE ROW LEVEL SECURITY;

-- Restaurant owner can see/edit their own restaurant
CREATE POLICY "owner_access_restaurant"
  ON restaurants FOR ALL
  USING (owner_id = auth.uid());

-- Staff policies
CREATE POLICY "owner_insert_staff"
  ON staff FOR INSERT
  WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "owner_select_staff"
  ON staff FOR SELECT
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Restaurant tables policies (owner and staff)
CREATE POLICY "owner_insert_tables"
  ON restaurant_tables FOR INSERT
  WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "owner_select_tables"
  ON restaurant_tables FOR SELECT
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "owner_update_tables"
  ON restaurant_tables FOR UPDATE
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

-- Staff can read their own restaurant
CREATE POLICY "staff_read_restaurant"
  ON restaurants FOR SELECT
  USING (
    id IN (
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Restaurant isolation for all tables
CREATE POLICY "restaurant_isolation_dishes"
  ON dishes FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "restaurant_isolation_orders"
  ON orders FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Public read for menus (customers don't need auth to browse)
CREATE POLICY "public_read_categories"
  ON categories FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "public_read_dishes"
  ON dishes FOR SELECT
  USING (is_available = TRUE);

CREATE POLICY "public_read_ar_assets"
  ON dish_ar_assets FOR SELECT
  USING (is_published = TRUE);

-- ═══════════════════════════════════════════════════════════
--   REALTIME — Enable for live sync
-- ═══════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE dishes;

-- ═══════════════════════════════════════════════════════════
--   FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_dishes_updated_at
  BEFORE UPDATE ON dishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Get restaurant by slug (public, used by customer app)
CREATE OR REPLACE FUNCTION get_restaurant_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID, name TEXT, slug TEXT, phone TEXT,
  logo_url TEXT, language TEXT, cgst_rate NUMERIC, sgst_rate NUMERIC
) AS $$
  SELECT id, name, slug, phone, logo_url, language, cgst_rate, sgst_rate
  FROM restaurants
  WHERE slug = p_slug AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
