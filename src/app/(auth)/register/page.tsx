"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowLeft, Check, Loader2,
  Store, User, MapPin, FileText,
} from "lucide-react";
import { createClient } from "@/config/supabase/client";
import { cn, generateSlug, validatePhone, validateGST } from "@/lib/utils";
import { PASSWORD_REGEX, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";

// ── Steps ─────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Account",    icon: User },
  { id: 2, label: "Restaurant", icon: Store },
  { id: 3, label: "Details",    icon: MapPin },
  { id: 4, label: "Done",       icon: Check },
];

interface FormData {
  // Step 1 — account
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2 — restaurant
  restaurantName: string;
  phone: string;
  // Step 3 — details
  address: string;
  gstNumber: string;
  tableCount: string;
}

const EMPTY: FormData = {
  email: "", password: "", confirmPassword: "",
  restaurantName: "", phone: "",
  address: "", gstNumber: "", tableCount: "10",
};

export default function RegisterPage() {
  const router    = useRouter();
  const supabase  = createClient();

  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState<FormData>(EMPTY);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: keyof FormData, val: string) {
    setForm((p) => ({ ...p, [field]: val }));
    setError("");
  }

  // ── Validation per step ──────────────────────────────────
  function validateStep(s: number): string {
    if (s === 1) {
      if (!form.email) return "Email is required";
      if (!PASSWORD_REGEX.test(form.password)) return PASSWORD_REQUIREMENTS;
      if (form.password !== form.confirmPassword) return "Passwords don't match";
    }
    if (s === 2) {
      if (!form.restaurantName.trim()) return "Restaurant name is required";
      const cleanPhone = form.phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) return "Phone number must be exactly 10 digits";
      if (!/^[6-9]/.test(cleanPhone)) return "Mobile number must start with 6, 7, 8, or 9";
    }
    if (s === 3) {
      if (form.gstNumber && !validateGST(form.gstNumber))
        return "Enter a valid GST number (e.g. 27AAPFU0939F1ZV)";
      const count = parseInt(form.tableCount);
      if (isNaN(count) || count < 1 || count > 200)
        return "Table count must be between 1 and 200";
    }
    return "";
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  }

  // ── Final submit ─────────────────────────────────────────
  async function handleSubmit() {
    const err = validateStep(3);
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");

    try {
      // 1. Create auth user
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });
      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      const slug = generateSlug(form.restaurantName);
      const userId = authData.user.id;

      // 2. Create restaurant record
      const { data: restaurant, error: restError } = await supabase
        .from("restaurants")
        .insert({
          owner_id: userId,
          name: form.restaurantName.trim(),
          slug,
          phone: form.phone.replace(/\s/g, ""),
          address: form.address || null,
          gst_number: form.gstNumber || null,
        })
        .select()
        .single();
      if (restError) throw restError;

      // 3. Create staff record for owner
      await supabase.from("staff").insert({
        restaurant_id: restaurant.id,
        user_id: userId,
        name: form.restaurantName.trim() + " Admin",
        role: "admin",
        phone: form.phone.replace(/\s/g, ""),
        is_active: true,
      });

      // 4. Create tables
      const tableCount = parseInt(form.tableCount);
      const tables = Array.from({ length: tableCount }, (_, i) => ({
        restaurant_id: restaurant.id,
        table_number: `T${i + 1}`,
        seating_capacity: 4,
        table_type: "regular" as const,
        status: "available" as const,
        floor: "Ground Floor",
      }));
      if (tables.length > 0) {
        await supabase.from("restaurant_tables").insert(tables);
      }

      setStep(4);
    } catch (err: any) {
      console.error("Registration error details:", err);
      const msg = err?.message || err?.error_description || (typeof err === "string" ? err : "Registration failed. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 4 success ───────────────────────────────────────
  if (step === 4) {
    return (
      <div className="animate-fade-in text-center">
        <div className="card-dark p-10 border-dark-border">
          <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-brand" />
          </div>
          <h2 className="font-display text-3xl font-semibold text-white mb-3">
            You&apos;re live! 🎉
          </h2>
          <p className="text-ink-3 mb-2 leading-relaxed">
            <span className="text-white font-medium">{form.restaurantName}</span> is set up
            with {form.tableCount} tables. Your QR codes are ready to print.
          </p>
          <p className="text-sm text-ink-4 mb-8">
            Check your email to confirm your account, then sign in to your dashboard.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn-lg btn-primary w-full"
          >
            Go to dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-display font-bold"
            style={{ background: "linear-gradient(135deg, #C17D3C, #E8A85F)" }}
          >
            M
          </div>
          <span className="font-display font-semibold text-lg text-white tracking-tight">
            MENUARA
          </span>
        </Link>
        <h1 className="font-display text-3xl font-semibold text-white mb-1">
          Register your restaurant
        </h1>
        <p className="text-sm text-ink-3">Get started in under 10 minutes</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {STEPS.slice(0, 3).map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                step === s.id
                  ? "bg-brand text-white"
                  : step > s.id
                  ? "bg-brand/20 text-brand"
                  : "bg-dark-tertiary text-ink-4"
              )}
            >
              {step > s.id ? (
                <Check className="w-3 h-3" />
              ) : (
                <s.icon className="w-3 h-3" />
              )}
              {s.label}
            </div>
            {i < 2 && (
              <div
                className={cn(
                  "w-6 h-px mx-1 transition-all",
                  step > s.id ? "bg-brand/40" : "bg-dark-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="card-dark p-8 border-dark-border">

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <label className="label text-ink-3">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="input-dark"
                placeholder="you@restaurant.com"
                autoFocus
              />
            </div>
            <div>
              <label className="label text-ink-3">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="input-dark"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label className="label text-ink-3">Confirm password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                className="input-dark"
                placeholder="Repeat your password"
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Restaurant ── */}
        {step === 2 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <label className="label text-ink-3">Restaurant name</label>
              <input
                type="text"
                value={form.restaurantName}
                onChange={(e) => set("restaurantName", e.target.value)}
                className="input-dark"
                placeholder="e.g. Spice Garden, Punjabi Dhaba…"
                autoFocus
              />
              {form.restaurantName && (
                <p className="text-xs text-ink-4 mt-1.5">
                  Menu URL:{" "}
                  <span className="text-brand">
                    menuara.app/{generateSlug(form.restaurantName)}/…
                  </span>
                </p>
              )}
            </div>
            <div>
              <label className="label text-ink-3">Owner&apos;s mobile number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
                  className="input-dark pl-12"
                  placeholder="98765 43210"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Details ── */}
        {step === 3 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <label className="label text-ink-3">
                Number of tables
              </label>
              <input
                type="number"
                value={form.tableCount}
                onChange={(e) => set("tableCount", e.target.value)}
                className="input-dark"
                placeholder="e.g. 12"
                min={1}
                max={200}
                autoFocus
              />
              <p className="text-xs text-ink-4 mt-1.5">
                We&apos;ll create QR codes for all tables instantly.
                You can add or remove tables later.
              </p>
            </div>
            <div>
              <label className="label text-ink-3">
                Restaurant address{" "}
                <span className="text-ink-4 normal-case font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className="input-dark resize-none"
                placeholder="123 MG Road, Koregaon Park, Pune 411001"
                rows={2}
              />
            </div>
            <div>
              <label className="label text-ink-3 flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                GST number{" "}
                <span className="text-ink-4 normal-case font-normal">
                  (optional — for invoice printing)
                </span>
              </label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
                className="input-dark font-mono"
                placeholder="27AAPFU0939F1ZV"
                maxLength={15}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mt-5">
            <span>⚠</span>
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className={cn("flex gap-3 mt-7", step > 1 ? "justify-between" : "justify-end")}>
          {step > 1 && (
            <button
              onClick={() => { setError(""); setStep((s) => s - 1); }}
              className="btn-md btn-dark"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={nextStep} className="btn-md btn-primary ml-auto">
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={cn(
                "btn-md btn-primary ml-auto",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up…
                </>
              ) : (
                <>
                  Create restaurant
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-ink-3 mt-5">
        Already registered?{" "}
        <Link href="/login" className="text-brand hover:text-brand-400 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
