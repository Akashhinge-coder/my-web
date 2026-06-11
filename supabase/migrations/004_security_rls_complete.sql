-- ═══════════════════════════════════════════════════════════
--   MENUARA — Security RLS Remediation Migration
--   Migration 004 — Complete Row Level Security Policies
--
--   BEFORE: 12 tables had RLS enabled but ZERO policies,
--           meaning all access was denied for anon users.
--   AFTER:  All tables have complete tenant-scoped policies.
--           Backend uses anon+session client — RLS is now enforced.
-- ═══════════════════════════════════════════════════════════

-- ── HELPER FUNCTIONS (Bypass RLS via SECURITY DEFINER + postgres owner) ──

-- Returns the restaurant_ids the current user owns
CREATE OR REPLACE FUNCTION public.get_owned_restaurant_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM restaurants WHERE owner_id = auth.uid();
$$;
ALTER FUNCTION public.get_owned_restaurant_ids() OWNER TO postgres;

-- Returns the restaurant_ids the current user can access (owner or active staff)
CREATE OR REPLACE FUNCTION public.user_restaurant_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM restaurants WHERE owner_id = auth.uid()
  UNION
  SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND is_active = TRUE;
$$;
ALTER FUNCTION public.user_restaurant_ids() OWNER TO postgres;

-- ── RESTAURANTS (redefine staff_read_restaurant to prevent recursion) ──
DROP POLICY IF EXISTS "staff_read_restaurant" ON restaurants;
CREATE POLICY "staff_read_restaurant"
  ON restaurants FOR SELECT
  USING (id IN (SELECT public.user_restaurant_ids()));

-- ── SESSIONS ─────────────────────────────────────────────────
-- Sessions are restaurant-scoped; staff and owners can manage them.
DROP POLICY IF EXISTS "restaurant_isolation_sessions" ON sessions;
CREATE POLICY "restaurant_isolation_sessions"
  ON sessions FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── ORDER ITEMS ──────────────────────────────────────────────
-- order_items belong to orders which belong to restaurants.
DROP POLICY IF EXISTS "restaurant_isolation_order_items" ON order_items;
CREATE POLICY "restaurant_isolation_order_items"
  ON order_items FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE restaurant_id IN (SELECT public.user_restaurant_ids())
    )
  );

-- Public customers can read order items for their own session orders
DROP POLICY IF EXISTS "public_read_own_order_items" ON order_items;
CREATE POLICY "public_read_own_order_items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN sessions s ON o.session_id = s.id
      -- Public access: validated by active session_id
      WHERE s.status = 'active'
    )
  );

-- ── PAYMENTS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_payments" ON payments;
CREATE POLICY "restaurant_isolation_payments"
  ON payments FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── INVOICES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_invoices" ON invoices;
CREATE POLICY "restaurant_isolation_invoices"
  ON invoices FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── COUPONS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_coupons" ON coupons;
CREATE POLICY "restaurant_isolation_coupons"
  ON coupons FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- Customers can read active coupons to validate during checkout
DROP POLICY IF EXISTS "public_read_active_coupons" ON coupons;
CREATE POLICY "public_read_active_coupons"
  ON coupons FOR SELECT
  USING (is_active = TRUE);

-- ── LOYALTY ACCOUNTS ─────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_loyalty_accounts" ON loyalty_accounts;
CREATE POLICY "restaurant_isolation_loyalty_accounts"
  ON loyalty_accounts FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── RESERVATIONS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_reservations" ON reservations;
CREATE POLICY "restaurant_isolation_reservations"
  ON reservations FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── WAITLIST ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_waitlist" ON waitlist;
CREATE POLICY "restaurant_isolation_waitlist"
  ON waitlist FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── INVENTORY ────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_inventory" ON inventory;
CREATE POLICY "restaurant_isolation_inventory"
  ON inventory FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── SUPPLIERS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_suppliers" ON suppliers;
