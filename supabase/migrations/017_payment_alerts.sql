-- ═══════════════════════════════════════════════════════════
--   MENUARA — Payment Alerts System (Phase 4)
-- ═══════════════════════════════════════════════════════════

CREATE TYPE alert_severity_enum AS ENUM ('CRITICAL', 'WARNING', 'INFO');
CREATE TYPE alert_status_enum AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity alert_severity_enum NOT NULL,
    alert_name TEXT NOT NULL,
    description TEXT NOT NULL,
    status alert_status_enum NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    UNIQUE(alert_name, status) -- Prevent duplicate active alerts for the same condition
);

-- Function to evaluate alert thresholds
CREATE OR REPLACE FUNCTION fn_evaluate_payment_alerts()
RETURNS void AS $$
DECLARE
    v_dlq_size INT;
    v_stalled_outbox INT;
    v_webhook_failure_rate NUMERIC;
    v_pending_payments_stuck INT;
BEGIN
    -- 1. CRITICAL: DLQ > 0
    SELECT COUNT(*) INTO v_dlq_size FROM outbox_events WHERE status = 'DEAD';
    IF v_dlq_size > 0 THEN
        INSERT INTO system_alerts (severity, alert_name, description, metadata)
        VALUES ('CRITICAL', 'DLQ_NOT_EMPTY', 'Dead Letter Queue has ' || v_dlq_size || ' events requiring manual intervention.', jsonb_build_object('count', v_dlq_size))
        ON CONFLICT (alert_name, status) DO UPDATE SET metadata = jsonb_build_object('count', v_dlq_size);
    ELSE
        UPDATE system_alerts SET status = 'RESOLVED', resolved_at = NOW() WHERE alert_name = 'DLQ_NOT_EMPTY' AND status != 'RESOLVED';
    END IF;

    -- 2. CRITICAL: Outbox Stalled (Events older than 5 mins still PENDING)
    SELECT COUNT(*) INTO v_stalled_outbox FROM outbox_events WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '5 minutes';
    IF v_stalled_outbox > 0 THEN
        INSERT INTO system_alerts (severity, alert_name, description, metadata)
        VALUES ('CRITICAL', 'OUTBOX_STALLED', 'There are ' || v_stalled_outbox || ' stalled outbox events.', jsonb_build_object('count', v_stalled_outbox))
        ON CONFLICT (alert_name, status) DO NOTHING;
    ELSE
        UPDATE system_alerts SET status = 'RESOLVED', resolved_at = NOW() WHERE alert_name = 'OUTBOX_STALLED' AND status != 'RESOLVED';
    END IF;

    -- 3. CRITICAL: Webhook failures > 20%
    SELECT success_rate_percent INTO v_webhook_failure_rate FROM vw_webhook_health_kpis;
    IF v_webhook_failure_rate < 80 AND v_webhook_failure_rate > 0 THEN -- Meaning >20% failure
        INSERT INTO system_alerts (severity, alert_name, description, metadata)
        VALUES ('CRITICAL', 'WEBHOOK_FAILURES_SPIKE', 'Webhook success rate dropped to ' || v_webhook_failure_rate || '%.', jsonb_build_object('success_rate', v_webhook_failure_rate))
        ON CONFLICT (alert_name, status) DO UPDATE SET metadata = jsonb_build_object('success_rate', v_webhook_failure_rate);
    ELSE
        UPDATE system_alerts SET status = 'RESOLVED', resolved_at = NOW() WHERE alert_name = 'WEBHOOK_FAILURES_SPIKE' AND status != 'RESOLVED';
    END IF;

    -- 4. WARNING: Pending Payments Stalled (Older than 15 mins)
    SELECT COUNT(*) INTO v_pending_payments_stuck FROM payments WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '15 minutes';
    IF v_pending_payments_stuck > 5 THEN
        INSERT INTO system_alerts (severity, alert_name, description, metadata)
        VALUES ('WARNING', 'PENDING_PAYMENTS_STALLED', 'There are ' || v_pending_payments_stuck || ' stalled pending payments.', jsonb_build_object('count', v_pending_payments_stuck))
        ON CONFLICT (alert_name, status) DO UPDATE SET metadata = jsonb_build_object('count', v_pending_payments_stuck);
    ELSE
        UPDATE system_alerts SET status = 'RESOLVED', resolved_at = NOW() WHERE alert_name = 'PENDING_PAYMENTS_STALLED' AND status != 'RESOLVED';
    END IF;
END;
$$ LANGUAGE plpgsql;
