"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/config/supabase/client";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";

const COOLDOWN_MS = 60000;

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Load and check cooldown from localStorage on mount
  useEffect(() => {
    const lastSent = localStorage.getItem("menuara_forgot_pw_last_sent");
    if (lastSent) {
      const elapsed = Date.now() - Number(lastSent);
      if (elapsed < COOLDOWN_MS) {
        setCooldown(Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      }
    }
  }, []);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${env.APP_URL}/reset-password`,
      });

      if (authError) throw authError;

      setSuccess(true);
      localStorage.setItem("menuara_forgot_pw_last_sent", String(Date.now()));
      setCooldown(60);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-10">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-bold"
            style={{ background: "linear-gradient(135deg, #C17D3C, #E8A85F)" }}
          >
            M
          </div>
          <span className="font-display font-semibold text-xl text-white tracking-tight">
            MENUARA
          </span>
        </Link>
        <h1 className="font-display text-3xl font-semibold text-white mb-2">
          Reset password
        </h1>
        <p className="text-sm text-ink-3">
          We&apos;ll send you an email link to securely update your password
        </p>
      </div>

      {/* Card */}
      <div className="card-dark p-8 border-dark-border">
        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-400 animate-bounce">
              <MailCheck className="w-8 h-8" />
            </div>
            <h2 className="font-display text-xl font-semibold text-white">
              Check your inbox
            </h2>
            <p className="text-sm text-ink-3 leading-relaxed">
              If an account is registered with <span className="text-white font-medium">{email}</span>, 
              we have sent a password recovery link to your inbox.
            </p>
            <p className="text-xs text-ink-4">
              Be sure to check your spam folder if you do not receive the email in a few minutes.
            </p>

            <div className="divider-dark" />

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm text-brand hover:text-brand-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label text-ink-3">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark"
                placeholder="you@restaurant.com"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Status alerts */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
                <span className="mt-0.5 text-red-400">⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className={cn(
                "btn-lg btn-primary w-full mt-2",
                (loading || cooldown > 0) && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending link…
                </>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                "Send recovery link"
              )}
            </button>

            <div className="divider-dark mt-6" />

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
