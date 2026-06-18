"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UtensilsCrossed, ArrowRight, Clock } from "lucide-react";
import { useCart } from "@/frontend/hooks/useCart";

const BRAND_GRADIENT = "linear-gradient(135deg,#C17D3C,#E8A85F)";

export default function WelcomePage({
  params,
}: {
  params: { slug: string; tableId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrToken = searchParams.get("qr_token");
  const cart = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Auto-bootstrap and Polling logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function checkIdempotency() {
      try {
        const res = await fetch(`/api/v1/sessions/bootstrap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: params.tableId, qrToken }),
        });
        const resData = await res.json();
        const sessionData = resData.data || resData;
        
        if (!resData.error && sessionData.status === "approved") {
          cart.setSession(sessionData.sessionId);
          router.replace(`/${params.slug}/${params.tableId}?qr_token=${qrToken || ""}`);
        } else if (!resData.error && sessionData.status === "pending") {
          setStatus("pending");
        }
      } catch (err) {
        // Ignored. Wait for user to submit form
      }
    }

    checkIdempotency();

    // Poll every 3 seconds if pending
    if (status === "pending") {
      intervalId = setInterval(checkIdempotency, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [params.tableId, params.slug, qrToken, router, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/sessions/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: params.tableId,
          qrToken,
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      const resData = await res.json();

      if (resData.error) {
        setError(resData.error.message || "Failed to join table. Please try again.");
        setLoading(false);
        return;
      }

      const sessionData = resData.data || resData;

      if (sessionData.status === "approved") {
        cart.setSession(sessionData.sessionId);
        router.replace(`/${params.slug}/${params.tableId}?qr_token=${qrToken || ""}`);
      } else {
        setStatus("pending");
        setLoading(false);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (status === "pending") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-card border border-border flex flex-col items-center">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-ink">
            Waiting for Approval
          </h1>
          <p className="text-sm text-ink-3 mt-2 mb-6">
            The Host of this table needs to approve your request before you can see the menu.
          </p>
          <div className="flex items-center gap-2 text-ink-4 text-xs font-medium">
            <span className="w-2 h-2 bg-brand rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-card border border-border">
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-brand mb-4"
            style={{ background: BRAND_GRADIENT }}
          >
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-ink">
            Welcome to the Table
          </h1>
          <p className="text-sm text-ink-3 mt-2">
            Please enter your details to join the session.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5 ml-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5 ml-1">
              Phone Number <span className="text-ink-4 text-xs font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all active:scale-95 disabled:opacity-70 mt-6"
            style={{ background: BRAND_GRADIENT }}
          >
            {loading ? "Joining..." : "Join Table"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
