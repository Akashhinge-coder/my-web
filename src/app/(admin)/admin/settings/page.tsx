"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
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
  ImageUp,
} from "lucide-react";
import { ImageFocusEditor } from "@/frontend/components/admin/ImageFocusEditor";

export default function SettingsPage() {
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [restaurant, setRestaurant] = useState<RestaurantSettings | null>(null);
  const [form, setForm] = useState<Partial<RestaurantSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadHeroError, setUploadHeroError] = useState("");
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await settingsApi.get();
        if (!active) return;
        setRestaurant(data);
        setForm(data);
        setPreviewUrl(data.logoUrl || null);
        setHeroPreviewUrl(data.heroImageUrl || null);
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
    const img = new window.Image();
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

  const handleHeroFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHero(true);
    setUploadHeroError("");

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadHeroError("Invalid file type. Only PNG, JPEG, and WebP are allowed.");
      setUploadingHero(false);
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadHeroError("File size exceeds 5 MB limit.");
      setUploadingHero(false);
      return;
    }

    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;
      const maxDim = 1200;

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
        setUploadHeroError("Unable to initialize image scaling context.");
        setUploadingHero(false);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setUploadHeroError("Image compression failed.");
            setUploadingHero(false);
            return;
          }

          const localPreviewUrl = URL.createObjectURL(blob);
          setHeroPreviewUrl(localPreviewUrl);

          const uploadFormData = new FormData();
          uploadFormData.append("file", blob, "hero.webp");

          try {
            const res = await settingsApi.uploadMedia("hero", uploadFormData);

            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || "Failed to upload hero image.");
            }

            const data = await res.json();
            setForm((prev) => ({ ...prev, heroImageUrl: data.url }));
            setRestaurant((prev) => prev ? { ...prev, heroImageUrl: data.url } : null);
            setHeroPreviewUrl(data.url);

          } catch (err) {
            setUploadHeroError(err instanceof Error ? err.message : "Error uploading hero image.");
            setHeroPreviewUrl(form.heroImageUrl || null);
          } finally {
            setUploadingHero(false);
          }
        },
        "image/webp",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setUploadHeroError("Failed to load image file.");
      setUploadingHero(false);
    };
  };

  const handleRemoveHero = async () => {
    setUploadingHero(true);
    setUploadHeroError("");

    try {
      const res = await settingsApi.removeMedia("hero");

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to remove hero image.");
      }

      setForm((prev) => ({ ...prev, heroImageUrl: null }));
      setRestaurant((prev) => (prev ? { ...prev, heroImageUrl: null } : null));
      setHeroPreviewUrl(null);

    } catch (err) {
      setUploadHeroError(err instanceof Error ? err.message : "Error removing hero image.");
    } finally {
      setUploadingHero(false);
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
        heroImageUrl: form.heroImageUrl ?? null,
        heroFocusX: form.heroFocusX ?? restaurant.heroFocusX ?? 0.5,
        heroFocusY: form.heroFocusY ?? restaurant.heroFocusY ?? 0.5,
        heroOverlayOpacity: form.heroOverlayOpacity ?? restaurant.heroOverlayOpacity ?? 0.35,
        heroEnabled: form.heroEnabled ?? restaurant.heroEnabled ?? true,
        language: form.language ?? restaurant.language,
        sessionMode: form.sessionMode ?? restaurant.sessionMode,
        gstNumber: form.gstNumber ?? null,
        cgstRate: form.cgstRate ?? restaurant.cgstRate,
        sgstRate: form.sgstRate ?? restaurant.sgstRate,
        maxReservationDaysInAdvance: form.maxReservationDaysInAdvance ?? restaurant.maxReservationDaysInAdvance,
        onlineReservationLimitPercent: form.onlineReservationLimitPercent ?? restaurant.onlineReservationLimitPercent,
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
        <Loader2 className="w-8 h-8 text-accent-cyan animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title text-admin-text">Settings</h1>
        <p className="page-subtitle">Restaurant profile and configuration</p>
      </div>

      <div className="card-admin p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-4 h-4 text-accent-cyan" />
          <h2 className="font-semibold text-admin-text">Restaurant Info</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label text-admin-muted">Restaurant name</label>
            <input className="input-admin" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label text-admin-muted">URL slug</label>
            <input className="input-admin bg-admin-card-2 opacity-50 cursor-not-allowed" value={form.slug || ""} disabled />
            <p className="text-xs text-admin-subtle mt-1">menuara.app/{form.slug}/...</p>
          </div>
        </div>

        <div>
          <label className="label text-admin-muted flex items-center gap-1.5">
            <Phone className="w-3 h-3" />Owner mobile
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-admin-subtle text-sm">+91</span>
            <input
              className="input-admin pl-12"
              value={form.phone || ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="98765 43210"
            />
          </div>
        </div>

        <div>
          <label className="label text-admin-muted flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />Address
          </label>
          <textarea
            className="input-admin resize-none"
            rows={2}
            value={form.address || ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="123 MG Road, Koregaon Park, Pune 411001"
          />
        </div>

        <div>
          <label className="label text-admin-muted">Restaurant Logo</label>
          <div className="flex items-center gap-4 mt-2">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-admin-card-2 border border-admin-border-2 flex items-center justify-center flex-shrink-0">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="logo preview"
                  width={80}
                  height={80}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-primary-foreground font-bold text-2xl"
                  style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))" }}
                >
                  {form.name?.charAt(0).toUpperCase() || "M"}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-accent-cyan animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="btn-sm btn-accent cursor-pointer inline-flex items-center gap-1.5">
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
              <p className="text-xs text-admin-subtle">
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

      <div className="card-admin p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <ImageUp className="w-4 h-4 text-accent-cyan" />
          <h2 className="font-semibold text-admin-text">Customer Menu Hero</h2>
        </div>

        <div>
          <label className="label text-admin-muted flex items-center justify-between">
            Hero Banner Image
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-admin-subtle font-medium">Enable</span>
              <div className="relative inline-block w-8 h-4 rounded-full bg-admin-card-2 border border-admin-border-2 transition-colors duration-200 ease-in-out">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={form.heroEnabled ?? true}
                  onChange={(e) => set("heroEnabled", e.target.checked ? "true" : "")}
                  // We simulate boolean with string for generic set() or just update form directly
                />
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-4 h-4 bg-admin-subtle rounded-full transition-transform duration-200 ease-in-out scale-75",
                    (form.heroEnabled ?? true) ? "translate-x-4 bg-accent-cyan" : "translate-x-0"
                  )}
                />
                <input 
                  type="checkbox"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  checked={form.heroEnabled ?? true}
                  onChange={(e) => setForm((p) => ({ ...p, heroEnabled: e.target.checked }))}
                />
              </div>
            </label>
          </label>
          
          <input
            ref={heroFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleHeroFileChange}
          />

          <div className={cn("mt-3 transition-opacity", (form.heroEnabled ?? true) ? "opacity-100" : "opacity-40 pointer-events-none")}>
            <ImageFocusEditor
              src={heroPreviewUrl || 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=1200&auto=format&fit=crop'}
              focusX={form.heroFocusX ?? 0.5}
              focusY={form.heroFocusY ?? 0.5}
              onChange={(x, y) => setForm(p => ({ ...p, heroFocusX: x, heroFocusY: y }))}
              onRemove={heroPreviewUrl ? handleRemoveHero : undefined}
              onChangeImage={() => heroFileInputRef.current?.click()}
              isUploading={uploadingHero}
              aspectRatio="aspect-[4/5]"
              previewType="hero"
            />
          </div>
          {uploadHeroError && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {uploadHeroError}
            </p>
          )}
        </div>
      </div>

      <div className="card-admin p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-accent-cyan" />
          <h2 className="font-semibold text-admin-text">GST Settings</h2>
        </div>

        <div>
          <label className="label text-admin-muted">GST Number</label>
          <input
            className="input-admin font-mono"
            value={form.gstNumber || ""}
            onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
            placeholder="27AAPFU0939F1ZV"
            maxLength={15}
          />
          <p className="text-xs text-admin-subtle mt-1">Appears on all GST invoices</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label text-admin-muted flex items-center gap-1.5">
              <Percent className="w-3 h-3" />CGST Rate
            </label>
            <input
              className="input-admin"
              type="number"
              step="0.5"
              min="0"
              max="14"
              value={form.cgstRate ?? 2.5}
              onChange={(e) => set("cgstRate", parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="label text-admin-muted flex items-center gap-1.5">
              <Percent className="w-3 h-3" />SGST Rate
            </label>
            <input
              className="input-admin"
              type="number"
              step="0.5"
              min="0"
              max="14"
              value={form.sgstRate ?? 2.5}
              onChange={(e) => set("sgstRate", parseFloat(e.target.value))}
            />
          </div>
        </div>
        <div className="bg-accent-cyan/10 border border-accent-cyan/20 rounded-xl p-3">
          <p className="text-xs text-accent-cyan">
            Total GST: {((form.cgstRate || 0) + (form.sgstRate || 0)).toFixed(1)}%
            {" · "}
            On Rs.1,000 bill: CGST Rs.{((form.cgstRate || 0) * 10).toFixed(0)} + SGST Rs.
            {((form.sgstRate || 0) * 10).toFixed(0)} = Rs.
            {(((form.cgstRate || 0) + (form.sgstRate || 0)) * 10).toFixed(0)}
          </p>
        </div>
      </div>

      <div className="card-admin p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-accent-cyan" />
          <h2 className="font-semibold text-admin-text">Menu Language</h2>
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
                  ? "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan"
                  : "border-admin-border-2 text-admin-muted hover:border-accent-cyan/30"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-admin p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-accent-cyan" />
          <h2 className="font-semibold text-admin-text">Reservation Settings</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label text-admin-muted">Max Days in Advance</label>
            <input
              className="input-admin"
              type="number"
              min="1"
              max="365"
              value={form.maxReservationDaysInAdvance ?? 7}
              onChange={(e) => set("maxReservationDaysInAdvance", parseInt(e.target.value))}
            />
            <p className="text-xs text-admin-subtle mt-1">How far ahead customers can book.</p>
          </div>
          <div>
            <label className="label text-admin-muted flex items-center gap-1.5"><Percent className="w-3 h-3" />Online Limit</label>
            <input
              className="input-admin"
              type="number"
              min="10"
              max="100"
              step="5"
              value={form.onlineReservationLimitPercent ?? 70}
              onChange={(e) => set("onlineReservationLimitPercent", parseInt(e.target.value))}
            />
            <p className="text-xs text-admin-subtle mt-1">Percentage of capacity for online.</p>
          </div>
        </div>
      </div>

      <div className="card-admin p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-accent-cyan" />
          <h2 className="font-semibold text-admin-text">Ordering Experience</h2>
        </div>
        <div>
          <label className="label text-admin-muted mb-3 block">Session Mode</label>
          <div className="flex gap-4 flex-col sm:flex-row">
            <button
              onClick={() => set("sessionMode", "open")}
              className={cn(
                "flex-1 text-left p-4 rounded-xl border transition-all relative overflow-hidden",
                form.sessionMode === "open"
                  ? "bg-accent-cyan/10 border-accent-cyan text-admin-text shadow-sm shadow-accent-cyan/20"
                  : "bg-admin-card-2 border-admin-border-2 text-admin-muted hover:border-accent-cyan/50"
              )}
            >
              {form.sessionMode === "open" && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-accent-cyan/10 rotate-45 translate-x-8 -translate-y-8" />
              )}
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                Open Ordering
                {form.sessionMode === "open" && <Check className="w-4 h-4 text-accent-cyan" />}
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
                  ? "bg-accent-cyan/10 border-accent-cyan text-admin-text shadow-sm shadow-accent-cyan/20"
                  : "bg-admin-card-2 border-admin-border-2 text-admin-muted hover:border-accent-cyan/50"
              )}
            >
              {form.sessionMode === "host_approval" && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-accent-cyan/10 rotate-45 translate-x-8 -translate-y-8" />
              )}
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                Host Approval
                {form.sessionMode === "host_approval" && <Check className="w-4 h-4 text-accent-cyan" />}
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

      <button onClick={save} disabled={saving || !restaurant} className={cn("btn-lg w-full", saved ? "bg-emerald-500 text-primary-foreground" : "btn-accent")}>
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