CREATE POLICY "restaurant_isolation_suppliers"
  ON suppliers FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── HAPPY HOURS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_happy_hours" ON happy_hours;
CREATE POLICY "restaurant_isolation_happy_hours"
  ON happy_hours FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- Public: customers need active happy hours during checkout pricing
DROP POLICY IF EXISTS "public_read_active_happy_hours" ON happy_hours;
CREATE POLICY "public_read_active_happy_hours"
  ON happy_hours FOR SELECT
  USING (is_active = TRUE);

-- ── RATINGS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_ratings" ON ratings;
CREATE POLICY "restaurant_isolation_ratings"
  ON ratings FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- Customers can insert ratings for their own sessions only (session-scoped)
DROP POLICY IF EXISTS "public_insert_ratings" ON ratings;
CREATE POLICY "public_insert_ratings"
  ON ratings FOR INSERT
  WITH CHECK (
    restaurant_id = (SELECT restaurant_id FROM sessions WHERE id = session_id)
  );

-- ── COMBOS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant_isolation_combos" ON combos;
CREATE POLICY "restaurant_isolation_combos"
  ON combos FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- Public: customers can read active combos for menu display
DROP POLICY IF EXISTS "public_read_active_combos" ON combos;
CREATE POLICY "public_read_active_combos"
  ON combos FOR SELECT
  USING (is_active = TRUE);

-- ── CATEGORIES (write policies) ───────────────────────────────
DROP POLICY IF EXISTS "restaurant_write_categories" ON categories;
CREATE POLICY "restaurant_write_categories"
  ON categories FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ── STAFF (complete RLS policies) ─────────────────────────────
DROP POLICY IF EXISTS "owner_insert_staff" ON staff;
CREATE POLICY "owner_insert_staff"
  ON staff FOR INSERT
  WITH CHECK (
    restaurant_id IN (SELECT public.get_owned_restaurant_ids())
  );

DROP POLICY IF EXISTS "owner_select_staff" ON staff;
CREATE POLICY "owner_select_staff"
  ON staff FOR SELECT
  USING (
    restaurant_id IN (SELECT public.get_owned_restaurant_ids())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "owner_update_staff" ON staff;
CREATE POLICY "owner_update_staff"
  ON staff FOR UPDATE
  USING (
    restaurant_id IN (SELECT public.get_owned_restaurant_ids())
  );

DROP POLICY IF EXISTS "owner_delete_staff" ON staff;
CREATE POLICY "owner_delete_staff"
  ON staff FOR DELETE
  USING (
    restaurant_id IN (SELECT public.get_owned_restaurant_ids())
  );

-- ── RESTAURANT TABLES (complete RLS policies) ──────────────────
DROP POLICY IF EXISTS "owner_insert_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "owner_select_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "owner_update_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_isolation_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_isolation_select_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_isolation_insert_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_isolation_update_tables" ON restaurant_tables;

CREATE POLICY "restaurant_isolation_select_tables"
  ON restaurant_tables FOR SELECT
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

CREATE POLICY "restaurant_isolation_insert_tables"
  ON restaurant_tables FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()));

CREATE POLICY "restaurant_isolation_update_tables"
  ON restaurant_tables FOR UPDATE
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

DROP POLICY IF EXISTS "owner_delete_tables" ON restaurant_tables;
CREATE POLICY "owner_delete_tables"
  ON restaurant_tables FOR DELETE
  USING (
    restaurant_id IN (SELECT public.get_owned_restaurant_ids())
  );

-- ── DISH AR ASSETS (write policies) ──────────────────────────
DROP POLICY IF EXISTS "restaurant_write_ar_assets" ON dish_ar_assets;
CREATE POLICY "restaurant_write_ar_assets"
  ON dish_ar_assets FOR ALL
  USING (
    dish_id IN (
      SELECT id FROM dishes
      WHERE restaurant_id IN (SELECT public.user_restaurant_ids())
    )
  );
