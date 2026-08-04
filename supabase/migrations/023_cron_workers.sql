-- 023_cron_workers.sql
-- Enables pg_cron and pg_net to schedule background tasks through the generic Next.js Worker Runner.

-- Note: Ensure pg_cron and pg_net are enabled in your Supabase project settings.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- The URLs and Secrets below should be configured for your production environment.
-- In a real Supabase deployment, you can use vault.decrypted_secrets or custom postgresql.conf settings.
-- For local development, this demonstrates the intended architecture.

/*
-- Example: Schedule Reservation Expiry to run every minute
SELECT cron.schedule(
    'invoke-reservation-expiry',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://your-production-app.com/api/internal/workers/run',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
        body := '{"worker": "reservation-expiry"}'::jsonb
    )
    $$
);

-- Example: Schedule Reservation Reminders every hour
SELECT cron.schedule(
    'invoke-reservation-reminders',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://your-production-app.com/api/internal/workers/run',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
        body := '{"worker": "reservation-reminders"}'::jsonb
    )
    $$
);

-- Example: Schedule Reservation Cleanup every day at 3 AM
SELECT cron.schedule(
    'invoke-reservation-cleanup',
    '0 3 * * *',
    $$
    SELECT net.http_post(
        url := 'https://your-production-app.com/api/internal/workers/run',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
        body := '{"worker": "reservation-cleanup"}'::jsonb
    )
    $$
);
*/
