-- Consolidated Migration Script (002, 003, 004)

-- 1. Apply 002_add_coupon_max_discount.sql
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10,2);

-- 2. Apply 003_add_happy_hour_scopes.sql
ALTER TABLE happy_hours
  ADD COLUMN IF NOT EXISTS category_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS item_ids UUID[] NOT NULL DEFAULT '{}';

-- 3. Apply 004_add_order_pricing_breakdown.sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS happy_hour_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill existing orders where subtotal and grand_total are zero
UPDATE orders
SET
  subtotal = total,
  taxable_amount = total,
  grand_total = total
WHERE subtotal = 0 AND grand_total = 0;
