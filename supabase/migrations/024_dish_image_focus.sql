-- Migration 024: Add image focal point to dishes table
-- Storing semantic coordinates (0.0 to 1.0) rather than CSS strings
-- defaults to 0.5 (center)

ALTER TABLE public.dishes 
ADD COLUMN image_focus_x NUMERIC(4,3) NOT NULL DEFAULT 0.5;

ALTER TABLE public.dishes 
ADD COLUMN image_focus_y NUMERIC(4,3) NOT NULL DEFAULT 0.5;

-- Optional: Update comment for context
COMMENT ON COLUMN public.dishes.image_focus_x IS 'X coordinate for focal point crop (0.0 to 1.0). Defaults to 0.5 (center)';
COMMENT ON COLUMN public.dishes.image_focus_y IS 'Y coordinate for focal point crop (0.0 to 1.0). Defaults to 0.5 (center)';
