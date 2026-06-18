-- Migration: Lightweight Combo Meals Support
-- 1. Make dish_id nullable since order items can be combos.
ALTER TABLE order_items ALTER COLUMN dish_id DROP NOT NULL;

-- 2. Add combo_id to link to the combos table.
ALTER TABLE order_items ADD COLUMN combo_id UUID REFERENCES combos(id) ON DELETE SET NULL;

-- 3. Add item_type to differentiate between dishes and combos.
ALTER TABLE order_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'dish';

-- 4. Add item_name to store snapshot names of ordered items.
ALTER TABLE order_items ADD COLUMN item_name TEXT;

-- 5. Backfill existing order items with their dish names.
UPDATE order_items
SET item_name = (SELECT name FROM dishes WHERE dishes.id = order_items.dish_id)
WHERE item_name IS NULL;

-- 6. Enforce that item_name snapshot is NOT NULL.
ALTER TABLE order_items ALTER COLUMN item_name SET NOT NULL;
