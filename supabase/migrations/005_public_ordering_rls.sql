-- ═══════════════════════════════════════════════════════════
--   MENUARA — Public Ordering Scoped RLS Migration
--   Migration 005 — Session Token Scoped Policies
-- ═══════════════════════════════════════════════════════════

-- Ensure pgcrypto is available in the extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Schema Additions
ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS qr_token UUID DEFAULT gen_random_uuid() NOT NULL;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_token TEXT DEFAULT encode(extensions.gen_random_bytes(32), 'hex') NOT NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours') NOT NULL;

-- 2. Session Token Helper Function
CREATE OR REPLACE FUNCTION public.current_session_token()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT current_setting('request.headers', true)::json->>'x-session-token';
$$;
ALTER FUNCTION public.current_session_token() OWNER TO postgres;

-- 3. Restaurants Public Select Policy
DROP POLICY IF EXISTS "public_select_active_restaurants" ON restaurants;
CREATE POLICY "public_select_active_restaurants"
  ON restaurants FOR SELECT
  USING (is_active = TRUE);

-- 4. Categories Public Select Policy
DROP POLICY IF EXISTS "public_select_active_categories" ON categories;
CREATE POLICY "public_select_active_categories"
  ON categories FOR SELECT
  USING (is_active = TRUE);

-- 5. Dishes Public Select Policy
DROP POLICY IF EXISTS "public_select_available_dishes" ON dishes;
CREATE POLICY "public_select_available_dishes"
  ON dishes FOR SELECT
  USING (is_available = TRUE);

-- 6. Combos Public Select Policy
DROP POLICY IF EXISTS "public_read_active_combos" ON combos;
CREATE POLICY "public_read_active_combos"
  ON combos FOR SELECT
  USING (is_active = TRUE);

-- 7. Coupons Public Select Policy
DROP POLICY IF EXISTS "public_read_active_coupons" ON coupons;
CREATE POLICY "public_read_active_coupons"
  ON coupons FOR SELECT
  USING (is_active = TRUE);

-- 8. Happy Hours Public Select Policy
DROP POLICY IF EXISTS "public_read_active_happy_hours" ON happy_hours;
CREATE POLICY "public_read_active_happy_hours"
  ON happy_hours FOR SELECT
  USING (is_active = TRUE);

-- 9. Sessions Scoped Select Policy (for customers)
DROP POLICY IF EXISTS "customer_select_session" ON sessions;
CREATE POLICY "customer_select_session"
  ON sessions FOR SELECT
  USING (
    session_token = public.current_session_token()
    AND expires_at > NOW()
  );

-- 10. Orders Scoped Policies (for customers)
DROP POLICY IF EXISTS "customer_select_orders" ON orders;
CREATE POLICY "customer_select_orders"
  ON orders FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE session_token = public.current_session_token()
      AND expires_at > NOW()
    )
  );

DROP POLICY IF EXISTS "customer_insert_orders" ON orders;
CREATE POLICY "customer_insert_orders"
  ON orders FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions 
      WHERE session_token = public.current_session_token()
      AND status = 'active'
      AND expires_at > NOW()
    )
    AND restaurant_id = (
      SELECT restaurant_id FROM sessions 
      WHERE session_token = public.current_session_token()
      AND status = 'active'
      AND expires_at > NOW()
    )
  );

-- 11. Order Items Scoped Policies (for customers)
DROP POLICY IF EXISTS "customer_select_order_items" ON order_items;
CREATE POLICY "customer_select_order_items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE session_id IN (
        SELECT id FROM sessions 
        WHERE session_token = public.current_session_token()
        AND expires_at > NOW()
      )
    )
  );

DROP POLICY IF EXISTS "customer_insert_order_items" ON order_items;
CREATE POLICY "customer_insert_order_items"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders 
      WHERE session_id IN (
        SELECT id FROM sessions 
        WHERE session_token = public.current_session_token()
        AND status = 'active'
        AND expires_at > NOW()
      )
    )
  );

-- 12. Restaurant Tables Scoped Select Policy
-- No anonymous UPDATE/INSERT/DELETE is allowed. Anon table occupation is disabled.
-- Customers can only SELECT the table bound to their active session token.
DROP POLICY IF EXISTS "customer_select_table" ON restaurant_tables;
CREATE POLICY "customer_select_table"
  ON restaurant_tables FOR SELECT
  USING (
    id IN (
      SELECT table_id FROM sessions 
      WHERE session_token = public.current_session_token()
      AND expires_at > NOW()
    )
  );

-- 13. Ratings Scoped Insert Policy
DROP POLICY IF EXISTS "public_insert_ratings" ON ratings;
DROP POLICY IF EXISTS "customer_insert_ratings" ON ratings;
CREATE POLICY "customer_insert_ratings"
  ON ratings FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions 
      WHERE session_token = public.current_session_token()
      AND expires_at > NOW()
    )
    AND restaurant_id = (
      SELECT restaurant_id FROM sessions 
      WHERE session_token = public.current_session_token()
      AND expires_at > NOW()
    )
  );
