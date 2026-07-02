import { createAdminClient } from "@/config/supabase/server";
import { AlertTriangle, CheckCircle, Clock, Activity, AlertOctagon, Repeat, Webhook, CreditCard } from "lucide-react";
import React from "react";

export const dynamic = "force-dynamic";

export default async function ObservabilityDashboard() {
  const supabase = createAdminClient();

  // Fetch all KPIs concurrently
  const [
    { data: paymentHealth },
    { data: webhookHealth },
    { data: outboxHealth },
    { data: reconHealth },
    { data: gatewayHealth },
    { data: alerts },
    { data: recentEvents },
  ] = await Promise.all([
    supabase.from("vw_payment_health_kpis").select("*").single(),
    supabase.from("vw_webhook_health_kpis").select("*").single(),
    supabase.from("vw_outbox_health_kpis").select("*").single(),
    supabase.from("vw_reconciliation_kpis").select("*").single(),
    supabase.from("vw_gateway_kpis").select("*").single(),
    supabase.from("system_alerts").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("payment_events").select("*").order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Payment Observability</h1>
        <p className="text-zinc-400">Real-time health metrics for the payment subsystem.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Payment Health */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-semibold text-white">Payment Health (24h)</h2>
          </div>
          <div className="space-y-3">
            <MetricRow label="Success Rate" value={`${paymentHealth?.success_rate_percent || 0}%`} />
            <MetricRow label="Total Payments" value={paymentHealth?.total_payments_24h || 0} />
            <MetricRow label="Failed" value={paymentHealth?.failed_payments || 0} isError={paymentHealth?.failed_payments > 0} />
            <MetricRow label="Expired" value={paymentHealth?.expired_payments || 0} />
            <MetricRow label="Manual Ratio" value={`${paymentHealth?.manual_payment_percent || 0}%`} />
            <MetricRow label="Avg Completion Time" value={`${paymentHealth?.avg_completion_time_seconds || 0}s`} />
          </div>
        </div>

        {/* Webhook Health */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Webhook className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Webhook Health (24h)</h2>
          </div>
          <div className="space-y-3">
            <MetricRow label="Success Rate" value={`${webhookHealth?.success_rate_percent || 0}%`} />
            <MetricRow label="Total Deliveries" value={webhookHealth?.total_webhooks_24h || 0} />
            <MetricRow label="Failed" value={webhookHealth?.failed_webhooks || 0} isError={webhookHealth?.failed_webhooks > 0} />
            <MetricRow label="Duplicates Filtered" value={webhookHealth?.duplicate_deliveries || 0} />
          </div>
        </div>

        {/* Outbox Health */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Transactional Outbox</h2>
          </div>
          <div className="space-y-3">
            <MetricRow label="Pending Backlog" value={outboxHealth?.pending_events || 0} isWarning={outboxHealth?.pending_events > 50} />
            <MetricRow label="Processed (24h)" value={outboxHealth?.processed_events_24h || 0} />
            <MetricRow label="Failed Events" value={outboxHealth?.failed_events || 0} isError={outboxHealth?.failed_events > 0} />
            <MetricRow label="Total Replays" value={outboxHealth?.total_replay_counts || 0} />
          </div>
        </div>

        {/* Dead Letter Queue */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold text-white">Dead Letter Queue (DLQ)</h2>
          </div>
          <div className="space-y-3">
            <MetricRow label="DLQ Size" value={outboxHealth?.dlq_size || 0} isError={outboxHealth?.dlq_size > 0} />
            <p className="text-xs text-zinc-500 mt-2">Requires manual replay intervention if size &gt; 0.</p>
          </div>
        </div>

        {/* Gateway Health */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">Gateway Telemetry (24h)</h2>
          </div>
          <div className="space-y-3">
            <MetricRow label="API Errors (5xx)" value={gatewayHealth?.gateway_errors || 0} isError={gatewayHealth?.gateway_errors > 0} />
            <MetricRow label="Timeouts (408)" value={gatewayHealth?.gateway_timeouts || 0} isWarning={gatewayHealth?.gateway_timeouts > 0} />
          </div>
        </div>

        {/* Reconciliation Health */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Repeat className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Reconciliation (24h)</h2>
          </div>
          <div className="space-y-3">
            <MetricRow label="Total Runs" value={reconHealth?.total_reconciliation_runs || 0} />
            <MetricRow label="Payments Recovered" value={reconHealth?.payments_recovered || 0} />
            <MetricRow label="Manual Interventions" value={reconHealth?.manual_intervention_required || 0} isError={reconHealth?.manual_intervention_required > 0} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 overflow-hidden">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Alerts</h2>
          <div className="space-y-3">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert: any) => (
                <div key={alert.id} className="flex flex-col p-3 rounded-md bg-zinc-950 border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <AlertBadge severity={alert.severity} />
                      <span className="text-sm font-medium text-white">{alert.alert_name}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">{alert.description}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500 py-4 text-center">No recent alerts. System is healthy.</div>
            )}
          </div>
        </div>

        {/* Recent Events Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 overflow-hidden">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Audit Events</h2>
          <div className="space-y-3">
            {recentEvents && recentEvents.length > 0 ? (
              recentEvents.map((event: any) => (
                <div key={event.id} className="flex justify-between items-center p-3 rounded-md bg-zinc-950 border border-zinc-800">
                  <div>
                    <span className="text-sm font-medium text-white">{event.event_type}</span>
                    <p className="text-xs text-zinc-500">{event.actor_type}</p>
                  </div>
                  <span className="text-xs text-zinc-500">{new Date(event.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500 py-4 text-center">No recent events.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, isError = false, isWarning = false }: { label: string, value: string | number, isError?: boolean, isWarning?: boolean }) {
  let colorClass = "text-zinc-100";
  if (isError) colorClass = "text-red-400 font-bold";
  if (isWarning) colorClass = "text-yellow-400 font-bold";

  return (
    <div className="flex justify-between items-center py-1 border-b border-zinc-800/50 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={`text-sm ${colorClass}`}>{value}</span>
    </div>
  );
}

function AlertBadge({ severity }: { severity: string }) {
  if (severity === "CRITICAL") return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</span>;
  if (severity === "WARNING") return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">WARNING</span>;
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">INFO</span>;
}
