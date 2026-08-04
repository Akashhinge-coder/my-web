-- Migration 025: Add restaurant media fields
-- Supports hero banner customization for customer menu

ALTER TABLE public.restaurants 
ADD COLUMN hero_image_url TEXT,
ADD COLUMN hero_focus_x NUMERIC(4,3) NOT NULL DEFAULT 0.5,
ADD COLUMN hero_focus_y NUMERIC(4,3) NOT NULL DEFAULT 0.5,
ADD COLUMN hero_overlay_opacity NUMERIC(3,2) NOT NULL DEFAULT 0.35,
ADD COLUMN hero_enabled BOOLEAN NOT NULL DEFAULT true;

-- Optional: Comments for schema documentation
COMMENT ON COLUMN public.restaurants.hero_image_url IS 'Custom hero banner image for the customer menu';
COMMENT ON COLUMN public.restaurants.hero_focus_x IS 'X coordinate for focal point crop (0.0 to 1.0)';
COMMENT ON COLUMN public.restaurants.hero_focus_y IS 'Y coordinate for focal point crop (0.0 to 1.0)';
COMMENT ON COLUMN public.restaurants.hero_overlay_opacity IS 'Opacity of the dark gradient overlay (0.0 to 1.0)';
COMMENT ON COLUMN public.restaurants.hero_enabled IS 'If false, the hero banner section is hidden completely';
