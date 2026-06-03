-- Drop fk_current_session constraint to resolve PostgREST embedding ambiguity between sessions and restaurant_tables
ALTER TABLE restaurant_tables DROP CONSTRAINT IF EXISTS fk_current_session;
