CREATE OR REPLACE FUNCTION get_restaurant_by_slug(input_slug text)
RETURNS SETOF restaurants
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM restaurants WHERE slug = input_slug AND is_active = true;
$$;
