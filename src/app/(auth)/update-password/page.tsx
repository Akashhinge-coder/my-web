"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/config/supabase/client";
import { cn } from "@/lib/utils";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      // 1. Update password in Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // 2. Mark must_change_password as false on the backend
      const res = await fetch("/api/v1/auth/password/reset", {
        method: "POST",
      });
      
      if (!res.ok) {
        throw new Error("Failed to finalize password update");
      }

      // Force re-login or redirect
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-md mx-auto mt-20">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-semibold text-white mb-2">
          Update Your Password
        </h1>
        <p className="text-sm text-ink-3">
          For security reasons, you must change your temporary password before continuing.
        </p>
      </div>

      <div className="card-dark p-8 border-dark-border">
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="label text-ink-3">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="label text-ink-3">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-dark"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span className="mt-0.5 text-red-400">⚠</span>
              {error}
            </div>
          )}

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
                Updating…
              </>
            ) : (
              <>
                Update Password
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
