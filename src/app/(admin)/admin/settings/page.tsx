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
  Upload,
  Users,
} from "lucide-react";

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<RestaurantSettings | null>(null);
  const [form, setForm] = useState<Partial<RestaurantSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await settingsApi.get();
        if (!active) return;
        setRestaurant(data);
        setForm(data);
        setPreviewUrl(data.logoUrl || null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    // 1. Client-side Validation
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid file type. Only PNG, JPEG, and WebP are allowed.");
      setUploading(false);
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError("File size exceeds 5 MB limit.");
      setUploading(false);
      return;
    }

    // 2. Load and scale the image using Canvas
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;
      const maxDim = 512;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setUploadError("Unable to initialize image scaling context.");
        setUploading(false);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // 3. Compress to WebP Blob (quality 0.8)
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setUploadError("Image compression failed.");
            setUploading(false);
            return;
          }

          // Generate instant local preview
          const localPreviewUrl = URL.createObjectURL(blob);
          setPreviewUrl(localPreviewUrl);

          // 4. Upload to backend
          const uploadFormData = new FormData();
          uploadFormData.append("file", blob, "logo.webp");

          try {
            const res = await fetch("/api/v1/settings/logo", {
              method: "POST",
              body: uploadFormData,
            });

            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || "Failed to upload logo.");
            }

            const data = await res.json();
            setForm((prev) => ({ ...prev, logoUrl: data.logoUrl }));
            setRestaurant((prev) => prev ? { ...prev, logoUrl: data.logoUrl } : null);
            setPreviewUrl(data.logoUrl);

            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("settings-updated"));
            }
          } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Error uploading logo.");
            setPreviewUrl(form.logoUrl || null);
          } finally {
            setUploading(false);
          }
        },
        "image/webp",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setUploadError("Failed to load image file.");
      setUploading(false);
    };
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    setUploadError("");

    try {
      const res = await fetch("/api/v1/settings/logo", {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to remove logo.");
      }

      setForm((prev) => ({ ...prev, logoUrl: null }));
      setRestaurant((prev) => (prev ? { ...prev, logoUrl: null } : null));
      setPreviewUrl(null);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("settings-updated"));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error removing logo.");
    } finally {
      setUploading(false);
    }
  };

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
        sessionMode: form.sessionMode ?? restaurant.sessionMode,
        gstNumber: form.gstNumber ?? null,
        cgstRate: form.cgstRate ?? restaurant.cgstRate,
        sgstRate: form.sgstRate ?? restaurant.sgstRate,
      });

      setRestaurant(updated);
      setForm(updated);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("settings-updated"));
      }
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
          <label className="label text-ink-3">Restaurant Logo</label>
          <div className="flex items-center gap-4 mt-2">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-dark-tertiary border border-dark-border flex items-center justify-center flex-shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="logo preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
                  style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
                >
                  {form.name?.charAt(0).toUpperCase() || "M"}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-brand animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="btn-sm btn-primary cursor-pointer inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Choose Logo
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                    className="btn-sm bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-ink-4">
                PNG, JPG or WebP (max 5 MB). Logo will be optimized.
              </p>
            </div>
          </div>
          {uploadError && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {uploadError}
            </p>
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

      <div className="card-dark p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-brand" />
          <h2 className="font-semibold text-white">Ordering Experience</h2>
        </div>
        <div>
          <label className="label text-ink-3 mb-3 block">Session Mode</label>
          <div className="flex gap-4 flex-col sm:flex-row">
            <button
              onClick={() => set("sessionMode", "open")}
              className={cn(
                "flex-1 text-left p-4 rounded-xl border transition-all relative overflow-hidden",
                form.sessionMode === "open"
                  ? "bg-brand/10 border-brand text-white shadow-sm shadow-brand/20"
                  : "bg-dark-tertiary border-dark-border text-ink-3 hover:border-brand/50"
              )}
            >
              {form.sessionMode === "open" && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-brand/10 rotate-45 translate-x-8 -translate-y-8" />
              )}
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                Open Ordering
                {form.sessionMode === "open" && <Check className="w-4 h-4 text-brand" />}
              </h3>
              <p className="text-xs opacity-80 leading-relaxed">
                Anyone at the table can scan and order immediately. Best for casual dining.
              </p>
            </button>

            <button
              onClick={() => set("sessionMode", "host_approval")}
              className={cn(
                "flex-1 text-left p-4 rounded-xl border transition-all relative overflow-hidden",
                form.sessionMode === "host_approval"
                  ? "bg-brand/10 border-brand text-white shadow-sm shadow-brand/20"
                  : "bg-dark-tertiary border-dark-border text-ink-3 hover:border-brand/50"
              )}
            >
              {form.sessionMode === "host_approval" && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-brand/10 rotate-45 translate-x-8 -translate-y-8" />
              )}
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                Host Approval
                {form.sessionMode === "host_approval" && <Check className="w-4 h-4 text-brand" />}
              </h3>
              <p className="text-xs opacity-80 leading-relaxed">
                The first person to scan becomes the Host. Other guests must be approved by the Host to view the menu.
              </p>
            </button>
          </div>
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
