"use client";

import { useEffect, useState } from "react";
import { ApiClientError } from "@/frontend/api/http";
import { settingsApi, type RestaurantSettings } from "@/frontend/api/settings.api";
import { cn } from "@/lib/utils";
import {
  Save,
  Store,
  Phone,
  MapPin,
  FileText,
  Globe,
  Loader2,
  Check,
  AlertCircle,
  Percent,
} from "lucide-react";

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<RestaurantSettings | null>(null);
  const [form, setForm] = useState<Partial<RestaurantSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await settingsApi.get();
        if (!active) return;
        setRestaurant(data);
        setForm(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load settings");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function set(field: keyof RestaurantSettings, value: string | number) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
    setSaved(false);
  }

  function getApiErrorMessage(err: unknown): string {
    if (err instanceof ApiClientError) {
      const fields = err.details as Record<string, string[] | undefined> | undefined;
      const firstFieldError = fields
        ? Object.values(fields).flatMap((messages) => messages ?? [])[0]
        : undefined;
      return firstFieldError ?? err.message;
    }

    return err instanceof Error ? err.message : "Unable to save settings";
  }

  async function save() {
    if (!restaurant) return;

    setSaving(true);
    setError("");

    try {
      const updated = await settingsApi.update({
        name: form.name ?? restaurant.name,
        phone: form.phone ?? restaurant.phone,
        address: form.address ?? null,
        logoUrl: form.logoUrl ?? null,
        language: form.language ?? restaurant.language,
        gstNumber: form.gstNumber ?? null,
        cgstRate: form.cgstRate ?? restaurant.cgstRate,
        sgstRate: form.sgstRate ?? restaurant.sgstRate,
      });

      setRestaurant(updated);
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title text-white">Settings</h1>
        <p className="page-subtitle">Restaurant profile and configuration</p>
      </div>

      <div className="card-dark p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-4 h-4 text-brand" />
          <h2 className="font-semibold text-white">Restaurant Info</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label text-ink-3">Restaurant name</label>
            <input className="input-dark" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label text-ink-3">URL slug</label>
            <input className="input-dark bg-dark-tertiary opacity-50 cursor-not-allowed" value={form.slug || ""} disabled />
            <p className="text-xs text-ink-4 mt-1">menuara.app/{form.slug}/...</p>
          </div>
        </div>

        <div>
          <label className="label text-ink-3 flex items-center gap-1.5">
            <Phone className="w-3 h-3" />Owner mobile
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 text-sm">+91</span>
            <input
              className="input-dark pl-12"
              value={form.phone || ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="98765 43210"
            />
          </div>
        </div>

        <div>
          <label className="label text-ink-3 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />Address
          </label>
          <textarea
            className="input-dark resize-none"
            rows={2}
            value={form.address || ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="123 MG Road, Koregaon Park, Pune 411001"
          />
        </div>

        <div>
          <label className="label text-ink-3">Logo URL</label>
          <input
            className="input-dark"
            value={form.logoUrl || ""}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder="https://..."
          />
          {form.logoUrl && (
            <img
              src={form.logoUrl}
              alt="logo"
              className="mt-2 w-16 h-16 rounded-xl object-cover border border-dark-border"
            />
          )}
        </div>
      </div>

      <div className="card-dark p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-brand" />
          <h2 className="font-semibold text-white">GST Settings</h2>
        </div>

        <div>
          <label className="label text-ink-3">GST Number</label>
          <input
            className="input-dark font-mono"
            value={form.gstNumber || ""}
            onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
            placeholder="27AAPFU0939F1ZV"
            maxLength={15}
          />
          <p className="text-xs text-ink-4 mt-1">Appears on all GST invoices</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label text-ink-3 flex items-center gap-1.5">
              <Percent className="w-3 h-3" />CGST Rate
            </label>
            <input
              className="input-dark"
              type="number"
              step="0.5"
              min="0"
              max="14"
              value={form.cgstRate ?? 2.5}
              onChange={(e) => set("cgstRate", parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="label text-ink-3 flex items-center gap-1.5">
              <Percent className="w-3 h-3" />SGST Rate
            </label>
            <input
              className="input-dark"
              type="number"
              step="0.5"
              min="0"
              max="14"
              value={form.sgstRate ?? 2.5}
              onChange={(e) => set("sgstRate", parseFloat(e.target.value))}
            />
          </div>
        </div>
        <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
          <p className="text-xs text-brand">
            Total GST: {((form.cgstRate || 0) + (form.sgstRate || 0)).toFixed(1)}%
            {" · "}
            On Rs.1,000 bill: CGST Rs.{((form.cgstRate || 0) * 10).toFixed(0)} + SGST Rs.
            {((form.sgstRate || 0) * 10).toFixed(0)} = Rs.
            {(((form.cgstRate || 0) + (form.sgstRate || 0)) * 10).toFixed(0)}
          </p>
        </div>
      </div>

      <div className="card-dark p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-brand" />
          <h2 className="font-semibold text-white">Menu Language</h2>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { value: "en", label: "English" },
            { value: "hi", label: "Hindi" },
            { value: "mr", label: "Marathi" },
            { value: "ta", label: "Tamil" },
            { value: "te", label: "Telugu" },
          ].map((lang) => (
            <button
              key={lang.value}
              onClick={() => set("language", lang.value)}
              className={cn(
                "px-3 py-2 rounded-xl border text-sm transition-all",
                form.language === lang.value
                  ? "bg-brand/10 border-brand/30 text-brand"
                  : "border-dark-border text-ink-4 hover:border-brand/30"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button onClick={save} disabled={saving || !restaurant} className={cn("btn-lg w-full", saved ? "bg-green-500 text-white" : "btn-primary")}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />Saving...
          </>
        ) : saved ? (
          <>
            <Check className="w-4 h-4" />Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />Save Settings
          </>
        )}
      </button>
    </div>
  );
}
