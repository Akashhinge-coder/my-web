"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/config/supabase/client";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [identifier, setIdentifier] = useState("");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const isUsername = identifier.length > 0 && !identifier.includes("@");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setSuccess(true);
      router.replace("/login");
    }
  }, [searchParams, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, restaurantSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      if (data.requirePasswordChange) {
        router.push("/update-password");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
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
          Welcome back
        </h1>
        <p className="text-sm text-ink-3">
          Sign in to your restaurant dashboard
        </p>
      </div>

      {/* Card */}
      <div className="card-dark p-8 border-dark-border">
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Identifier (Email or Username) */}
          <div>
            <label className="label text-ink-3">Email address or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="input-dark"
              placeholder="you@restaurant.com or username"
              required
              autoFocus
            />
          </div>

          {/* Restaurant Slug (Conditional) */}
          {isUsername && (
            <div className="animate-fade-in">
              <label className="label text-ink-3">Restaurant Code</label>
              <input
                type="text"
                value={restaurantSlug}
                onChange={(e) => setRestaurantSlug(e.target.value)}
                className="input-dark"
                placeholder="e.g. my-restaurant"
                required={isUsername}
              />
            </div>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label text-ink-3">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-brand hover:text-brand-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Success */}
          {success && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <span className="mt-0.5 text-emerald-400">✓</span>
              Your password has been successfully reset. Please sign in with your new password.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span className="mt-0.5 text-red-400">⚠</span>
              {error}
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
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="divider-dark mt-6" />

        <p className="text-center text-sm text-ink-3">
          New restaurant?{" "}
          <Link
            href="/register"
            className="text-brand hover:text-brand-400 font-medium transition-colors"
          >
            Create your account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-brand" />
          <p className="text-sm text-ink-3 font-medium">Loading secure login form…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
