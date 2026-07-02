-- ═══════════════════════════════════════════════════════════
--   MENUARA — Payment Observability Views (Phase 4)
-- ═══════════════════════════════════════════════════════════

-- 1. PAYMENT HEALTH KPIs
-- Aggregates success rates, failed counts, and manual payment ratios over the last 24 hours
CREATE OR REPLACE VIEW vw_payment_health_kpis AS
WITH recent_payments AS (
    SELECT 
        id, 
        payment_status, 
        payment_method, 
        created_at, 
        EXTRACT(EPOCH FROM (COALESCE(expires_at, NOW()) - created_at)) as duration_seconds
    FROM payments 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    COUNT(*) as total_payments_24h,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as successful_payments,
    COUNT(*) FILTER (WHERE payment_status = 'failed') as failed_payments,
    COUNT(*) FILTER (WHERE payment_status = 'expired') as expired_payments,
    COUNT(*) FILTER (WHERE payment_status = 'cancelled') as cancelled_payments,
    COUNT(*) FILTER (WHERE payment_method IN ('cash', 'pos')) as manual_payments,
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE payment_status = 'paid')::numeric / COUNT(*)) * 100, 2)
        ELSE 0 
    END as success_rate_percent,
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE payment_method IN ('cash', 'pos'))::numeric / COUNT(*)) * 100, 2)
        ELSE 0 
    END as manual_payment_percent,
    ROUND(AVG(duration_seconds) FILTER (WHERE payment_status = 'paid')::numeric, 2) as avg_completion_time_seconds
FROM recent_payments;

-- 2. WEBHOOK HEALTH KPIs
-- Aggregates webhook success, failures, and duplicates from payment_events
CREATE OR REPLACE VIEW vw_webhook_health_kpis AS
WITH webhook_events AS (
    SELECT 
        id, 
        event_type, 
        created_at,
        payload->>'status' as hook_status
    FROM payment_events 
    WHERE actor_type = 'WEBHOOK' AND created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    COUNT(*) as total_webhooks_24h,
    COUNT(*) FILTER (WHERE hook_status = 'success' OR event_type = 'PAYMENT_CAPTURED') as successful_webhooks,
    COUNT(*) FILTER (WHERE hook_status = 'failed' OR event_type = 'WEBHOOK_FAILED') as failed_webhooks,
    COUNT(*) FILTER (WHERE event_type = 'WEBHOOK_DUPLICATE_IGNORED') as duplicate_deliveries,
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE hook_status = 'success' OR event_type = 'PAYMENT_CAPTURED')::numeric / COUNT(*)) * 100, 2)
        ELSE 0 
    END as success_rate_percent
FROM webhook_events;

-- 3. OUTBOX HEALTH KPIs
-- Tracks pending backlog, DLQ size, and replay counts
CREATE OR REPLACE VIEW vw_outbox_health_kpis AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_events,
    COUNT(*) FILTER (WHERE status = 'PROCESSED') as processed_events_24h,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_events,
    COUNT(*) FILTER (WHERE status = 'DEAD') as dlq_size,
    SUM(replay_attempt) as total_replay_counts
FROM outbox_events;

-- 4. RECONCILIATION KPIs
-- Tracks automated recovery effectiveness
CREATE OR REPLACE VIEW vw_reconciliation_kpis AS
WITH recon_events AS (
    SELECT * FROM payment_events 
    WHERE actor_type = 'CRON' AND created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    COUNT(*) as total_reconciliation_runs,
    COUNT(*) FILTER (WHERE event_type = 'PAYMENT_RECOVERED') as payments_recovered,
    COUNT(*) FILTER (WHERE event_type = 'MANUAL_INTERVENTION_REQUIRED') as manual_intervention_required
FROM recon_events;

-- 5. GATEWAY KPIs
-- Infers gateway health from idempotency locks and failed attempts
CREATE OR REPLACE VIEW vw_gateway_kpis AS
SELECT 
    COUNT(*) FILTER (WHERE response_status >= 500) as gateway_errors,
    COUNT(*) FILTER (WHERE response_status = 408) as gateway_timeouts
FROM payment_idempotency_keys
WHERE created_at >= NOW() - INTERVAL '24 hours';
