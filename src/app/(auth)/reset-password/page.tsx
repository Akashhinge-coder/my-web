"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { createClient } from "@/config/supabase/client";
import { PASSWORD_REGEX, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Verify recovery session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        router.replace("/login");
      }
    }
    checkSession();
  }, [router, supabase]);

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // 1. Password Policy Validation
    if (!PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_REQUIREMENTS);
      return;
    }

    // 2. Mismatch Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      // Success redirect
      router.push("/login?reset=success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.toLowerCase().includes("jwt") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("session")
      ) {
        setError(
          "Your password recovery link is expired, invalid, or already used. Please go to the Forgot Password page to request a new link."
        );
      } else {
        setError(msg || "Failed to update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 animate-pulse">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
        <p className="text-sm text-ink-3">Verifying your secure recovery link…</p>
      </div>
    );
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
          Update password
        </h1>
        <p className="text-sm text-ink-3">
          Choose a strong password to secure your account
        </p>
      </div>

      {/* Card */}
      <div className="card-dark p-8 border-dark-border">
        <form onSubmit={handlePasswordUpdate} className="space-y-5">
          {/* New Password */}
          <div>
            <label className="label text-ink-3">New password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark pr-10"
                placeholder="Enter new password"
                required
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors"
                disabled={loading}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="label text-ink-3">Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-dark pr-10"
                placeholder="Repeat new password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors"
                disabled={loading}
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error / Password Validation Notice */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
              <span className="mt-0.5 text-red-400">⚠</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "btn-lg btn-primary w-full mt-2",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating password…
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Update password
              </>
            )}
          </button>

          <div className="divider-dark mt-6" />

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-xs text-brand hover:text-brand-400 transition-colors"
            >
              Request a new recovery link
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
