"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import {
  integrationsApi,
  type IntegrationsRestaurant,
  type IntegrationsStats,
} from "@/frontend/api/integrations.api";
import { formatINR, generateWhatsAppEODReport } from "@/lib/utils";
import { Link2, MessageCircle, TrendingUp, Check, Settings, AlertTriangle } from "lucide-react";
import RazorpayConfigModal from "./components/RazorpayConfigModal";
import { fetchIntegrationStatus } from "./actions";

export default function IntegrationsPage() {
  const [restaurant, setRestaurant] = useState<IntegrationsRestaurant | null>(null);
  const [todayStats, setTodayStats] = useState<IntegrationsStats>({ revenue: 0, orders: 0, covers: 0, topDish: "—", upi: 0, cash: 0, card: 0 });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [rzpStatus, setRzpStatus] = useState<any>(null);
  const [showRzpModal, setShowRzpModal] = useState(false);

  const fetchIntegrations = async (restId: string) => {
    try {
      const status = await fetchIntegrationStatus(restId, 'razorpay');
      setRzpStatus(status || { status: 'PENDING' });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    async function init() {
      const dashboard = await integrationsApi.getDashboard();
      setRestaurant(dashboard.restaurant);
      setTodayStats(dashboard.stats);
      if (dashboard.restaurant) {
        await fetchIntegrations(dashboard.restaurant.id);
      }
    }
    init();
  }, []);

  async function sendWhatsAppReport() {
    if (!restaurant) return;
    setSending(true);
    const link = generateWhatsAppEODReport(restaurant.phone, restaurant.name, {
      date:    new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" }),
      revenue: todayStats.revenue,
      orders:  todayStats.orders,
      covers:  todayStats.covers,
      topDish: todayStats.topDish,
      upi:     todayStats.upi,
      cash:    todayStats.cash,
      card:    todayStats.card,
    });
    window.open(link, "_blank");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setSending(false);
  }

  const INTEGRATIONS = [
    {
      id: "zomato",
      name: "Zomato",
      desc: "Receive Zomato delivery orders directly in your kitchen display alongside table orders.",
      status: "coming_soon",
      color: "text-red-400",
      bg: "bg-red-400/10 border-red-400/20",
      steps: ["Apply for Zomato Partner API access", "Enter your API credentials here", "Orders flow into unified inbox automatically"],
    },
    {
      id: "swiggy",
      name: "Swiggy",
      desc: "Receive Swiggy delivery orders in the same kitchen screen as your dine-in orders.",
      status: "coming_soon",
      color: "text-orange-400",
      bg: "bg-orange-400/10 border-orange-400/20",
      steps: ["Apply for Swiggy Merchant API", "Enter your API credentials here", "Orders appear in unified kitchen display"],
    }
  ];

  const getRzpBadge = () => {
    if (!rzpStatus || rzpStatus.status === 'PENDING') {
      return <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-[#facc15]/10 border-[#facc15]/20 text-[#facc15]">Setup Required</span>;
    }
    if (rzpStatus.status === 'ACTIVE') {
      return <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]">✓ {rzpStatus.mode === 'LIVE' ? 'Live' : 'Sandbox'}</span>;
    }
    return <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-red-500/10 border-red-500/20 text-red-400"><AlertTriangle className="w-3 h-3 inline mr-1" />{rzpStatus.status}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-white flex items-center gap-2">
          <Link2 className="w-6 h-6 text-accent-cyan" />Integrations
        </h1>
        <p className="page-subtitle text-slate-400">Connect MENUARA with external platforms</p>
      </div>

      {/* WhatsApp EOD Report */}
      <div className="card-admin p-6 border-[#34d399]/20">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#34d399]/10 border border-[#34d399]/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-[#34d399]" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">WhatsApp End-of-Day Report</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send today's revenue summary, top dishes, and payment breakdown directly to your WhatsApp.
                Opens WhatsApp with a pre-filled message — tap Send.
              </p>
            </div>
          </div>
        </div>

        {/* Today preview */}
        <div className="bg-admin-card-2 border border-admin-border-2 rounded-xl p-4 mb-4 font-mono text-xs text-slate-400 space-y-1 leading-relaxed">
          <p className="text-white font-semibold">📊 MENUARA Daily Report</p>
          <p>🏪 {restaurant?.name}</p>
          <p>📅 {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}</p>
          <p className="mt-1">💰 Revenue: <span className="text-accent-cyan">{formatINR(todayStats.revenue)}</span></p>
          <p>📦 Orders: {todayStats.orders}</p>
          <p>👥 Covers: {todayStats.covers}</p>
          <p>🏆 Top dish: {todayStats.topDish}</p>
          <p className="mt-1">💳 UPI: {formatINR(todayStats.upi)} · Cash: {formatINR(todayStats.cash)} · Card: {formatINR(todayStats.card)}</p>
        </div>

        <button onClick={sendWhatsAppReport} disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#34d399] hover:brightness-110 text-[#0c0e12] font-semibold transition-all">
          {sent ? (
            <><Check className="w-4 h-4" />Opening WhatsApp…</>
          ) : (
            <><MessageCircle className="w-4 h-4" />Send to WhatsApp</>
          )}
        </button>
      </div>

      {/* Other integrations */}
      <div className="space-y-4">
        {/* Razorpay Card */}
        <div className="card-admin p-6 border-accent-cyan/20">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 bg-blue-400/10 border-blue-400/20">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">Razorpay Payments</h3>
                  {getRzpBadge()}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">Accept UPI, GPay, PhonePe, Paytm QR — with automated reconciliation and zero liability.</p>
                
                {rzpStatus && rzpStatus.status === 'ACTIVE' && (
                  <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                    <p>Merchant: <span className="text-slate-300 font-medium">{rzpStatus.metadata?.merchantName || 'Unknown'}</span></p>
                    <p>Secret: <span className="font-mono text-slate-400">••••••••••••••</span></p>
                    <p>Last Rotated: {new Date(rzpStatus.last_rotated_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => setShowRzpModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-admin-card-2 border border-admin-border-2 text-white hover:border-accent-cyan hover:text-accent-cyan transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              {rzpStatus?.status === 'ACTIVE' ? 'Replace Secret' : 'Configure'}
            </button>
          </div>
        </div>

        {INTEGRATIONS.map(int => (
          <div key={int.id} className="card-admin p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${int.bg}`}>
                  <TrendingUp className={`w-5 h-5 ${int.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{int.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      int.status === "configured"
                        ? "bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]"
                        : "bg-[#facc15]/10 border-[#facc15]/20 text-[#facc15]"
                    }`}>
                      {int.status === "configured" ? "✓ Connected" : "Coming soon"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{int.desc}</p>
                </div>
              </div>
            </div>

            {int.steps.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {int.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-4 h-4 rounded-full bg-admin-card-2 border border-admin-border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {restaurant && (
        <RazorpayConfigModal 
          isOpen={showRzpModal}
          onClose={() => setShowRzpModal(false)}
          restaurantId={restaurant.id}
          onSuccess={() => fetchIntegrations(restaurant.id)}
        />
      )}
    </div>
  );
}
