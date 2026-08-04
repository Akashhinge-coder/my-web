"use client";

import { useState } from "react";
import { X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { saveRazorpayConfig, testRazorpayConnection } from "../actions";

export default function RazorpayConfigModal({
  isOpen,
  onClose,
  restaurantId,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'TEST' | 'LIVE'>('TEST');
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!keyId || !keySecret) {
      setError("Key ID and Secret are required.");
      return;
    }
    setTesting(true);
    setError(null);
    setTestResult(null);

    const result = await testRazorpayConnection(keyId, keySecret, mode);
    if (result.success) {
      setTestResult({ success: true, message: `Connection Successful! Merchant: ${result.merchantName}` });
    } else {
      setTestResult({ success: false, message: result.error || "Connection failed" });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!keyId || !keySecret) {
      setError("Key ID and Secret are required.");
      return;
    }

    if (testResult?.success === false) {
      setError("Please fix connection errors before saving.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await saveRazorpayConfig(
        restaurantId,
        keyId,
        keySecret,
        webhookSecret || null,
        mode
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-admin-card w-full max-w-lg rounded-2xl border border-admin-border shadow-2xl overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Configure Razorpay</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {testResult && (
            <div className={`p-3 border rounded-xl text-sm flex items-center gap-2 ${
              testResult.success 
                ? "bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]" 
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {testResult.message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Mode</label>
              <div className="flex bg-admin-card-2 p-1 rounded-xl border border-admin-border-2">
                <button
                  type="button"
                  onClick={() => setMode('TEST')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    mode === 'TEST' ? "bg-accent-cyan text-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Test (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('LIVE')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    mode === 'LIVE' ? "bg-accent-cyan text-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Live (Production)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Razorpay Key ID</label>
              <input 
                type="text" 
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder={mode === 'TEST' ? "rzp_test_..." : "rzp_live_..."}
                className="w-full bg-admin-bg border border-admin-border-2 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent-cyan transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Razorpay Secret Key</label>
              <input 
                type="password" 
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder="••••••••••••••"
                className="w-full bg-admin-bg border border-admin-border-2 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent-cyan transition-colors"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Your secret will be encrypted using AES-256-GCM before saving. It will never be displayed again.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Webhook Secret (Optional)</label>
              <input 
                type="password" 
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="••••••••••••••"
                className="w-full bg-admin-bg border border-admin-border-2 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent-cyan transition-colors"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                If omitted, the Secret Key will be used to verify webhooks.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-admin-card-2 border-t border-admin-border flex items-center justify-end gap-3">
          <button 
            onClick={handleTest}
            disabled={testing || loading || !keyId || !keySecret}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Test Connection
          </button>
          
          <button 
            onClick={handleSave}
            disabled={loading || testing || !keyId || !keySecret}
            className="px-5 py-2 rounded-xl bg-accent-cyan text-black text-sm font-semibold hover:brightness-110 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
